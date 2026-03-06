const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const expenseSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  gymId: { type: String, required: true, ref: 'Gym' },
  branchId: { type: String, default: null, ref: 'Branch' },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  category: { type: String, default: null, trim: true },
  description: { type: String, default: null, trim: true },
}, { timestamps: true });

expenseSchema.index({ gymId: 1, date: -1 });
expenseSchema.index({ branchId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
