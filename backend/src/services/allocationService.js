const Box = require('../models/Box');
const Order = require('../models/Order');
const { BOX_STATUSES, ORDER_STATUSES } = require('../config/constants');

// Generate order ID like PU-2025-001234
const generateOrderId = () => {
  const ts = Date.now().toString().slice(-6);
  return `PU-${new Date().getFullYear()}-${ts}`;
};

// Generate 4-digit access code
const generateAccessCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Get all terminals with available boxes
exports.getAvailableTerminals = async () => {
  const terminals = await Box.aggregate([
    { $match: { boxStatus: BOX_STATUSES.EMPTY_CLOSED } },
    { $group: {
        _id: '$terminalId',
        availableCount: { $sum: 1 }
    }},
    { $lookup: {
        from: 'terminals',
        localField: '_id',
        foreignField: '_id',
        as: 'terminal'
    }},
    { $unwind: '$terminal' },
    { $match: { 'terminal.status': 'ACTIVE' } },
    { $project: {
        terminalId: '$_id',
        availableCount: 1,
        terminalName: '$terminal.identifiableName',
        location: '$terminal.physicalLocation'
    }}
  ]);
  return terminals;
};

// Get all boxes for a terminal with their status
exports.getTerminalLayout = async (terminalId) => {
  const boxes = await Box.find({ terminalId })
    .select('identifiableName type boxStatus row col port')
    .sort({ row: 1, col: 1 });
  return boxes;
};

// CORE FUNCTION — create order without blocking the box.
// Box is only atomically reserved at payment time, so abandoning the payment
// page never leaves a box permanently blocked.
exports.allocateChosenBox = async (userId, boxId, phoneNumber, durationHours = 1, slotPrice = 0, source = 'WEB') => {
  // Validate box exists and appears available (non-atomic, for early feedback only).
  // The real atomic reservation happens in makePayment.
  const box = await Box.findById(boxId);
  if (!box) throw new Error('Box not found.');
  if (box.boxStatus !== BOX_STATUSES.EMPTY_CLOSED) {
    throw new Error('Box is no longer available. Please select another.');
  }

  const accessCode = generateAccessCode();
  const expiryTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  const paymentExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min to complete payment

  const order = await Order.create({
    orderId: generateOrderId(),
    userId,
    terminalId: box.terminalId,
    boxId: box._id,
    status: ORDER_STATUSES.RESERVED,
    accessCode,
    expiryTime,
    phoneNumber,
    boxName: box.identifiableName,
    durationHours,
    slotPrice,
    source,
    paymentExpiry,
    pickupWindow: `${durationHours} hour${durationHours > 1 ? 's' : ''}`
  });

  return { order, box, accessCode };
};

// Release box back to available (after completion or cancellation)
exports.releaseBox = async (boxId) => {
  await Box.findByIdAndUpdate(boxId, {
    boxStatus: BOX_STATUSES.EMPTY_CLOSED
  });
};

// Get pricing for a terminal
exports.getTerminalPricing = async (terminalId) => {
  const TerminalMetaData = require('../models/TerminalMetaData');
  const Pricing = require('../models/Pricing');

  const meta = await TerminalMetaData.findOne({ terminalId });
  if (!meta || !meta.pricingId) {
    // Default pricing if none set
    return { SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 };
  }

  const pricing = await Pricing.findById(meta.pricingId);
  if (!pricing) return { SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 };

  try {
    const parsed = JSON.parse(pricing.config);
    return parsed.rates || { SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 };
  } catch {
    return { SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 };
  }
};