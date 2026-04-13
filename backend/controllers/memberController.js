const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');
const Payment = require('../models/payment');
const MembershipPrice = require('../models/membershipPrice');
const User = require('../models/user');
const Branch = require('../models/branch');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const mongoose = require('mongoose');

const LUXAND_TOKEN = process.env.LUXAND_TOKEN;
const { normalizeIndianMobile } = require('../utils/indianPhone');

function toId(value) {
  return value == null ? null : String(value);
}

async function resolveScopeUser(req) {
  const dbUser = req.currentUser || (req.user?.id ? await User.findById(req.user.id).select('id role gymId branchId').lean() : null);
  const source = dbUser || req.user || {};
  return {
    id: toId(source.id || source._id),
    role: String(source.role || ''),
    gymId: toId(source.gymId),
    branchId: toId(source.branchId),
  };
}

function ensureRoleAllowed(scopeUser, allowedRoles) {
  return allowedRoles.includes(scopeUser.role);
}

function canAccessMember(scopeUser, memberDoc) {
  const memberGymId = toId(memberDoc?.gymId);
  const memberBranchId = toId(memberDoc?.branchId);
  if (scopeUser.role === 'gym_owner') {
    return !!scopeUser.gymId && scopeUser.gymId === memberGymId;
  }
  if (scopeUser.role === 'manager' || scopeUser.role === 'staff') {
    return !!scopeUser.gymId && !!scopeUser.branchId && scopeUser.gymId === memberGymId && scopeUser.branchId === memberBranchId;
  }
  return false;
}

function isTransactionUnsupported(err) {
  const msg = String(err?.message || '');
  return msg.includes('Transaction numbers are only allowed on a replica set member or mongos');
}

