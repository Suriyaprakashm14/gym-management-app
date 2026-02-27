const Member = require('../models/member');
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

    const members = await Member.find(filter);
    res.json(members);
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

    // Use findByIdAndUpdate with $set to handle nested objects properly
    const updateData = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key.startsWith('profile.')) {
        // Handle nested profile fields
        const profileField = key.split('.')[1];
        if (!updateData['profile']) updateData['profile'] = {};
        updateData['profile'][profileField] = value;
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
