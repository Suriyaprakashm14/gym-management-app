const mongoose = require('mongoose');

// Separate collection so we do not modify existing Member schema.
const memberBiometricAttendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      ref: 'Member',
      required: true,
      unique: true,
      index: true,
    },
    subscriptionStart: {
      type: Date,
      default: null,
    },
    subscriptionEnd: {
      type: Date,
      default: null,
    },
    attendance: {
      type: [Date],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'MemberBiometricAttendance',
  memberBiometricAttendanceSchema
);

