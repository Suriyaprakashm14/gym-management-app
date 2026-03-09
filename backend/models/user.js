const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
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
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  // RBAC Role system
  role: { 
    type: String, 
    enum: ['gym_owner', 'manager', 'staff'],
    required: true
  },
  // Organization structure
  gymId: {
    type: String,
    ref: 'Gym',
    required: function() {
      return ['gym_owner', 'manager', 'staff'].includes(this.role);
    }
  },
  // Gym owner only: branches this gym owner owns (for branch ownership isolation)
  branches: [{
    type: String,
    ref: 'Branch'
  }],
  branchId: {
    type: String,
    ref: 'Branch',
    required: function() {
      return ['manager', 'staff'].includes(this.role);
    }
  },
  // User status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'frozen'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Account security
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  // Profile information
  profile: {
    phone: String,
    avatar: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    }
  },
  // Face recognition
  personId: { 
    type: String // Luxand face recognition ID
  },
  // Fingerprint authentication
  hasFingerprint: { 
    type: Boolean, 
    default: false 
  },
  fingerprintEnrolled: { 
    type: Date 
  },
  // Authentication preferences
  authMethods: {
    faceRecognition: { type: Boolean, default: true },
    fingerprint: { type: Boolean, default: false },
    password: { type: Boolean, default: true }
  },
  // Permissions (for fine-grained control)
  permissions: [{
    resource: String, // e.g., 'members', 'attendance', 'payments'
    actions: [String] // e.g., ['read', 'write', 'delete']
  }],
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
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for performance (email already has index from unique: true)
userSchema.index({ role: 1 });
userSchema.index({ gymId: 1 });
userSchema.index({ branchId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

userSchema.methods.hasPermission = function(resource, action) {
  // Check specific permissions
  const permission = this.permissions.find(p => p.resource === resource);
  return permission && permission.actions.includes(action);
};

userSchema.methods.canAccessGym = function(gymId) {
  return this.gymId && this.gymId.toString() === gymId.toString();
};

userSchema.methods.canAccessBranch = function(branchId) {
  // Gym owner: strict branch ownership when branches array is set
  if (this.role === 'gym_owner') {
    if (this.branches && this.branches.length > 0) {
      const allowed = this.branches.some(b => b && b.toString() === branchId.toString());
      if (!allowed) return false;
    }
    // Legacy: no branches array — caller may check gymId vs branch.gymId
    return true;
  }
  
  // Manager / staff can only access their own branch
  return this.branchId && this.branchId.toString() === branchId.toString();
};

userSchema.methods.isFrozen = async function() {
  // Check if user is directly frozen
  if (this.status === 'frozen') return true;
  
  // Check if gym is frozen (for gym_owner, manager)
  if (['gym_owner', 'manager'].includes(this.role)) {
    const Gym = mongoose.model('Gym');
    const gym = await Gym.findById(this.gymId);
    return gym && gym.isFrozen;
  }
  
  return false;
};

// Static methods
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

userSchema.statics.findByGym = function(gymId) {
  return this.find({ gymId, isActive: true });
};

userSchema.statics.findByBranch = function(branchId) {
  return this.find({ branchId, isActive: true });
};

module.exports = mongoose.model('User', userSchema);
