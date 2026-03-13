const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
  terminalId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', required: true },
  terminalMetaDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'TerminalMetaData' },
  controllerId:       { type: String },
  identifiableName:   { type: String, required: true },  // "A-1", "B-3"
  port:               { type: Number, required: true },  // hardware port number
  row:                { type: Number, required: true },
  col:                { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'], 
    default: 'MEDIUM' 
  },
  boxStatus: { 
    type: String, 
    enum: [
      'EMPTY_CLOSED',      // available for booking
      'BOOKED',            // reserved, payment pending
      'OCCUPIED_OPEN',     // user has opened the box
      'OCCUPIED_CLOSED',   // user closed box, still rented
      'DISABLED',          // out of service
      'AWAITING_PAYMENT',  // additional payment required
      'OPEN_REQUESTED',    // open command sent to hardware
      'CANCEL_REQUESTED',  // cancellation in progress
      'TERMINATE_REQUESTED', // termination in progress
      'BLOCKED',           // temporarily blocked
      'CANCELLED'          // booking cancelled
    ], 
    default: 'EMPTY_CLOSED' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Box', boxSchema);