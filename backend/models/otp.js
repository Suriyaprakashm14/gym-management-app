const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const otpSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 6
  },
  type: {
    type: String,
    enum: ['password_reset', 'email_verification', 'two_factor'],
    required: true,
    default: 'password_reset'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3 // Maximum 3 verification attempts
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
otpSchema.index({ otp: 1 });

// Virtual for checking if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return Date.now() > this.expiresAt.getTime();
});

// Virtual for checking if OTP can be used
otpSchema.virtual('canBeUsed').get(function() {
  return !this.isUsed && !this.isBlocked && !this.isExpired && this.attempts < 3;
});

// Instance methods
otpSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  this.usedAt = new Date();
  return this.save();
};

otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  if (this.attempts >= 3) {
    this.isBlocked = true;
  }
  return this.save();
};

otpSchema.methods.isValid = function(inputOtp) {
  if (!this.canBeUsed) {
    return false;
  }
  return this.otp === inputOtp;
};

// Static methods
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

otpSchema.statics.createForEmail = async function(email, type = 'password_reset') {
  // Invalidate any existing OTPs for this email and type
  await this.updateMany(
    { email: email.toLowerCase(), type, isUsed: false },
    { isUsed: true, usedAt: new Date() }
  );

  // Create new OTP
  const otp = this.generateOTP();
  const otpRecord = new this({
    email: email.toLowerCase(),
    otp,
    type
  });

  return otpRecord.save();
};

otpSchema.statics.verifyOTP = async function(email, otp, type = 'password_reset') {
  const otpRecord = await this.findOne({
    email: email.toLowerCase(),
    type,
    isUsed: false,
    isBlocked: false,
    expiresAt: { $gt: new Date() }
  });

  if (!otpRecord) {
    throw new Error('Invalid or expired OTP');
  }

  if (otpRecord.isValid(otp)) {
    await otpRecord.markAsUsed();
    return true;
  } else {
    await otpRecord.incrementAttempts();
    throw new Error('Invalid OTP');
  }
};

otpSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('OTP', otpSchema);
