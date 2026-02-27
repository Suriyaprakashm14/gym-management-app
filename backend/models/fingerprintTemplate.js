const mongoose = require('mongoose');

const fingerprintTemplateSchema = new mongoose.Schema({
  memberId: {
    type: String,
    ref: 'Member',
    required: true,
    unique: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  // ZKFinger template data
  template: {
    type: Buffer,
    required: true
  },
  // Template size in bytes
  templateSize: {
    type: Number,
    required: true
  },
  // Finger position (1-10, where 1=Right Thumb, 2=Right Index, etc.)
  fingerPosition: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  // Template quality score (0-100)
  quality: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  // Device information
  deviceInfo: {
    deviceIP: String,
    devicePort: Number,
    deviceModel: String,
    enrollmentDate: {
      type: Date,
      default: Date.now
    }
  },
  // Status of the template
  status: {
    type: String,
    enum: ['active', 'inactive', 'corrupted'],
    default: 'active'
  }
}, { timestamps: true });

// Index for faster lookups (memberId already has unique index from unique: true)
fingerprintTemplateSchema.index({ branchId: 1 });
fingerprintTemplateSchema.index({ status: 1 });

module.exports = mongoose.model('FingerprintTemplate', fingerprintTemplateSchema);

