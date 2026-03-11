const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');
const Payment = require('../models/payment');
const MembershipPrice = require('../models/membershipPrice');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const LUXAND_TOKEN = process.env.LUXAND_TOKEN;

/**
 * Find the subscription period that applies at `now` from subscriptionPeriods.
 * Active only when now is within [periodStart, periodEnd]. Inactive when before first period starts or after last period ends.
 * @param {Array<{ startDate: Date, endDate: Date }>} subscriptionPeriods
 * @param {Date} now
 * @returns {{ periodStart: Date, periodEnd: Date, isActive: boolean } | null} isActive true when now is inside the period
 */
function getCurrentPeriodForDate(subscriptionPeriods, now) {
  if (!Array.isArray(subscriptionPeriods) || subscriptionPeriods.length === 0) return null;
  const sorted = [...subscriptionPeriods]
    .filter((p) => p && (p.startDate != null || p.endDate != null))
    .map((p) => ({
      start: new Date(p.startDate),
      end: p.endDate ? new Date(p.endDate) : null
    }))
    .filter((p) => p.end != null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (sorted.length === 0) return null;
  for (const p of sorted) {
    if (now >= p.start && now <= p.end) return { periodStart: p.start, periodEnd: p.end, isActive: true };
    if (now < p.start) return { periodStart: p.start, periodEnd: p.end, isActive: false }; // not yet started
  }
  const last = sorted[sorted.length - 1];
  return { periodStart: last.start, periodEnd: last.end, isActive: false }; // past all periods
}

// Multer setup for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.single('image');

// Test Luxand connectivity
exports.testLuxand = async (req, res) => {
  try {
    if (!LUXAND_TOKEN) {
      return res.status(400).json({ 
        error: "LUXAND_TOKEN not configured",
        message: "Please add LUXAND_TOKEN to your .env file"
      });
    }

    // Test with a simple API call
    const response = await axios.get("https://api.luxand.cloud/v2/person", {
      headers: {
        token: LUXAND_TOKEN
      }
    });

    res.json({
      success: true,
      message: "Luxand API connection successful",
      tokenStatus: "Valid",
      response: response.data
    });
  } catch (error) {
    console.error("Luxand test error:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Luxand authentication failed",
        message: "Your LUXAND_TOKEN is invalid or expired. Please check your Luxand account and update the token.",
        status: error.response.status,
        details: error.response.data
      });
    }

    res.status(500).json({
      error: "Luxand connection failed",
      message: error.message,
      status: error.response?.status,
      details: error.response?.data
    });
  }
};

