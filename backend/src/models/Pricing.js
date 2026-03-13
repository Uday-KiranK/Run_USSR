const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  // JSON string: [{"hours": 3, "price": 30}, {"hours": 3, "price": 50}]
  config:     { type: String, required: true },
  createdBy:  { type: String },
  updatedBy:  { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Pricing', pricingSchema);