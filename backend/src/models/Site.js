const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  address:   { type: String, required: true },
  latitude:  { type: Number },
  longitude: { type: Number },
  state:     { type: String },
  pincode:   { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Site', siteSchema);