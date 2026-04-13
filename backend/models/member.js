const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { todayMidnightIST, ninetyDaysAgoIST } = require('../utils/istTime');

const memberSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    unique: true, 
    sparse: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // allow empty for members
        return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  // Organization structure - members belong to a gym and branch
  gymId: {
    type: String,
    ref: 'Gym',
    required: true
  },
  branchId: { 
    type: String, 
    ref: "Branch", 
    required: true 
  },
  // Member profile
  profile: {
    phone: String,
    dateOfBirth: Date,
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  // Membership information
  membership: {
    type: {
      type: String,
      trim: true,
      default: 'basic'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  // Member role/type
  role: {
    type: String,
    enum: ['member', 'trainer'],
    default: 'member'
  },
  // Member status (inactive = expired ≤90 days; long term inactive = expired >90 days)
  status: {
    type: String,
    enum: ['active', 'inactive', 'long term inactive', 'suspended'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Profile image
  image: { type: String },
  // Face recognition
  personId: { type: String }, // Luxand face recognition ID
  // Fingerprint authentication fields
  hasFingerprint: { type: Boolean, default: false },
  fingerprintEnrolled: { type: Date },

  // WebAuthn / Windows Hello fingerprint credential (stored for check-in verification)
  // fingerprintId is the WebAuthn credential ID (base64url string).
  fingerprintId: { type: String, default: null, index: true },
  // publicKey is the credential public key (raw bytes).
  publicKey: { type: Buffer, default: null },
  counter: { type: Number, default: 0 },
  // Authentication preferences
  authMethods: {
    faceRecognition: { type: Boolean, default: true },
    fingerprint: { type: Boolean, default: false },
    // Future: card, pin, etc.
  },
  // Health and fitness information
  healthInfo: {
    medicalConditions: [String],
    allergies: [String],
    medications: [String],
    fitnessGoals: [String],
    restrictions: [String]
  },
  // Audit trail
  createdBy: {
    type: String,
    ref: 'User'
  },
  lastModifiedBy: {
    type: String,
    ref: 'User'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Virtual for full name
memberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for membership status
memberSchema.virtual('isMembershipActive').get(function() {
  if (!this.membership?.isActive) return false;
  if (!this.membership?.startDate || !this.membership?.endDate) return false;
  const today = todayMidnightIST();
  const start = new Date(this.membership.startDate);
  const end = new Date(this.membership.endDate);
  return start <= today && end >= today;
});

// Batch expiry sync using Member.membership as the only source of truth.
memberSchema.statics.checkAndUpdateExpiredMemberships = async function() {
  try {
    const today = todayMidnightIST();
    const ninetyDaysAgo = ninetyDaysAgoIST();
    const asOfLocalDate = today.toISOString().slice(0, 10);

    const expiredMembers = await this.find({
      role: 'member',
      status: { $nin: ['suspended', 'inactive', 'long term inactive'] },
      'membership.isActive': true,
      'membership.endDate': { $exists: true, $ne: null, $lt: today },
    }).select('_id membership.endDate');

    const inactiveIds = [];
    const longTermInactiveIds = [];
    for (const member of expiredMembers) {
      const endDate = member?.membership?.endDate ? new Date(member.membership.endDate) : null;
      if (endDate && endDate < ninetyDaysAgo) {
        longTermInactiveIds.push(member._id);
      } else {
        inactiveIds.push(member._id);
      }
    }

    if (inactiveIds.length > 0) {
      await this.updateMany(
        { _id: { $in: inactiveIds } },
        { $set: { 'membership.isActive': false, status: 'inactive' } }
      );
    }
    if (longTermInactiveIds.length > 0) {
      await this.updateMany(
        { _id: { $in: longTermInactiveIds } },
        { $set: { 'membership.isActive': false, status: 'long term inactive' } }
      );
    }

    return {
      success: true,
      asOfLocalDate,
      inactiveCount: inactiveIds.length,
      longTermInactiveCount: longTermInactiveIds.length,
      message: `Marked ${inactiveIds.length} inactive and ${longTermInactiveIds.length} long term inactive`,
    };
  } catch (error) {
    console.error('Error checking expired memberships:', error);
    throw error;
  }
};

// Indexes for performance (email already has index from unique: true, sparse: true)
memberSchema.index({ gymId: 1 });
memberSchema.index({ branchId: 1 });
memberSchema.index({ role: 1 });
memberSchema.index({ status: 1 });
memberSchema.index({ isActive: 1 });
memberSchema.index({ 'membership.isActive': 1 });

// Instance methods
memberSchema.methods.canAccessGym = function(gymId) {
  return this.gymId === gymId;
};

memberSchema.methods.canAccessBranch = function(branchId) {
  return this.branchId === branchId;
};

memberSchema.methods.isFrozen = async function() {
  const Gym = mongoose.model('Gym');
  const gym = await Gym.findById(this.gymId);
  return gym && gym.isFrozen;
};

memberSchema.methods.renewMembership = function(newEndDate) {
  this.membership.endDate = newEndDate;
  this.membership.isActive = true;
  this.status = 'active';
  return this.save();
};

memberSchema.methods.suspendMembership = function(reason) {
  this.membership.isActive = false;
  this.status = 'suspended';
  return this.save();
};

// Static methods
memberSchema.statics.findByGym = function(gymId) {
  return this.find({ gymId, isActive: true });
};

memberSchema.statics.findByBranch = function(branchId) {
  return this.find({ branchId, isActive: true });
};

memberSchema.statics.findActiveMembers = function() {
  return this.find({ 
    isActive: true, 
    status: 'active',
    'membership.isActive': true 
  });
};

memberSchema.statics.findExpiredMembers = function() {
  return this.find({
    status: { $in: ['inactive', 'long term inactive'] }
  });
};

memberSchema.index({ role: 1, status: 1, 'membership.endDate': 1 });

module.exports = mongoose.model("Member", memberSchema);
