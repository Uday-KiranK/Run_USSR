const mongoose = require('mongoose');

const terminalMetaDataSchema = new mongoose.Schema({
  terminalId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', required: true },
  osVersion:         { type: String },
  controllerId:      { type: String },
  layoutType:        { type: String, default: 'FIVEBYFOUR' },  // 5x4 = 20 boxes
  rows:              { type: Number, required: true, default: 4 },
  columns:           { type: Number, required: true, default: 5 },
  maxPorts:          { type: Number, default: 20 },
  gatewayIdRef:      { type: String },                // IoT gateway reference
  pricingId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Pricing' },
  partialPickupCharge: { type: Number, default: 0 },
  enabled:           { type: Boolean, default: true },
  skipPayment:       { type: Boolean, default: false }, // demo/testing mode
  status:            { 
    type: String, 
    enum: ['ACTIVE', 'SETUP_IN_PROGRESS', 'DECOMMISSIONED'], 
    default: 'SETUP_IN_PROGRESS' 
  }
}, { timestamps: true });

module.exports = mongoose.model('TerminalMetaData', terminalMetaDataSchema);