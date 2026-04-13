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

    // Enforce gym scope for both owners and managers
    if (!req.user.gymId) {
      return res.status(400).json({ error: 'Gym context required' });
    }
    req.body.gymId = req.user.gymId;

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

    if (!req.user.gymId) {
      return res.status(400).json({ error: 'Gym context required' });
    }
    const filter = { gymId: req.user.gymId };

    // Gym owners and managers see only their gym's prices (filter applied)
    const prices = await MembershipPrice.find(filter).lean();
    const now = new Date();
    const pricesWithCount = await Promise.all(
      prices.map(async (p) => {
        const activeCount = await Member.countDocuments({
          gymId: p.gymId,
          role: 'member',
          status: 'active',
          'membership.isActive': true,
          'membership.type': p.type,
          'membership.endDate': { $gt: now },
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
    if (String(price.gymId) !== String(req.user.gymId)) {
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
      return res.status(403).json({ error: "Access denied. Only gym_owner can update membership prices." });
    }

    const price = await MembershipPrice.findById(req.params.id);
    if (!price) return res.status(404).json({ error: 'Membership Price not found' });

    // Check access permissions - gym owners can only update their own gym's prices
    if (String(price.gymId) !== String(req.user.gymId)) {
      return res.status(403).json({ error: 'Access denied: Not authorized to update this membership price' });
    }

    const updatedPrice = await MembershipPrice.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    if (String(price.gymId) !== String(req.user.gymId)) {
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
    const activeCount = await Member.countDocuments({
      gymId: price.gymId,
      role: 'member',
      status: 'active',
      'membership.isActive': true,
      'membership.type': price.type,
      'membership.endDate': { $gt: new Date() },
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
