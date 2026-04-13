const MembershipPrice = require('../models/membershipPrice');
const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');


exports.create = async (req, res) => {
  try {
    // Check authorization - only gym_owner or manager can create membership prices
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner can create membership prices." });
    }

    // Validate required fields
    if (!req.body.type || !req.body.price || !req.body.description || !req.body.duration) {
      return res.status(400).json({ 
        error: "Missing required fields. Please provide: type, price, description, and duration." 
      });
    }

    // For gym owners, add gymId to the membership price
    if (req.user.role === 'gym_owner' && req.user.gymId) {
      req.body.gymId = req.user.gymId;
    }

    // Check if price already exists for this gym and type
    const existingPrice = await MembershipPrice.findOne({ 
      gymId: req.body.gymId, 
      type: req.body.type 
    });
    
    if (existingPrice) {
      return res.status(400).json({ 
        error: `Membership price for type "${req.body.type}" already exists for this gym. Use update instead.`,
        existingPrice: {
          id: existingPrice._id,
          type: existingPrice.type,
          price: existingPrice.price
        }
      });
    }

    const price = new MembershipPrice(req.body);
    await price.save();
    res.status(201).json(price);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    // Check authorization - gym_owner, manager, and staff can view pricing
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can view membership prices." });
    }

    let filter = {};

    // Gym owners can only see prices from their gym
    if (req.user.role === 'gym_owner' && req.user.gymId) {
      filter.gymId = req.user.gymId;
    }

    // Managers can only see prices from their gym (via gymId from branch)
    if (req.user.role === 'manager' && req.user.gymId) {
      filter.gymId = req.user.gymId;
    }

    // Gym owners and managers see only their gym's prices (filter applied)
    const prices = await MembershipPrice.find(filter).lean();
    const now = new Date();
    const pricesWithCount = await Promise.all(
      prices.map(async (p) => {
        const gymMemberIds = await Member.find({ gymId: p.gymId }).distinct('_id');
        const activeCount = await Details.countDocuments({
          memberId: { $in: gymMemberIds.map((id) => id.toString()) },
          membership: p.type,
          membership_end_date: { $gt: now },
        });
        return { ...p, activeCount };
      })
    );
    res.json(pricesWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    // Check authorization - gym_owner, manager, and staff can view individual pricing
    const allowedRoles = ['gym_owner', 'manager', 'staff'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner or manager can view membership prices." });
    }

    const price = await MembershipPrice.findById(req.params.id);
    if (!price) return res.status(404).json({ error: 'Membership Price not found' });

    // Check access permissions
    if (req.user.role === 'gym_owner' && price.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to view this membership price' });
    }

    if (req.user.role === 'manager' && price.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to view this membership price' });
    }

    res.json(price);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Check authorization - only gym_owner or manager can update membership prices
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Only gym_owner or manager can update membership prices.' });
    }

    const price = await MembershipPrice.findById(req.params.id);
    if (!price) return res.status(404).json({ error: 'Membership Price not found' });

    // Check access permissions
    if (req.user.role === 'gym_owner' && price.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this membership price' });
    }
    if (req.user.role === 'manager' && price.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this membership price' });
    }

    // Only type, description, and isActive are editable.
    // Price and duration are immutable after creation to protect existing member subscriptions.
    const { type, description, isActive } = req.body;
    const updateData = {};

    if (type !== undefined) {
      const trimmedType = String(type).trim();
      if (!trimmedType) {
        return res.status(400).json({ error: 'Membership type cannot be empty' });
      }
      // If type is changing, ensure no other plan for this gym already uses it
      if (trimmedType !== price.type) {
        const conflict = await MembershipPrice.findOne({
          gymId: price.gymId,
          type: trimmedType,
          _id: { $ne: price._id },
        });
        if (conflict) {
          return res.status(400).json({
            error: `A membership plan of type "${trimmedType}" already exists for this gym.`,
          });
        }
      }
      updateData.type = trimmedType;
    }

    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No editable fields provided (type, description, isActive).' });
    }

    const updatedPrice = await MembershipPrice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    res.json(updatedPrice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // Check authorization - only gym_owner or manager can delete membership prices
    const allowedRoles = ['gym_owner', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Only gym_owner can delete membership prices." });
    }

    const price = await MembershipPrice.findById(req.params.id);
    if (!price) return res.status(404).json({ error: 'Membership Price not found' });

    // Check access permissions - gym owners can only delete their own gym's prices
    if (req.user.role === 'gym_owner' && price.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied: Not authorized to delete this membership price' });
    }

    // Allow delete only when plan is inactive
    if (price.isActive !== false) {
      return res.status(400).json({
        error: 'Cannot delete an active plan. Make it inactive first.',
        message: 'Cannot delete an active plan. Make it inactive first.',
      });
    }

    // Block delete if any active users are assigned to this plan (subscription not yet expired)
    const gymMemberIds = await Member.find({ gymId: price.gymId }).distinct('_id');
    const activeCount = await Details.countDocuments({
      memberId: { $in: gymMemberIds.map((id) => id.toString()) },
      membership: price.type,
      membership_end_date: { $gt: new Date() },
    });
    if (activeCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete this membership plan because active users are currently assigned.',
        message: 'Cannot delete this membership plan because active users are currently assigned.',
      });
    }

    await MembershipPrice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Membership price deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
