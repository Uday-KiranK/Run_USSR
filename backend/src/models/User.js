const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber:  { type: String, required: true, unique: true },
  password:     { type: String },              // admin only, bcrypt hashed
  name:         { type: String },
  email:        { type: String },
  verified:     { type: Boolean, default: false },
  enabled:      { type: Boolean, default: true },
  role:         { type: String, enum: ['USER', 'ADMIN'], default: 'USER' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);