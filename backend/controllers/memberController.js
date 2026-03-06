const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');
const Payment = require('../models/payment');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const LUXAND_TOKEN = process.env.LUXAND_TOKEN;

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

  // Check authorization - only gym_owner and manager roles (no admin access to gym internal activities)
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const allowedRoles = ['gym_owner', 'manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied. Only gym_owner or manager can create members. Admin cannot access gym internal activities." });
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
    // Check authorization - only gym_owner and manager roles
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can view members. Admin cannot access gym internal activities." });
    }

    let filter = {};

    if (req.user.role === 'manager') {
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

    // Status filter: activeUsers | recentlyExpired | archivedUsers
    const statusFilter = req.query.status || 'activeUsers';
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (statusFilter === 'activeUsers') {
      filter.$or = [
        { 'membership.endDate': null },
        { 'membership.endDate': { $gt: now } },
      ];
      filter.status = { $nin: ['inactive'] };
    } else if (statusFilter === 'recentlyExpired') {
      filter['membership.endDate'] = { $gte: sevenDaysAgo, $lte: now };
    } else if (statusFilter === 'archivedUsers') {
      filter.$or = [
        { 'membership.endDate': { $lt: sevenDaysAgo } },
        { status: 'inactive' },
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
        if (Array.isArray(details.subscriptionPeriods) && details.subscriptionPeriods.length > 0) {
          const currentEnd = details.membership_end_date ? new Date(details.membership_end_date) : null;
          if (currentEnd && currentEnd < now) {
            const nextPeriod = details.subscriptionPeriods.find(
              (p) => p.endDate && new Date(p.endDate) > now
            );
            if (nextPeriod) {
              const nextStart = new Date(nextPeriod.startDate);
              const nextEnd = new Date(nextPeriod.endDate);
              await Details.findOneAndUpdate(
                { memberId: m._id },
                { membership_start_date: nextStart, membership_end_date: nextEnd }
              );
              await Member.findByIdAndUpdate(m._id, {
                'membership.startDate': nextStart,
                'membership.endDate': nextEnd,
                'membership.isActive': true,
                status: 'active'
              });
              if (!m.membership) m.membership = {};
              m.membership.startDate = nextStart;
              m.membership.endDate = nextEnd;
              m.membership.isActive = true;
              details = { ...details, membership_start_date: nextStart, membership_end_date: nextEnd };
            }
          }
        }
      }
      const payment = paymentByMemberId[m._id];
      if (payment) {
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
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can view members. Admin cannot access gym internal activities." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }

    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
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
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can update members. Admin cannot access gym internal activities." });
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
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can update members. Admin cannot access gym internal activities." });
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

exports.remove = async (req, res) => {
  try {
    // Check authorization - only gym_owner can delete members (managers cannot delete)
    const allowedRoles = ['gym_owner'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner can delete members. Managers and admin cannot delete members." });
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

// Check and update expired memberships
exports.checkExpiredMemberships = async (req, res) => {
  try {
    // Check authorization - only gym_owner and admin can trigger this
    const allowedRoles = ['gym_owner', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner and admin can check expired memberships." });
    }

    const result = await Member.checkAndUpdateExpiredMemberships();
    res.json(result);
  } catch (err) {
    console.error('Error checking expired memberships:', err);
    res.status(500).json({ error: err.message });
  }
};
