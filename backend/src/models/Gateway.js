const mongoose = require('mongoose');

const gatewaySchema = new mongoose.Schema({
  macAddress:         { type: String, required: true },
  deviceId:           { type: String },
  status:             { type: String },
  SQSEndpoint:        { type: String },   // IoT communication endpoint
  topic:              { type: String },   // SQS topic for communication
  terminalMetaDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'TerminalMetaData' }
}, { timestamps: true });

module.exports = mongoose.model('Gateway', gatewaySchema);