const mongoose = require('mongoose');
const Terminal = require('../models/Terminal');
const TerminalMetaData = require('../models/TerminalMetaData');
const Box = require('../models/Box');
const Site = require('../models/Site');
const { asyncHandler, generateBoxLabel, paginateQuery, validateObjectId } = require('../utils/helpers');
const { LAYOUT_TYPES, LAYOUT_DIMENSIONS, TERMINAL_STATUSES } = require('../config/constants');

// PDF Terminal: identifiableName, description, siteId, physicalLocation, status (TerminalStatus enum)
// PDF TerminalMetaData: terminalId, layoutType, maxPorts, gatewayIdRef, pricingId, controllerId, skipPayment, enabled

const createTerminal = asyncHandler(async (req, res) => {
  const { siteId, identifiableName, description, physicalLocation } = req.body;
  if (!siteId || !identifiableName) {
    return res.status(400).json({ success: false, message: 'siteId and identifiableName are required' });
  }
  if (!validateObjectId(siteId)) {
    return res.status(400).json({ success: false, message: 'Invalid siteId format' });
  }
  const site = await Site.findById(siteId);
  if (!site) {
    return res.status(404).json({ success: false, message: 'Site not found' });
  }
  const terminal = await Terminal.create({
    siteId, identifiableName, description, physicalLocation,
    status: TERMINAL_STATUSES.SETUP_IN_PROGRESS,
  });
  res.status(201).json({ success: true, data: terminal });
});

const setupLayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validateObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // layoutType e.g. 'FIVEBYFOUR' — dimensions resolved from LAYOUT_DIMENSIONS lookup
  const { layoutType = LAYOUT_TYPES.FIVEBYFOUR, gatewayIdRef, pricingId, skipPayment = false, boxType = 'MEDIUM' } = req.body;
  if (!LAYOUT_DIMENSIONS[layoutType]) {
    return res.status(400).json({ success: false, message: 'layoutType must be one of: ' + Object.keys(LAYOUT_DIMENSIONS).join(', ') });
  }

  const terminal = await Terminal.findById(id);
  if (!terminal) {
    return res.status(404).json({ success: false, message: 'Terminal not found' });
  }
  if (terminal.status === TERMINAL_STATUSES.DECOMMISSIONED) {
    return res.status(409).json({ success: false, message: 'Cannot configure a decommissioned terminal' });
  }

  const existingMeta = await TerminalMetaData.findOne({ terminalId: id });
  if (existingMeta) {
    return res.status(409).json({ success: false, message: 'Layout already configured. Use PUT to update.' });
  }

  const { rows, cols } = LAYOUT_DIMENSIONS[layoutType];
  const maxPorts = rows * cols;

  // NOTE: transactions confirmed working — project uses MongoDB Atlas
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const metaData = await TerminalMetaData.create(
      [{ terminalId: id, layoutType, rows, columns: cols, maxPorts, gatewayIdRef, pricingId, skipPayment, enabled: true }],
      { session }
    );

    const boxDocs = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        boxDocs.push({
          terminalId: id,
          terminalMetaDataId: metaData[0]._id,
          identifiableName: generateBoxLabel(r, c),
          row: r,
          col: c,
          type: boxType,
          boxStatus: 'EMPTY_CLOSED',
          port: r * cols + c,
        });
      }
    }
    await Box.insertMany(boxDocs, { session });
    // Promote terminal to ACTIVE now that layout is fully configured
    await Terminal.findByIdAndUpdate(id, { status: TERMINAL_STATUSES.ACTIVE }, { session });
    await session.commitTransaction();

    res.status(201).json({ success: true, data: { terminalMetaData: metaData[0], boxCount: maxPorts } });
  } catch (err) {
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }
});

const getTerminals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, siteId, status } = req.query;
  const filter = {};
  if (siteId) {
    if (!validateObjectId(siteId)) {
      return res.status(400).json({ success: false, message: 'Invalid siteId format' });
    }
    filter.siteId = siteId;
  }
  if (status) filter.status = status;

  const { skip, limit: lim } = paginateQuery(page, limit);
  const [total, data] = await Promise.all([
    Terminal.countDocuments(filter),
    Terminal.find(filter).populate('siteId', 'name state').skip(skip).limit(lim).sort({ createdAt: -1 }),
  ]);

  res.json({ success: true, total, page: Number(page), limit: lim, data });
});

const getTerminalById = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const [terminal, metaData] = await Promise.all([
    Terminal.findById(req.params.id).populate('siteId', 'name state'),
    TerminalMetaData.findOne({ terminalId: req.params.id }),
  ]);
  if (!terminal) return res.status(404).json({ success: false, message: 'Terminal not found' });
  res.json({ success: true, data: { ...terminal.toObject(), metaData } });
});

const updateTerminal = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const allowed = ['identifiableName', 'description', 'physicalLocation', 'status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (updates.status && !Object.values(TERMINAL_STATUSES).includes(updates.status)) {
    return res.status(400).json({ success: false, message: 'status must be one of: ' + Object.values(TERMINAL_STATUSES).join(', ') });
  }
  const terminal = await Terminal.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!terminal) return res.status(404).json({ success: false, message: 'Terminal not found' });
  res.json({ success: true, data: terminal });
});

const updateLayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validateObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const { layoutType = LAYOUT_TYPES.FIVEBYFOUR, gatewayIdRef, pricingId, skipPayment, boxType = 'MEDIUM' } = req.body;
  if (!LAYOUT_DIMENSIONS[layoutType]) {
    return res.status(400).json({ success: false, message: 'layoutType must be one of: ' + Object.keys(LAYOUT_DIMENSIONS).join(', ') });
  }

  const bookedCount = await Box.countDocuments({ terminalId: id, boxStatus: 'BOOKED' });
  if (bookedCount > 0) {
    return res.status(409).json({ success: false, message: 'Cannot resize layout with BOOKED boxes' });
  }

  const { rows, cols } = LAYOUT_DIMENSIONS[layoutType];
  const maxPorts = rows * cols;

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    await Box.deleteMany({ terminalId: id }, { session });

    const updateFields = { layoutType, maxPorts };
    if (gatewayIdRef) updateFields.gatewayIdRef = gatewayIdRef;
    if (pricingId) updateFields.pricingId = pricingId;
    if (skipPayment !== undefined) updateFields.skipPayment = skipPayment;

    const metaData = await TerminalMetaData.findOneAndUpdate(
      { terminalId: id },
      updateFields,
      { new: true, session }
    );

    const boxDocs = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        boxDocs.push({
          terminalId: id,
          terminalMetaDataId: metaData._id,
          identifiableName: generateBoxLabel(r, c),
          row: r,
          col: c,
          type: boxType,
          boxStatus: 'EMPTY_CLOSED',
          port: r * cols + c,
        });
      }
    }
    await Box.insertMany(boxDocs, { session });
    await session.commitTransaction();

    res.json({ success: true, data: { terminalMetaData: metaData, boxCount: maxPorts } });
  } catch (err) {
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }
});

module.exports = { createTerminal, setupLayout, getTerminals, getTerminalById, updateTerminal, updateLayout };
