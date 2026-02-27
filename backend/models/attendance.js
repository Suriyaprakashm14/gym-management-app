const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const attendanceSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  // Organization structure - attendance belongs to a gym and branch
  gymId: {
    type: String,
    ref: 'Gym',
    required: true
  },
  memberId: {
    type: String,
    ref: 'Member',
    required: true,
  },
  attendanceDate: {
    type: Date,
    required: true,
    default: () => new Date().setHours(0, 0, 0, 0),
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    required: true,
    default: 'Absent',
  },
  // Authentication method used
  authMethod: {
    type: String,
    enum: ['face_recognition', 'fingerprint', 'manual', 'card', 'dual_auth'],
    required: true,
    default: 'manual'
  },
  // Additional authentication data
  authData: {
    confidence: Number, // For face recognition confidence score
    deviceInfo: {
      deviceIP: String,
      deviceModel: String,
      deviceType: String // 'camera', 'fingerprint_scanner', 'card_reader'
    }
  },
  // Location/device information
  location: {
    branchId: {
      type: String,
      ref: 'Branch',
      required: true
    },
    deviceId: String, // Device identifier
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Additional attendance details
  checkInTime: Date,
  checkOutTime: Date,
  duration: Number, // Duration in minutes
  notes: String,
  // Audit trail
  createdBy: {
    type: String,
    ref: 'User'
  },
  lastModifiedBy: {
    type: String,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for attendance duration
attendanceSchema.virtual('attendanceDuration').get(function() {
  if (this.checkInTime && this.checkOutTime) {
    return Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60)); // Duration in minutes
  }
  return null;
});

// Indexes for performance
attendanceSchema.index({ gymId: 1 });
attendanceSchema.index({ memberId: 1 });
attendanceSchema.index({ attendanceDate: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ 'location.branchId': 1 });
attendanceSchema.index({ authMethod: 1 });

// Compound indexes for common queries
attendanceSchema.index({ gymId: 1, attendanceDate: 1 });
attendanceSchema.index({ memberId: 1, attendanceDate: 1 });
attendanceSchema.index({ 'location.branchId': 1, attendanceDate: 1 });

// Instance methods
attendanceSchema.methods.canAccessGym = function(gymId) {
  return this.gymId === gymId;
};

attendanceSchema.methods.canAccessBranch = function(branchId) {
  return this.location.branchId === branchId;
};

attendanceSchema.methods.markCheckOut = function() {
  this.checkOutTime = new Date();
  this.duration = this.attendanceDuration;
  return this.save();
};

// Static methods
attendanceSchema.statics.findByGym = function(gymId, startDate, endDate) {
  const query = { gymId };
  if (startDate && endDate) {
    query.attendanceDate = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).populate('memberId', 'firstName lastName').populate('location.branchId', 'name');
};

attendanceSchema.statics.findByBranch = function(branchId, startDate, endDate) {
  const query = { 'location.branchId': branchId };
  if (startDate && endDate) {
    query.attendanceDate = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).populate('memberId', 'firstName lastName');
};

attendanceSchema.statics.findByMember = function(memberId, startDate, endDate) {
  const query = { memberId };
  if (startDate && endDate) {
    query.attendanceDate = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).populate('location.branchId', 'name');
};

attendanceSchema.statics.getAttendanceStats = function(gymId, startDate, endDate) {
  const query = { gymId };
  if (startDate && endDate) {
    query.attendanceDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);
