const Box = require('../models/Box');
const Terminal = require('../models/Terminal');
const TerminalMetaData = require('../models/TerminalMetaData');
const { asyncHandler, validateObjectId } = require('../utils/helpers');

// PDF Box fields: terminalId, terminalMetaDataId, identifiableName, type (BoxType), boxStatus, col, rw, port

const getTerminalLayout = asyncHandler(async (req, res) => {
  const { terminalId } = req.params;
  if (!validateObjectId(terminalId)) {
    return res.status(400).json({ success: false, message: 'Invalid terminal ID format' });
  }
  const terminal = await Terminal.findById(terminalId);
  if (!terminal || terminal.status === 'DECOMMISSIONED') {
    return res.status(404).json({ success: false, message: 'Terminal not found or decommissioned' });
  }
  const [boxes, metaData] = await Promise.all([
    Box.find({ terminalId }).sort({ row: 1, col: 1 }),
    TerminalMetaData.findOne({ terminalId }),
  ]);
  res.json({
    success: true,
    data: { layoutType: metaData?.layoutType, maxPorts: metaData?.maxPorts, boxes },
  });
});

const getBoxById = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const box = await Box.findById(req.params.id).populate('terminalId', 'identifiableName siteId');
  if (!box) return res.status(404).json({ success: false, message: 'Box not found' });
  res.json({ success: true, data: box });
});

const updateBoxStatus = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const { boxStatus } = req.body;
  if (!boxStatus) {
    return res.status(400).json({ success: false, message: 'boxStatus is required' });
  }
  // Admin can only set EMPTY_CLOSED (restore) or DISABLED (maintenance). BOOKED/OCCUPIED_* are set by the booking system.
  if (!['EMPTY_CLOSED', 'DISABLED'].includes(boxStatus)) {
    return res.status(400).json({ success: false, message: 'Admin can only set boxStatus to EMPTY_CLOSED or DISABLED' });
  }
  const box = await Box.findByIdAndUpdate(req.params.id, { boxStatus }, { new: true, runValidators: true });
  if (!box) return res.status(404).json({ success: false, message: 'Box not found' });
  res.json({ success: true, data: box });
});

module.exports = { getTerminalLayout, getBoxById, updateBoxStatus };
