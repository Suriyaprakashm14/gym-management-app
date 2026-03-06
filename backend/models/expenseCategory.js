const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  _id: { type: mongoose.Types.ObjectId, auto: true },
  name: { type: String, required: true, trim: true },
  gymId: { type: String, required: true, ref: 'Gym' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

expenseCategorySchema.index({ gymId: 1, name: 1 }, { unique: true });
expenseCategorySchema.index({ gymId: 1 });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
