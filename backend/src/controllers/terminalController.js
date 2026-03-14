const mongoose = require('mongoose');
const Terminal = require('../models/Terminal');
const TerminalMetaData = require('../models/TerminalMetaData');
const Box = require('../models/Box');
const Order = require('../models/Order');
const Site = require('../models/Site');
const { asyncHandler, generateBoxLabel, paginateQuery, validateObjectId } = require('../utils/helpers');
const { LAYOUT_TYPES, LAYOUT_DIMENSIONS, TERMINAL_STATUSES, BOX_TYPES, ROW_LABELS } = require('../config/constants');

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

  const {
    rows: customRows,
    cols: customCols,
    layoutType,
    defaultType = 'MEDIUM',
    boxes: boxConfig = [],
    gatewayIdRef,
    pricingId,
    skipPayment = false,
  } = req.body;

  // Resolve dimensions — custom rows/cols take priority over preset layoutType
  let rows, cols, resolvedLayoutType;
  if (customRows || customCols) {
    rows = parseInt(customRows);
    cols = parseInt(customCols);
    resolvedLayoutType = LAYOUT_TYPES.CUSTOM;
  } else if (layoutType && LAYOUT_DIMENSIONS[layoutType]) {
    ({ rows, cols } = LAYOUT_DIMENSIONS[layoutType]);
    resolvedLayoutType = layoutType;
  } else {
    ({ rows, cols } = LAYOUT_DIMENSIONS[LAYOUT_TYPES.FIVEBYFOUR]);
    resolvedLayoutType = LAYOUT_TYPES.FIVEBYFOUR;
  }

  if (!rows || !cols || rows < 1 || cols < 1 || rows > ROW_LABELS.length || cols > 20) {
    return res.status(400).json({ success: false, message: `rows must be 1–${ROW_LABELS.length} and cols must be 1–20` });
  }
  if (!BOX_TYPES.includes(defaultType)) {
    return res.status(400).json({ success: false, message: 'defaultType must be one of: ' + BOX_TYPES.join(', ') });
  }

  // Validate per-box overrides and build a lookup map
  const boxTypeMap = {};
  for (const b of boxConfig) {
    if (b.row < 0 || b.row >= rows || b.col < 0 || b.col >= cols) {
      return res.status(400).json({ success: false, message: `Box config at (${b.row}, ${b.col}) is out of bounds for a ${rows}×${cols} layout` });
    }
    if (!BOX_TYPES.includes(b.type)) {
      return res.status(400).json({ success: false, message: `Invalid box type "${b.type}" — must be one of: ${BOX_TYPES.join(', ')}` });
    }
    boxTypeMap[`${b.row}-${b.col}`] = b.type;
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

  const maxPorts = rows * cols;

  // NOTE: transactions confirmed working — project uses MongoDB Atlas
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const metaData = await TerminalMetaData.create(
      [{ terminalId: id, layoutType: resolvedLayoutType, rows, columns: cols, maxPorts, gatewayIdRef, pricingId, skipPayment, enabled: true }],
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
          type: boxTypeMap[`${r}-${c}`] || defaultType,
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

  const {
    rows: customRows,
    cols: customCols,
    layoutType,
    defaultType = 'MEDIUM',
    boxes: boxConfig = [],
    gatewayIdRef,
    pricingId,
    skipPayment,
  } = req.body;

  // Resolve dimensions — same logic as setupLayout
  let rows, cols, resolvedLayoutType;
  if (customRows || customCols) {
    rows = parseInt(customRows);
    cols = parseInt(customCols);
    resolvedLayoutType = LAYOUT_TYPES.CUSTOM;
  } else if (layoutType && LAYOUT_DIMENSIONS[layoutType]) {
    ({ rows, cols } = LAYOUT_DIMENSIONS[layoutType]);
    resolvedLayoutType = layoutType;
  } else {
    ({ rows, cols } = LAYOUT_DIMENSIONS[LAYOUT_TYPES.FIVEBYFOUR]);
    resolvedLayoutType = LAYOUT_TYPES.FIVEBYFOUR;
  }

  if (!rows || !cols || rows < 1 || cols < 1 || rows > ROW_LABELS.length || cols > 20) {
    return res.status(400).json({ success: false, message: `rows must be 1–${ROW_LABELS.length} and cols must be 1–20` });
  }
  if (!BOX_TYPES.includes(defaultType)) {
    return res.status(400).json({ success: false, message: 'defaultType must be one of: ' + BOX_TYPES.join(', ') });
  }

  // Validate per-box overrides and build lookup map
  const boxTypeMap = {};
  for (const b of boxConfig) {
    if (b.row < 0 || b.row >= rows || b.col < 0 || b.col >= cols) {
      return res.status(400).json({ success: false, message: `Box config at (${b.row}, ${b.col}) is out of bounds for a ${rows}×${cols} layout` });
    }
    if (!BOX_TYPES.includes(b.type)) {
      return res.status(400).json({ success: false, message: `Invalid box type "${b.type}" — must be one of: ${BOX_TYPES.join(', ')}` });
    }
    boxTypeMap[`${b.row}-${b.col}`] = b.type;
  }

  // Block resize if any box is actively booked or in use
  const activeCount = await Box.countDocuments({
    terminalId: id,
    boxStatus: { $in: ['BOOKED', 'OCCUPIED_OPEN', 'OCCUPIED_CLOSED', 'OPEN_REQUESTED'] },
  });
  if (activeCount > 0) {
    return res.status(409).json({ success: false, message: 'Cannot reconfigure layout while boxes are active or booked' });
  }

  const maxPorts = rows * cols;

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    await Box.deleteMany({ terminalId: id }, { session });

    const updateFields = { layoutType: resolvedLayoutType, rows, columns: cols, maxPorts };
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
          type: boxTypeMap[`${r}-${c}`] || defaultType,
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

const getTerminalMonitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validateObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  const [terminal, metaData, boxes] = await Promise.all([
    Terminal.findById(id).populate('siteId', 'name state'),
    TerminalMetaData.findOne({ terminalId: id }),
    Box.find({ terminalId: id }).sort({ row: 1, col: 1 }),
  ]);

  if (!terminal) return res.status(404).json({ success: false, message: 'Terminal not found' });

  // Get active orders for all non-empty boxes
  const activeBoxIds = boxes
    .filter(b => !['EMPTY_CLOSED', 'DISABLED', 'CANCELLED'].includes(b.boxStatus))
    .map(b => b._id);

  const activeOrders = await Order.find({
    boxId: { $in: activeBoxIds },
    status: { $in: ['RESERVED', 'READY_FOR_PICKUP', 'IN_PROGRESS'] },
  }).select('boxId orderId phoneNumber status startTime expiryTime slotPrice pin');

  const orderByBox = {};
  activeOrders.forEach(o => { orderByBox[o.boxId.toString()] = o; });

  const enrichedBoxes = boxes.map(b => ({
    _id: b._id,
    identifiableName: b.identifiableName,
    row: b.row,
    col: b.col,
    type: b.type,
    boxStatus: b.boxStatus,
    order: orderByBox[b._id.toString()] || null,
  }));

  res.json({
    success: true,
    data: {
      terminal: { ...terminal.toObject(), metaData },
      boxes: enrichedBoxes,
      stats: {
        total: boxes.length,
        available: boxes.filter(b => b.boxStatus === 'EMPTY_CLOSED').length,
        booked: boxes.filter(b => b.boxStatus === 'BOOKED').length,
        occupied: boxes.filter(b => ['OCCUPIED_OPEN', 'OCCUPIED_CLOSED'].includes(b.boxStatus)).length,
        disabled: boxes.filter(b => ['DISABLED', 'CANCELLED', 'BLOCKED'].includes(b.boxStatus)).length,
      },
    },
  });
});

module.exports = { createTerminal, setupLayout, getTerminals, getTerminalById, updateTerminal, updateLayout, getTerminalMonitor };