exports.create = async (req, res) => {
  const { firstName, lastName, role, branchId, email, ...rest } = req.body;

  // Check authorization - only gym_owner and manager roles
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const allowedRoles = ['gym_owner', 'manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied. Only gym_owner or manager can create members." });
  }

  // For managers, ensure they can only create members in their branch
  if (req.user.role === 'manager') {
    console.log('Manager validation:', {
      userBranchId: req.user.branchId,
      requestBranchId: branchId,
      match: req.user.branchId && req.user.branchId.toString() === branchId
    });
    if (req.user.branchId && req.user.branchId.toString() !== branchId) {
      return res.status(403).json({ error: `Access denied. You can only create members in branch ${req.user.branchId}, but requested branch is ${branchId}.` });
    }
  }

  // For gym_owners, ensure they can only create members in their gym
  if (req.user.role === 'gym_owner' && req.user.gymId) {
    try {
      const Branch = require('../models/branch');
      const branch = await Branch.findById(branchId);
      console.log('Gym owner validation:', {
        branchId,
        branch: branch ? { id: branch._id, gymId: branch.gymId, name: branch.name } : null,
        userGymId: req.user.gymId
      });
      if (!branch) {
        return res.status(404).json({ error: `Branch with ID ${branchId} not found.` });
      }
      if (branch.gymId !== req.user.gymId) {
        return res.status(403).json({ error: `Access denied. Branch belongs to gym ${branch.gymId}, but you belong to gym ${req.user.gymId}.` });
      }
    } catch (error) {
      console.error('Branch validation error:', error);
      return res.status(500).json({ error: "Error validating branch access." });
    }
  }

  if (!branchId) return res.status(400).json({ error: "branchId is required" });
  if (!firstName || !lastName || !role)
    return res.status(400).json({ error: "First name, last name, and role are required" });
  
  // Validate role - only member and trainer are allowed in member model
  if (!['member', 'trainer'].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Only 'member' or 'trainer' roles are allowed for members." });
  }

  try {
    let personId = null;
    
    // Try to register with Luxand face recognition (optional)
    if (LUXAND_TOKEN && req.file) {
      try {
        console.log("Attempting to register face with Luxand...");
        console.log("Luxand Token:", LUXAND_TOKEN ? "Present" : "Missing");
        
        const formData = new FormData();
        formData.append("photos", req.file.buffer, { filename: req.file.originalname });
        formData.append("name", `${firstName} ${lastName}`);
        formData.append("store", "1");
        formData.append("collections", "");
        formData.append("unique", "0");

        const headers = {
          token: LUXAND_TOKEN,
          ...formData.getHeaders(),
        };

        console.log("Sending request to Luxand API...");
        const response = await axios.post("https://api.luxand.cloud/v2/person", formData, { headers });
        personId = response.data.uuid;
        
        console.log("Luxand response status:", response.status);
        console.log("Luxand response data:", response.data);
        
        if (!personId) {
          console.warn("Luxand registration failed - no personId returned");
        } else {
          console.log("Successfully registered face with Luxand, personId:", personId);
        }
      } catch (luxandError) {
        console.error("Luxand registration error:", {
          status: luxandError.response?.status,
          statusText: luxandError.response?.statusText,
          data: luxandError.response?.data,
          message: luxandError.message
        });
        
        if (luxandError.response?.status === 401) {
          console.error("LUXAND_TOKEN is invalid or expired. Please check your .env file.");
        }
        
        console.warn("Continuing member creation without face recognition");
        // Continue without face recognition rather than failing
      }
    } else {
      if (!LUXAND_TOKEN) {
        console.warn("LUXAND_TOKEN not configured in environment variables");
      }
      if (!req.file) {
        console.warn("No image provided, skipping face recognition");
      }
    }

    // Get gymId from user context
    const gymId = req.user.gymId || req.user.branchId; // For legacy users, branchId might be used as gymId

    // Calculate age from dateOfBirth if provided (FormData may send as string YYYY-MM-DD)
    let profile = rest.profile || {};
    if (req.body.dateOfBirth) {
      const dob = new Date(req.body.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        profile = { ...profile, dateOfBirth: dob, age: Math.max(0, age) };
      }
    }
    if (Object.keys(profile).length > 0) rest.profile = profile;
    delete rest.dateOfBirth; // only store in profile

    const member = new Member({
      branchId,
      gymId, // Add gymId to member creation
      firstName,
      lastName,
      email: email ? email.toLowerCase() : undefined,
      role,
      image: req.file ? req.file.buffer.toString('base64') : undefined, // optional: store image as base64
      personId,
      ...rest,
    });

    const savedMember = await member.save();

    res.status(201).json({
      message: personId ? "Member created and face indexed successfully" : "Member created successfully",
      member: savedMember,
      faceRecognition: personId ? "enabled" : "disabled"
    });

 } catch (error) {
  console.error("Error creating member:", error.message);
  res.status(500).json({ error: error.message || "Server error during member creation" });
}

};