// Multer setup for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    return cb(null, true);
  },
});
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
  const { firstName, lastName, role, branchId, email, phone, ...rest } = req.body;

  // Check authorization - only gym_owner and manager roles
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const allowedRoles = ['gym_owner', 'manager', 'staff'];
  const scopeUser = await resolveScopeUser(req);
  if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
    return res.status(403).json({ error: "Access denied. Only gym_owner, staff or manager can create members." });
  }

  // For managers, ensure they can only create members in their branch
  if (scopeUser.role === 'manager') {
    console.log('Manager validation:', {
      userBranchId: scopeUser.branchId,
      requestBranchId: branchId,
      match: scopeUser.branchId && toId(scopeUser.branchId) === toId(branchId)
    });
    if (!scopeUser.branchId || toId(scopeUser.branchId) !== toId(branchId)) {
      return res.status(403).json({ error: `Access denied. You can only create members in your own branch.` });
    }
  }

  // For gym_owners, ensure they can only create members in their gym
  if (scopeUser.role === 'gym_owner') {
    try {
      const branch = await Branch.findById(branchId);
      console.log('Gym owner validation:', {
        branchId,
        branch: branch ? { id: branch._id, gymId: branch.gymId, name: branch.name } : null,
        userGymId: scopeUser.gymId
      });
      if (!branch) {
        return res.status(404).json({ error: `Branch with ID ${branchId} not found.` });
      }
      if (toId(branch.gymId) !== toId(scopeUser.gymId)) {
        return res.status(403).json({ error: `Access denied. Branch belongs to another gym.` });
      }
    } catch (error) {
      console.error('Branch validation error:', error);
      return res.status(500).json({ error: "Error validating branch access." });
    }
  }

  if (!branchId) return res.status(400).json({ error: "branchId is required" });
  if (!firstName || !lastName || !role)
    return res.status(400).json({ error: "First name, last name, and role are required" });

  const normalizedPhone = normalizeIndianMobile(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Valid 10-digit Indian mobile number is required' });
  }
  
  // Validate role - only member and trainer are allowed in member model
  if (!['member', 'trainer'].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Only 'member' or 'trainer' roles are allowed for members." });
  }

  try {
    // Pre-enrolled face from add-member flow (biometric-first): use provided personId
    const facePersonId = req.body.facePersonId ? String(req.body.facePersonId).trim() : null;
    const fingerprintRegistered = req.body.fingerprintRegistered === true || req.body.fingerprintRegistered === 'true';

    let personId = facePersonId;
    
    // If no pre-enrolled personId, try to register with Luxand from uploaded image (optional)
    if (!personId && LUXAND_TOKEN && req.file) {
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
    const branchDoc = await Branch.findById(branchId).select('_id gymId').lean();
    if (!branchDoc) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    const gymId = toId(branchDoc.gymId);
    if (!gymId) {
      return res.status(400).json({ error: 'Invalid branch gym mapping' });
    }
    if (scopeUser.gymId && toId(scopeUser.gymId) !== gymId) {
      return res.status(403).json({ error: 'Access denied. Branch belongs to another gym.' });
    }

    // Calculate age from dateOfBirth if provided (FormData may send as string YYYY-MM-DD)
    let profile = rest.profile || {};
    if (typeof profile === 'string') {
      try {
        profile = JSON.parse(profile);
      } catch {
        profile = {};
      }
    }
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
    profile = { ...profile, phone: normalizedPhone };
    rest.profile = profile;
    delete rest.dateOfBirth; // only store in profile

    const member = new Member({
      branchId,
      gymId,
      firstName,
      lastName,
      email: email ? String(email).toLowerCase().trim() : undefined,
      role,
      image: req.file ? req.file.buffer.toString('base64') : undefined,
      personId: personId || undefined,
      hasFingerprint: !!fingerprintRegistered,
      authMethods: {
        faceRecognition: !!personId,
        fingerprint: !!fingerprintRegistered,
      },
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

    // Resolve current tenant scope from DB first (more reliable than stale JWT payload).
    const effectiveUser = await resolveScopeUser(req);
    const effectiveRole = effectiveUser.role;
    const effectiveGymId = effectiveUser.gymId;
    const effectiveBranchId = effectiveUser.branchId;

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner, manager, or staff can view members." });
    }

    if (effectiveRole === 'manager' || effectiveRole === 'staff') {
      // Managers and staff can only see members from their own branch
      if (!effectiveBranchId || !effectiveGymId) {
        return res.status(403).json({
          error: 'Access denied. Missing branch or gym scope for this account.',
        });
      }
      filter.gymId = effectiveGymId;
      filter.branchId = effectiveBranchId;
    } else if (effectiveRole === 'gym_owner') {
      // Gym owners can view members from all branches of their gym
      if (!effectiveGymId) {
        return res.status(403).json({
          error: 'Access denied. Missing gym scope for this account.',
        });
      }
      filter.gymId = effectiveGymId;
      if (req.query.branchId) {
        // Validate that the branch belongs to their gym
        const branch = await Branch.findById(req.query.branchId);
        if (!branch || String(branch.gymId) !== String(effectiveGymId)) {
          return res.status(403).json({ error: "Access denied. Cannot view members from branches outside your gym." });
        }
        filter.branchId = req.query.branchId;
      }
    }

    // Status filter: allMembers | activeUsers | inactiveUsers | longTimeInactiveUsers (status stored in DB)
    let statusFilter = req.query.status || 'allMembers';
    if (statusFilter === 'recentlyExpired') statusFilter = 'inactiveUsers';
    if (statusFilter === 'archivedUsers') statusFilter = 'longTimeInactiveUsers';

    if (statusFilter === 'allMembers' || statusFilter === 'all') {
      // No status filter: return all members (filtered by gym/branch only)
    } else if (statusFilter === 'activeUsers') {
      filter.status = 'active';
      filter['membership.isActive'] = true;
    } else if (statusFilter === 'inactiveUsers') {
      filter.status = 'inactive';
    } else if (statusFilter === 'longTimeInactiveUsers') {
      filter.status = 'long term inactive';
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
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    const scopeUser = await resolveScopeUser(req);
    if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can view members." });
    }

    let member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (!canAccessMember(scopeUser, member)) {
      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
    }

    const details = await Details.findOne({ memberId: member._id }).lean();
    if (details) {
      if (!member.profile) member.profile = {};
      if (details.phoneNumber) member.profile.phone = details.phoneNumber;
    }

    res.json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Check authorization - only gym_owner and manager roles
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    const scopeUser = await resolveScopeUser(req);
    if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can update members." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (!canAccessMember(scopeUser, member)) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this member' });
    }

    // Additional validation for managers
    if ((scopeUser.role === 'manager' || scopeUser.role === 'staff') && req.body.branchId && toId(req.body.branchId) !== scopeUser.branchId) {
      return res.status(403).json({ error: 'Cannot change branch of member outside your branch' });
    }

    const updated = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.patch = async (req, res) => {
  try {
    // Check authorization - only gym_owner and manager roles
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    const scopeUser = await resolveScopeUser(req);
    if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can update members." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions
    if (!canAccessMember(scopeUser, member)) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this member' });
    }

    // Additional validation for managers - prevent changing branch
    if ((scopeUser.role === 'manager' || scopeUser.role === 'staff') && req.body.branchId && toId(req.body.branchId) !== scopeUser.branchId) {
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
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateProfileImage = async (req, res) => {
  try {
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    const scopeUser = await resolveScopeUser(req);
    if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
      return res.status(403).json({ error: "Access denied." });
    }
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!canAccessMember(scopeUser, member)) {
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
    const scopeUser = await resolveScopeUser(req);
    if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner, manager and staff can delete members. Managers cannot delete members." });
    }

    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check access permissions - gym_owner can only delete members from their gym
    if (!canAccessMember(scopeUser, member)) {
      return res.status(403).json({ error: 'Access denied: Not authorized to delete this member' });
    }

    await Promise.all([
      Member.findByIdAndDelete(req.params.id),
      Details.findOneAndDelete({ memberId: req.params.id }),
    ]);
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Renew membership for a member (expired or active): new plan/period, payment, update Details + Member
exports.renew = async (req, res) => {
  try {
    const allowedRoles = ['gym_owner', 'manager'];
    const scopeUser = await resolveScopeUser(req);
    if (!ensureRoleAllowed(scopeUser, allowedRoles)) {
      return res.status(403).json({ error: 'Access denied. Only gym_owner or manager can renew memberships.' });
    }

    const memberId = req.params.id;
    const { membership, paidAmount, membershipStartDate: startDateBody } = req.body;

    const membershipTrimmed = membership ? String(membership).trim() : '';
    if (!membershipTrimmed) {
      return res.status(400).json({ error: 'Membership type is required' });
    }

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    if (!canAccessMember(scopeUser, member)) {
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

    const durationDays = priceDoc.duration || 30;
    let membershipStartDate;
    if (startDateBody) {
      membershipStartDate = new Date(startDateBody);
      if (!Number.isNaN(membershipStartDate.getTime())) {
        membershipStartDate.setHours(0, 0, 0, 0);
      } else {
        membershipStartDate = new Date();
        membershipStartDate.setHours(0, 0, 0, 0);
      }
    } else {
      membershipStartDate = new Date();
      membershipStartDate.setHours(0, 0, 0, 0);
    }
    const membershipEndDate = new Date(membershipStartDate);
    membershipEndDate.setDate(membershipEndDate.getDate() + durationDays);

    const newTotal = priceDoc.price;
    const paid = Math.max(0, Number(paidAmount) || 0);

    if (paid > newTotal) {
      return res.status(400).json({
        error: 'Amount exceeds maximum for selected plan',
        message: `Paid amount (₹${paid}) cannot exceed the maximum for this plan (₹${newTotal}).`,
        maxAmount: newTotal
      });
    }

    const applyRenewalWithoutSession = async () => {
      details = await Details.findOne({ memberId });
      if (!details) {
        details = new Details({
          memberId,
          branchId: member.branchId,
          totalAmount: newTotal,
          paidAmount: paid,
        });
        await details.save();
      } else {
        details.totalAmount = (details.totalAmount || 0) + newTotal;
        details.paidAmount = (details.paidAmount || 0) + paid;
        await details.save();
      }

      if (paid > 0 && member.branchId) {
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
      }

      const now = new Date();
      const periodHasStarted = membershipStartDate <= now;
      await Member.findByIdAndUpdate(memberId, {
        'membership.type': membershipTrimmed,
        'membership.startDate': membershipStartDate,
        'membership.endDate': membershipEndDate,
        'membership.isActive': !!periodHasStarted,
        status: periodHasStarted ? 'active' : 'inactive',
      });
    };

    let details;
    const canUseTransactions = mongoose.connection && mongoose.connection.readyState === 1;
    if (canUseTransactions) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          details = await Details.findOne({ memberId }).session(session);
          if (!details) {
            details = new Details({
              memberId,
              branchId: member.branchId,
              totalAmount: newTotal,
              paidAmount: paid,
            });
            await details.save({ session });
          } else {
            details.totalAmount = (details.totalAmount || 0) + newTotal;
            details.paidAmount = (details.paidAmount || 0) + paid;
            await details.save({ session });
          }

          if (paid > 0 && member.branchId) {
            const payment = new Payment({
              memberId: String(memberId),
              branchId: String(member.branchId),
              name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member',
              detailsId: String(details._id),
              membership: membershipTrimmed,
              totalAmount: newTotal,
              paidAmount: paid,
            });
            await payment.save({ session });
          }

          // If start date is in the future (e.g. 2 days later), member is inactive until that date
          const now = new Date();
          const periodHasStarted = membershipStartDate <= now;
          await Member.findByIdAndUpdate(memberId, {
            'membership.type': membershipTrimmed,
            'membership.startDate': membershipStartDate,
            'membership.endDate': membershipEndDate,
            'membership.isActive': !!periodHasStarted,
            status: periodHasStarted ? 'active' : 'inactive',
          }, { session });
        });
      } catch (txnErr) {
        if (!isTransactionUnsupported(txnErr)) throw txnErr;
        await applyRenewalWithoutSession();
      } finally {
        await session.endSession();
      }
    } else {
      await applyRenewalWithoutSession();
    }

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
