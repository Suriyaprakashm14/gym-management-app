const Expense = require('../models/expense');

function normalizeId(val) {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  return val._id ? String(val._id) : String(val);
}

exports.list = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    let query = {};

    if (req.user.role === 'gym_owner') {
      query.gymId = normalizeId(req.user.gymId) || req.user.gymId;
      if (branchId) query.branchId = branchId;
    } else if (req.user.role === 'manager') {
      query.branchId = normalizeId(req.user.branchId) || req.user.branchId;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query).sort({ date: -1 }).lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTotalForRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let match = {};
    if (req.user.role === 'gym_owner') {
      match.gymId = normalizeId(req.user.gymId) || req.user.gymId;
    } else if (req.user.role === 'manager') {
      match.branchId = normalizeId(req.user.branchId) || req.user.branchId;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    match.date = { $gte: start, $lte: end };

    const result = await Expense.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const total = result[0]?.total ?? 0;
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { amount, date, category, description, branchId } = req.body;
    if (amount == null || amount < 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const gymId = normalizeId(req.user.gymId) || req.user.gymId;
    let branchIdFinal = branchId || null;

    if (req.user.role === 'manager') {
      branchIdFinal = normalizeId(req.user.branchId) || req.user.branchId;
    } else if (req.user.role === 'gym_owner' && branchId) {
      branchIdFinal = branchId;
    }

    const doc = {
      gymId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      category: category || null,
      description: description || null,
      branchId: branchIdFinal,
    };

    const expense = await Expense.create(doc);
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const expenseGymId = normalizeId(expense.gymId);
    const expenseBranchId = normalizeId(expense.branchId);
    const userGymId = normalizeId(req.user.gymId);
    const userBranchId = normalizeId(req.user.branchId);

    if (req.user.role === 'gym_owner') {
      if (expenseGymId !== userGymId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'manager') {
      if (expenseBranchId !== userBranchId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { amount, date, category, description } = req.body;
    if (amount != null) expense.amount = Number(amount);
    if (date != null) expense.date = new Date(date);
    if (category !== undefined) expense.category = category || null;
    if (description !== undefined) expense.description = description || null;
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const expenseGymId = normalizeId(expense.gymId);
    const expenseBranchId = normalizeId(expense.branchId);
    const userGymId = normalizeId(req.user.gymId);
    const userBranchId = normalizeId(req.user.branchId);

    if (req.user.role === 'gym_owner') {
      if (expenseGymId !== userGymId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'manager') {
      if (expenseBranchId !== userBranchId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
