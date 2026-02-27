// /models/membershipPrice.js
const mongoose = require('mongoose');

const membershipPriceSchema = new mongoose.Schema({
  _id: { type: mongoose.Types.ObjectId, auto: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true }, // e.g., 1,30,365
  isActive: { type: Boolean, default: true },
  gymId: { type: String, required: true, ref: 'Gym' }
});

// Add indexes for better performance
membershipPriceSchema.index({ gymId: 1, type: 1 }, { unique: true }); // Each gym can have only one price per type
membershipPriceSchema.index({ gymId: 1 });

module.exports = mongoose.model('MembershipPrice', membershipPriceSchema);
