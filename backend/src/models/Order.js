const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId:       { type: String, unique: true },   // e.g. "PU-2025-001234"
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  terminalId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', required: true },
  boxId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true },
  pricingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Pricing' },
  status: { 
    type: String, 
    enum: [
      'RESERVED',         // box reserved, preparing items
      'READY_FOR_PICKUP', // items ready, access code sent
      'IN_PROGRESS',      // user has accessed box
      'COMPLETED',        // pickup completed successfully
      'EXPIRED',          // pickup window expired
      'CANCELLED',        // order cancelled
      'BOX_NA'            // no box available
    ], 
    default: 'RESERVED' 
  },
  accessCode:    { type: String },           // 4-digit code for box opening
  otp:           { type: String },           // box access OTP
  pin:           { type: String },           // optional PIN for access
  phoneNumber:   { type: String, index: true },  // user phone at time of booking
  boxName:       { type: String },           // e.g. "A-1"
  slotPrice:     { type: Number, default: 0 },
  source:        { type: String, enum: ['WEB', 'KIOSK'], default: 'WEB' },
  paymentDone:   { type: Boolean, default: false },
  paymentExpiry: { type: Date },
  startTime:     { type: Date, default: Date.now },
  endTime:       { type: Date },
  orderDate:     { type: Date, default: Date.now },
  expiryTime:    { type: Date },             // when pickup window expires
  pickupWindow:  { type: String },
  durationHours: { type: Number, default: 1 },         // e.g. "24 hours"
  maxAttempts:   { type: Number, default: 3 } // max pickup attempts allowed
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);