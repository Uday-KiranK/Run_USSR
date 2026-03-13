const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  token:       { type: String, required: true },   // 6-digit OTP
  flow: { 
    type: String, 
    enum: ['LOGIN_SMS_OTP', 'SIGNUP_SMS_OTP', 'UPDATE_PROFILE_TOKEN'], 
    default: 'LOGIN_SMS_OTP' 
  },
  channel:     { type: String, enum: ['SMS_ME', 'NONE'], default: 'SMS_ME' },
  expiryTime:  { type: Date, required: true },     // 5 min from creation
  verified:    { type: Boolean, default: false },
  attempts:    { type: Number, default: 0 }        // max 3 attempts
}, { timestamps: true });

module.exports = mongoose.model('OtpToken', otpTokenSchema);