const mongoose = require('mongoose');

const terminalSchema = new mongoose.Schema({
  identifiableName:  { type: String, required: true },  // e.g. "Mall Terminal A"
  description:       { type: String },
  siteId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  physicalLocation:  { type: String },                  // e.g. "Ground Floor, Near Entrance"
  status:            { 
    type: String, 
    enum: ['ACTIVE', 'SETUP_IN_PROGRESS', 'DECOMMISSIONED'], 
    default: 'SETUP_IN_PROGRESS' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Terminal', terminalSchema);