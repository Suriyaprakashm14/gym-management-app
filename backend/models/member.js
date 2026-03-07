const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

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
      enum: ['basic', 'premium', 'vip'],
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
  // Member status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'expired'],
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
  if (!this.membership.isActive) return false;
  if (this.membership.endDate && this.membership.endDate < new Date()) return false;
  return true;
});

// Static method to check and update expired memberships.
// If Details has subscriptionPeriods with a next period (endDate > now), advance to it; otherwise mark Member inactive.
memberSchema.statics.checkAndUpdateExpiredMemberships = async function() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const Details = require('./membersPersonalDetails');

    const expiredPersonalDetails = await Details.find({
      membership_end_date: { $lt: today },
      membership: { $exists: true, $ne: null }
    });

    let advancedCount = 0;
    const toMarkInactive = [];

    for (const detail of expiredPersonalDetails) {
      const nextPeriod = Array.isArray(detail.subscriptionPeriods) && detail.subscriptionPeriods.length > 0
        ? detail.subscriptionPeriods.find((p) => p.endDate && new Date(p.endDate) > now)
        : null;

      if (nextPeriod) {
        const nextStart = new Date(nextPeriod.startDate);
        const nextEnd = new Date(nextPeriod.endDate);
        await Details.findOneAndUpdate(
          { memberId: detail.memberId },
          { membership_start_date: nextStart, membership_end_date: nextEnd }
        );
        await this.findByIdAndUpdate(detail.memberId, {
          'membership.startDate': nextStart,
          'membership.endDate': nextEnd,
          'membership.isActive': true,
          status: 'active'
        });
        advancedCount++;
      } else {
        toMarkInactive.push(detail.memberId);
      }
    }

    const expiredMembers = await this.find({
      _id: { $in: toMarkInactive },
      status: { $ne: 'inactive' }
    });

    for (const member of expiredMembers) {
      member.status = 'inactive';
      member.membership.isActive = false;
      await member.save();
    }

    return {
      success: true,
      expiredCount: expiredMembers.length,
      advancedCount,
      message: `Advanced ${advancedCount} to next period; marked ${expiredMembers.length} members inactive`
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
    $or: [
      { 'membership.isActive': false },
      { 'membership.endDate': { $lt: new Date() } }
    ]
  });
};

module.exports = mongoose.model("Member", memberSchema);