exports.getAll = async (req, res) => {
  try {
    // Check authorization - only gym_owner, manager, and staff roles
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner, manager, or staff can view members." });
    }

    let filter = {};

    if (req.user.role === 'manager' || req.user.role === 'staff') {
      // Managers and staff can only see members from their own branch
      filter.branchId = req.user.branchId;
    } else if (req.user.role === 'gym_owner') {
      // Gym owners can view members from all branches of their gym
      if (req.query.branchId) {
        // Validate that the branch belongs to their gym
        const Branch = require('../models/branch');
        const branch = await Branch.findById(req.query.branchId);
        if (!branch || branch.gymId !== req.user.gymId) {
          return res.status(403).json({ error: "Access denied. Cannot view members from branches outside your gym." });
        }
        filter.branchId = req.query.branchId;
      } else {
        // If no specific branch requested, show all members from their gym
        filter.gymId = req.user.gymId;
      }
    }

    // Status filter: allMembers | activeUsers | inactiveUsers | longTimeInactiveUsers (status stored in DB)
    let statusFilter = req.query.status || 'allMembers';
    if (statusFilter === 'recentlyExpired') statusFilter = 'inactiveUsers';
    if (statusFilter === 'archivedUsers') statusFilter = 'longTimeInactiveUsers';

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    if (statusFilter === 'allMembers' || statusFilter === 'all') {
      // No status filter: return all members (filtered by gym/branch only)
    } else if (statusFilter === 'activeUsers') {
      filter.status = { $nin: ['inactive', 'long term inactive'] };
      filter.$or = [
        { 'membership.endDate': null },
        { 'membership.endDate': { $gt: now } },
      ];
    } else if (statusFilter === 'inactiveUsers') {
      // Recently expired (1–90 days) or already status 'inactive'
      filter.$or = [
        { status: 'inactive' },
        { 'membership.endDate': { $gte: ninetyDaysAgo, $lte: now } },
      ];
    } else if (statusFilter === 'longTimeInactiveUsers') {
      // Expired >90 days ago or already status 'long term inactive'
      filter.$or = [
        { status: 'long term inactive' },
        { 'membership.endDate': { $lt: ninetyDaysAgo } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [total, members] = await Promise.all([
      Member.countDocuments(filter),
      Member.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const memberIds = members.map((m) => m._id);
    const personalDetailsList = await Details.find({ memberId: { $in: memberIds } }).lean();
    const detailsByMemberId = {};
    for (const d of personalDetailsList) {
      detailsByMemberId[d.memberId] = d;
    }

    // Latest payment per member for billing display
    const latestPayments = await Payment.aggregate([
      { $match: { memberId: { $in: memberIds } } },
      { $sort: { paidAt: -1 } },
      { $group: { _id: '$memberId', doc: { $first: '$$ROOT' } } },
    ]);
    const paymentByMemberId = {};
    for (const p of latestPayments) {
      paymentByMemberId[p._id] = p.doc;
    }

    for (const m of members) {
      let details = detailsByMemberId[m._id];
      if (details) {
        if (!m.profile) m.profile = {};
        if (details.phoneNumber) m.profile.phone = details.phoneNumber;
        if (!m.membership) m.membership = {};
        if (details.membership) m.membership.type = details.membership;

        const periodInfo = Array.isArray(details.subscriptionPeriods) && details.subscriptionPeriods.length > 0
          ? getCurrentPeriodForDate(details.subscriptionPeriods, now)
          : null;

        if (periodInfo) {
          // Active only when now is within [periodStart, periodEnd]. Inactive before first period starts or after last period ends.
          m.membership.startDate = periodInfo.periodStart;
          m.membership.endDate = periodInfo.periodEnd;
          m.membership.isActive = periodInfo.isActive;
          const suspended = String(m.status) === 'suspended';
          if (periodInfo.isActive) {
            m.status = suspended ? 'suspended' : 'active';
          } else {
            if (now > periodInfo.periodEnd) {
              m.status = periodInfo.periodEnd < ninetyDaysAgo ? 'long term inactive' : 'inactive';
            } else {
              m.status = 'inactive'; // not yet started (now < periodStart)
            }
          }
          await Details.findOneAndUpdate(
            { memberId: m._id },
            { membership_start_date: periodInfo.periodStart, membership_end_date: periodInfo.periodEnd }
          );
          await Member.findByIdAndUpdate(m._id, {
            'membership.type': details.membership || m.membership?.type,
            'membership.startDate': periodInfo.periodStart,
            'membership.endDate': periodInfo.periodEnd,
            'membership.isActive': m.membership.isActive,
            status: m.status
          });
        } else {
          // No subscription periods: use membership_start_date / membership_end_date as before
          if (details.membership_start_date != null) m.membership.startDate = details.membership_start_date;
          if (details.membership_end_date != null) m.membership.endDate = details.membership_end_date;
          const effectiveEndRaw = details.membership_end_date ?? m.membership?.endDate;
          const effectiveEnd = effectiveEndRaw ? new Date(effectiveEndRaw) : null;
          const isExpired = effectiveEnd && effectiveEnd < now;
          const newStatus = isExpired
            ? (effectiveEnd < ninetyDaysAgo ? 'long term inactive' : 'inactive')
            : (String(m.status) === 'suspended' ? 'suspended' : 'active');
          m.membership.isActive = !isExpired;
          m.status = newStatus;
          await Member.findByIdAndUpdate(m._id, {
            'membership.type': details.membership || m.membership?.type,
            'membership.startDate': details.membership_start_date ?? m.membership?.startDate,
            'membership.endDate': details.membership_end_date ?? m.membership?.endDate,
            'membership.isActive': !isExpired,
            status: newStatus
          });
        }
      }
      // When no details: if effective end date has expired, set status in DB and on object
      const effectiveEndRaw = details?.membership_end_date ?? m.membership?.endDate;
      const effectiveEnd = effectiveEndRaw ? new Date(effectiveEndRaw) : null;
      if (!details && effectiveEnd && effectiveEnd < now && String(m.status) !== 'inactive' && String(m.status) !== 'long term inactive') {
        const newStatus = effectiveEnd < ninetyDaysAgo ? 'long term inactive' : 'inactive';
        await Member.findByIdAndUpdate(m._id, {
          'membership.isActive': false,
          status: newStatus
        });
        m.status = newStatus;
        if (m.membership) m.membership.isActive = false;
      }
      const payment = paymentByMemberId[m._id];
      const totalAmount = details && (details.totalAmount != null) ? Number(details.totalAmount) : 0;
      const paidAmount = details && (details.paidAmount != null) ? Number(details.paidAmount) : 0;
      const pendingBalance = Math.max(0, totalAmount - paidAmount);

      if (pendingBalance > 0) {
        m.billingAmount = String(pendingBalance);
        m.billingDate = payment && payment.paidAt ? (payment.paidAt instanceof Date ? payment.paidAt.toISOString() : payment.paidAt) : '';
        m.billingStatus = 'pending';
      } else if (payment) {
        m.billingAmount = payment.paidAmount != null ? String(payment.paidAmount) : '';
        m.billingDate = payment.paidAt ? (payment.paidAt instanceof Date ? payment.paidAt.toISOString() : payment.paidAt) : '';
        m.billingStatus = 'paid';
      } else {
        m.billingAmount = '';
        m.billingDate = '';
        m.billingStatus = 'pending';
      }
    }

    res.json({ list: members, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    // Check authorization - only gym_owner and manager roles
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can view members." });
    }

    let member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }

    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const details = await Details.findOne({ memberId: member._id }).lean();
    if (details) {
      if (!member.membership) member.membership = {};
      if (details.membership) member.membership.type = details.membership;

      const periodInfo = Array.isArray(details.subscriptionPeriods) && details.subscriptionPeriods.length > 0
        ? getCurrentPeriodForDate(details.subscriptionPeriods, now)
        : null;

      if (periodInfo) {
        member.membership.startDate = periodInfo.periodStart;
        member.membership.endDate = periodInfo.periodEnd;
        member.membership.isActive = periodInfo.isActive;
        if (periodInfo.isActive) {
          member.status = String(member.status) === 'suspended' ? 'suspended' : 'active';
        } else {
          member.status = now > periodInfo.periodEnd
            ? (periodInfo.periodEnd < ninetyDaysAgo ? 'long term inactive' : 'inactive')
            : 'inactive';
        }
        await Details.findOneAndUpdate(
          { memberId: member._id },
          { membership_start_date: periodInfo.periodStart, membership_end_date: periodInfo.periodEnd }
        );
        await Member.findByIdAndUpdate(member._id, {
          'membership.type': details.membership || member.membership?.type,
          'membership.startDate': periodInfo.periodStart,
          'membership.endDate': periodInfo.periodEnd,
          'membership.isActive': member.membership.isActive,
          status: member.status
        });
      } else {
        if (details.membership_start_date != null) member.membership.startDate = details.membership_start_date;
        if (details.membership_end_date != null) member.membership.endDate = details.membership_end_date;
        const effectiveEndRaw = details.membership_end_date ?? member.membership?.endDate;
        const effectiveEnd = effectiveEndRaw ? new Date(effectiveEndRaw) : null;
        const isExpired = effectiveEnd && effectiveEnd < now;
        const newStatus = isExpired
          ? (effectiveEnd < ninetyDaysAgo ? 'long term inactive' : 'inactive')
          : (String(member.status) === 'suspended' ? 'suspended' : 'active');
        member.membership.isActive = !isExpired;
        member.status = newStatus;
        await Member.findByIdAndUpdate(member._id, {
          'membership.type': details.membership || member.membership?.type,
          'membership.startDate': details.membership_start_date ?? member.membership?.startDate,
          'membership.endDate': details.membership_end_date ?? member.membership?.endDate,
          'membership.isActive': !isExpired,
          status: newStatus
        });
      }
    }

    res.json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Check authorization - only gym_owner and manager roles
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can update members." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this member' });
    }

    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this member' });
    }

    // Additional validation for managers
    if (req.user.role === 'manager' && req.body.branchId && req.body.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Cannot change branch of member outside your branch' });
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.patch = async (req, res) => {
  try {
    // Check authorization - only gym_owner and manager roles
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can update members." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this member' });
    }

    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this member' });
    }

    // Additional validation for managers - prevent changing branch
    if (req.user.role === 'manager' && req.body.branchId && req.body.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Cannot change branch of member outside your branch' });
    }

    // Map top-level fields to profile where the schema expects them
    const profileKeys = ['phone', 'age', 'gender', 'dateOfBirth', 'address'];
    const updateData = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key.startsWith('profile.')) {
        const profileField = key.split('.')[1];
        if (!updateData['profile']) updateData['profile'] = {};
        updateData['profile'][profileField] = value;
      } else if (profileKeys.includes(key)) {
        if (!updateData['profile']) updateData['profile'] = {};
        updateData['profile'][key] = value;
      } else {
        updateData[key] = value;
      }
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateProfileImage = async (req, res) => {
  try {
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }
    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const imageBase64 = req.file.buffer.toString('base64');
    const updated = await Member.findByIdAndUpdate(
      req.params.id,
      { image: imageBase64 },
      { new: true }
    ).lean();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // Check authorization - only gym_owner, manager and staff can delete members
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner, manager and staff can delete members. Managers cannot delete members." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions - gym_owner can only delete members from their gym
    if (member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to delete this member' });
    }

    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Renew membership for a member (expired or active): new plan/period, payment, update Details + Member
exports.renew = async (req, res) => {
  try {
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Only gym_owner or manager can renew memberships.' });
    }

    const memberId = req.params.id;
    const { membership, planQuantity, paidAmount, membershipStartDate: startDateBody } = req.body;

    const membershipTrimmed = membership ? String(membership).trim() : '';
    if (!membershipTrimmed) {
      return res.status(400).json({ error: 'Membership type is required' });
    }

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }
    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }

    const typeRegex = new RegExp(`^\\s*${membershipTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    let priceDoc = member.gymId
      ? await MembershipPrice.findOne({ type: { $regex: typeRegex }, gymId: member.gymId, isActive: { $ne: false } })
      : null;
    if (!priceDoc) priceDoc = await MembershipPrice.findOne({ type: { $regex: typeRegex } });
    if (!priceDoc) {
      return res.status(400).json({ error: `Membership type '${membershipTrimmed}' not found` });
    }

    const quantity = Math.max(1, parseInt(planQuantity, 10) || 1);
    const durationDays = priceDoc.duration || 30;
    let periodStart;
    if (startDateBody) {
      periodStart = new Date(startDateBody);
      if (!Number.isNaN(periodStart.getTime())) {
        periodStart.setHours(0, 0, 0, 0);
      } else {
        periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
      }
    } else {
      periodStart = new Date();
      periodStart.setHours(0, 0, 0, 0);
    }
    const subscriptionPeriods = [];
    let membershipStartDate = null;
    let membershipEndDate = null;
    for (let i = 0; i < quantity; i++) {
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + durationDays);
      subscriptionPeriods.push({ startDate: new Date(periodStart), endDate: new Date(periodEnd) });
      if (i === 0) {
        membershipStartDate = new Date(periodStart);
        membershipEndDate = new Date(periodEnd);
      }
      periodStart = new Date(periodEnd);
    }

    const newTotal = priceDoc.price * quantity;
    const paid = Math.max(0, Number(paidAmount) || 0);

    if (paid > newTotal) {
      return res.status(400).json({
        error: 'Amount exceeds maximum for selected plan',
        message: `Paid amount (₹${paid}) cannot exceed the maximum for this plan (₹${newTotal}).`,
        maxAmount: newTotal
      });
    }

    let details = await Details.findOne({ memberId });
    if (!details) {
      details = new Details({
        memberId,
        membership: membershipTrimmed,
        branchId: member.branchId,
        totalAmount: newTotal,
        paidAmount: paid,
        membership_start_date: membershipStartDate,
        membership_end_date: membershipEndDate,
        planQuantity: quantity,
        subscriptionPeriods,
      });
      await details.save();
    } else {
      details.membership = membershipTrimmed;
      details.membership_start_date = membershipStartDate;
      details.membership_end_date = membershipEndDate;
      details.subscriptionPeriods = subscriptionPeriods;
      details.planQuantity = quantity;
      details.totalAmount = (details.totalAmount || 0) + newTotal;
      details.paidAmount = (details.paidAmount || 0) + paid;
      await details.save();
    }

    if (paid > 0 && member.branchId) {
      try {
        const payment = new Payment({
          memberId: String(memberId),
          branchId: String(member.branchId),
          name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member',
          detailsId: String(details._id),
          membership: membershipTrimmed,
          totalAmount: newTotal,
          paidAmount: paid,
        });
        await payment.save();
      } catch (paymentErr) {
        console.error('Failed to create renewal payment record:', paymentErr);
      }
    }

    // If start date is in the future (e.g. 2 days later), member is inactive until that date
    const now = new Date();
    const periodHasStarted = membershipStartDate && membershipStartDate <= now;
    await Member.findByIdAndUpdate(memberId, {
      'membership.type': membershipTrimmed,
      'membership.startDate': membershipStartDate,
      'membership.endDate': membershipEndDate,
      'membership.isActive': !!periodHasStarted,
      status: periodHasStarted ? 'active' : 'inactive',
    });

    res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      data: {
        membership: membershipTrimmed,
        membershipEndDate,
        paidAmount: paid,
      },
    });
  } catch (err) {
    console.error('Renew error:', err);
    res.status(400).json({ error: err.message || 'Failed to renew membership' });
  }
};

// Check and update expired memberships
exports.checkExpiredMemberships = async (req, res) => {
  try {
    // Check authorization - only gym_owner or owner can trigger this
    const allowedRoles = ['gym_owner'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner can check expired memberships." });
    }

    const result = await Member.checkAndUpdateExpiredMemberships();
    res.json(result);
  } catch (err) {
    console.error('Error checking expired memberships:', err);
    res.status(500).json({ error: err.message });
  }
};
