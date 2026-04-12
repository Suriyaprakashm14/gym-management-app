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
  // Member status (inactive = expired ≤90 days; long term inactive = expired >90 days)
  status: {
    type: String,
    enum: ['active', 'inactive', 'long term inactive', 'suspended', 'expired'],
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
  if (!this.membership.isActive) return false;
  if (this.membership.endDate && this.membership.endDate < new Date()) return false;
  return true;
});

// Static method to check and update expired memberships.
// Uses the same subscriptionPeriods ordering as member flows (utils/subscriptionPeriods).
// Skips suspended / already inactive members for revenue-critical safety.
memberSchema.statics.checkAndUpdateExpiredMemberships = async function() {
  try {
    const { getCurrentPeriodForDate } = require('../utils/subscriptionPeriods');
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const asOfLocalDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const Details = require('./membersPersonalDetails');

    const skipStatuses = new Set(['suspended', 'inactive', 'long term inactive']);

    async function syncActiveWindow(memberId, periodStart, periodEnd) {
      await Details.findOneAndUpdate(
        { memberId },
        { membership_start_date: periodStart, membership_end_date: periodEnd }
      );
      await this.findByIdAndUpdate(memberId, {
        'membership.startDate': periodStart,
        'membership.endDate': periodEnd,
        'membership.isActive': true,
        status: 'active',
      });
    }

    /**
     * If subscriptionPeriods says there is a current or upcoming paid window, sync docs; else queue inactive.
     */
    const considerDetailAndMember = async (detail, memberDoc) => {
      if (!memberDoc || skipStatuses.has(memberDoc.status)) return { advanced: false, inactive: false };
      if (memberDoc.role && memberDoc.role !== 'member') return { advanced: false, inactive: false };

      const periods = detail.subscriptionPeriods;
      if (Array.isArray(periods) && periods.length > 0) {
        const cur = getCurrentPeriodForDate(periods, now);
        if (cur && cur.isActive) {
          await syncActiveWindow.call(this, detail.memberId, cur.periodStart, cur.periodEnd);
          return { advanced: true, inactive: false };
        }
        if (cur && !cur.isActive && now < cur.periodStart) {
          await syncActiveWindow.call(this, detail.memberId, cur.periodStart, cur.periodEnd);
          return { advanced: true, inactive: false };
        }
      }
      return { advanced: false, inactive: true };
    };

    let advancedCount = 0;
    const toMarkInactiveSet = new Set();

    const expiredPersonalDetails = await Details.find({
      membership_end_date: { $lt: today },
      membership: { $exists: true, $ne: null },
    });

    for (const detail of expiredPersonalDetails) {
      const memberDoc = await this.findById(detail.memberId);
      const { advanced, inactive } = await considerDetailAndMember.call(this, detail, memberDoc);
      if (advanced) advancedCount++;
      if (inactive && memberDoc && !skipStatuses.has(memberDoc.status)) {
        toMarkInactiveSet.add(String(detail.memberId));
      }
    }

    // Members whose Member record shows an expired end date but were not fixed above (no Details row, drift, etc.)
    const memberOnlyExpired = await this.find({
      role: 'member',
      status: { $nin: ['inactive', 'long term inactive', 'suspended'] },
      membership: { $exists: true },
      'membership.isActive': true,
      'membership.endDate': { $exists: true, $lt: today },
    });

    for (const memberDoc of memberOnlyExpired) {
      const mid = String(memberDoc._id);
      if (toMarkInactiveSet.has(mid)) continue;

      const detail = await Details.findOne({ memberId: mid });
      if (!detail || !detail.membership) {
        toMarkInactiveSet.add(mid);
        continue;
      }

      if (detail.membership_end_date && new Date(detail.membership_end_date) >= today) {
        await this.findByIdAndUpdate(mid, {
          'membership.startDate': detail.membership_start_date,
          'membership.endDate': detail.membership_end_date,
          'membership.isActive': true,
        });
        continue;
      }

      const { advanced, inactive } = await considerDetailAndMember.call(this, detail, memberDoc);
      if (advanced) advancedCount++;
      else if (inactive) toMarkInactiveSet.add(mid);
    }

    const toMarkInactive = Array.from(toMarkInactiveSet);

    const expiredMembers = await this.find({
      _id: { $in: toMarkInactive },
      status: { $nin: ['inactive', 'long term inactive', 'suspended'] },
    });

    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    for (const member of expiredMembers) {
      const endDate = member.membership?.endDate ? new Date(member.membership.endDate) : null;
      member.status = endDate && endDate < ninetyDaysAgo ? 'long term inactive' : 'inactive';
      member.membership.isActive = false;
      await member.save();
    }

    return {
      success: true,
      asOfLocalDate,
      expiredCount: expiredMembers.length,
      advancedCount,
      message: `Advanced or repaired ${advancedCount} membership window(s); marked ${expiredMembers.length} member(s) inactive`,
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
