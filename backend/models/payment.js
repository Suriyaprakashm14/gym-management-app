const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  memberId: { type: String, ref: 'Member', required: true },
  branchId: { type: String, ref: 'Branch', required: true },
  name: { type: String, ref: 'Member', required: true },
  detailsId: { type: String, ref: 'MembersPersonalDetails', required: true },
  membership: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  paidAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
