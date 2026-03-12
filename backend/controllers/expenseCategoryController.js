const ExpenseCategory = require('../models/expenseCategory');

const allowedRoles = ['gym_owner', 'manager'];

function getGymFilter(req) {
  if (req.user.role === 'gym_owner' && req.user.gymId) return { gymId: req.user.gymId };
  if (req.user.role === 'manager' && req.user.gymId) return { gymId: req.user.gymId };
  return {};
}

exports.list = async (req, res) => {
  try {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const filter = getGymFilter(req);
    const categories = await ExpenseCategory.find(filter).sort({ name: 1 }).lean();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const gymId = req.user.gymId;
    if (!gymId) return res.status(400).json({ error: 'Gym context required' });
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const existing = await ExpenseCategory.findOne({ gymId, name });
    if (existing) {
      return res.status(400).json({ error: `Category "${name}" already exists` });
    }
    const category = await ExpenseCategory.create({ gymId, name, isActive: true });
    res.status(201).json({
      success: true,
      data: {
        id: category._id,
        name: category.name
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const category = await ExpenseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (category.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Not authorized for this category' });
    }
    const name = (req.body.name || '').trim();
    if (name) category.name = name;
    if (req.body.isActive !== undefined) category.isActive = !!req.body.isActive;
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const category = await ExpenseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (category.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Not authorized for this category' });
    }
    await ExpenseCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
