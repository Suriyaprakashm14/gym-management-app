const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const branchSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  // Organization structure
  gymId: {
    type: String,
    ref: 'Gym',
    required: true
  },
  // Location information
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Contact information (email removed per requirements)
  contactInfo: {
    phone: String
  },
  // Branch status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Branch settings
  settings: {
    operatingHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
    },
    maxCapacity: { type: Number, default: 100 },
    allowFaceRecognition: { type: Boolean, default: true },
    allowFingerprint: { type: Boolean, default: true }
  },
  // Equipment and facilities
  facilities: [{
    name: String,
    description: String,
    isAvailable: { type: Boolean, default: true }
  }],
  // Audit trail
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

// Virtual for user count
branchSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'branchId',
  count: true
});

// Virtual for member count
branchSchema.virtual('memberCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'branchId',
  count: true,
  match: { role: 'member' }
});

// Indexes for performance
branchSchema.index({ name: 1 });
branchSchema.index({ gymId: 1 });
branchSchema.index({ status: 1 });
branchSchema.index({ isActive: 1 });
branchSchema.index({ 'address.city': 1 });

// Compound index for unique branch names within a gym
branchSchema.index({ name: 1, gymId: 1 }, { unique: true });

// Instance methods
branchSchema.methods.canCreateManager = function() {
  return this.status === 'active' && this.isActive;
};

branchSchema.methods.isFrozen = async function() {
  const Gym = mongoose.model('Gym');
  const gym = await Gym.findById(this.gymId);
  return gym && gym.isFrozen;
};

// Static methods
branchSchema.statics.findByGym = function(gymId) {
  return this.find({ gymId, isActive: true });
};

branchSchema.statics.findActive = function() {
  return this.find({ status: 'active', isActive: true });
};

module.exports = mongoose.model('Branch', branchSchema);
