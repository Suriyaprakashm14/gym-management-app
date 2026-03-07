const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const gymSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: {
    type: String,
    required: true,
    trim: true
  },
  /** Gym icon/logo (data URL or base64) uploaded during signup; used in navbar branding */
  logoUrl: { type: String, default: null },
  description: {
    type: String,
    trim: true
  },
  // Contact information
  contactInfo: {
    email: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
      }
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    }
  },
  // Gym status and settings
  status: {
    type: String,
    enum: ['active', 'frozen', 'suspended'],
    default: 'active'
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  frozenAt: Date,
  frozenBy: {
    type: String,
    ref: 'User'
  },
  frozenReason: String,
  // Subscription and billing
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true }
  },
  // Settings and configuration
  settings: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    maxBranches: { type: Number, default: 5 },
    maxManagers: { type: Number, default: 10 },
    allowFaceRecognition: { type: Boolean, default: true },
    allowFingerprint: { type: Boolean, default: true }
  },
  // Metadata
  createdBy: {
    type: String,
    ref: 'User',
    required: true
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

// Virtual for branch count
gymSchema.virtual('branchCount', {
  ref: 'Branch',
  localField: '_id',
  foreignField: 'gymId',
  count: true
});

// Virtual for user count
gymSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'gymId',
  count: true
});

// Indexes for performance
gymSchema.index({ name: 1 });
gymSchema.index({ status: 1 });
gymSchema.index({ isFrozen: 1 });
gymSchema.index({ 'contactInfo.email': 1 });

// Pre-save middleware
gymSchema.pre('save', function(next) {
  if (this.isModified('isFrozen') && this.isFrozen) {
    this.frozenAt = new Date();
  } else if (this.isModified('isFrozen') && !this.isFrozen) {
    this.frozenAt = undefined;
    this.frozenBy = undefined;
    this.frozenReason = undefined;
  }
  next();
});

// Instance methods
gymSchema.methods.freeze = function(adminId, reason) {
  this.isFrozen = true;
  this.frozenBy = adminId;
  this.frozenReason = reason;
  this.status = 'frozen';
  return this.save();
};

gymSchema.methods.unfreeze = function() {
  this.isFrozen = false;
  this.frozenBy = undefined;
  this.frozenReason = undefined;
  this.status = 'active';
  return this.save();
};

gymSchema.methods.canCreateBranch = function() {
  return this.status === 'active' && !this.isFrozen;
};

gymSchema.methods.canCreateManager = function() {
  return this.status === 'active' && !this.isFrozen;
};

module.exports = mongoose.model('Gym', gymSchema);
