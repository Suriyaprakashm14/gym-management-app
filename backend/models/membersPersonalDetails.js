const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relation: { type: String, required: true }
}, { _id: false });

const personalDetailsSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  memberId: {
    type: String, // Changed to String to match Member model's _id type
    ref: 'Member',
    required: true,
    unique: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'others'],
    required: true
  },
  streetAddress: { type: String },
  city: { type: String },
  zipcode: { type: String },
  state: { type: String },
  country: { type: String },
  phoneNumber: { type: String, required: true },
  emergencyContacts: [emergencyContactSchema],
  dateOfBirth: { type: Date },
  age: { type: Number, default: null },
  membership: { type: String},
  membership_start_date: { type: Date, default: null },
  membership_end_date: { type: Date, default: null },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  last_visit: { type: Date, default: null },
}, { timestamps: true });

// Pre-save middleware to calculate age from dateOfBirth
personalDetailsSchema.pre('save', function(next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    this.age = age;
  }
  next();
});

module.exports = mongoose.model('MembersPersonalDetails', personalDetailsSchema);
