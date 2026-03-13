const crypto = require('crypto');
const Order = require('../models/Order');
const Box = require('../models/Box');
const User = require('../models/User');
const Terminal = require('../models/Terminal');
const sendSMS = require('../services/smsService');
const { asyncHandler, validateObjectId, paginateQuery } = require('../utils/helpers');

// Generates a cryptographically secure 6-digit access code
const generateAccessCode = () => crypto.randomInt(100000, 999999).toString();

const generateOrderId = () => {
  const year = new Date().getFullYear();
  const suffix = crypto.randomInt(100000, 999999);
  return `PU-${year}-${suffix}`;
};

// POST /api/orders
// Admin or system creates a booking for a user.
// Body: { terminalId, boxId, phoneNumber }
// phoneNumber is used to look up the user and send them the access code via SMS.
const createOrder = asyncHandler(async (req, res) => {
  const { terminalId, boxId, phoneNumber } = req.body;

  if (!terminalId || !boxId || !phoneNumber) {
    return res.status(400).json({ success: false, message: 'terminalId, boxId, and phoneNumber are required' });
  }
  if (!validateObjectId(terminalId) || !validateObjectId(boxId)) {
    return res.status(400).json({ success: false, message: 'Invalid terminalId or boxId format' });
  }

  // Resolve user by phone
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    return res.status(404).json({ success: false, message: `No user found with phone ${phoneNumber}` });
  }

  // Validate terminal is active
  const terminal = await Terminal.findById(terminalId);
  if (!terminal || terminal.status !== 'ACTIVE') {
    return res.status(404).json({ success: false, message: 'Terminal not found or not active' });
  }

  // Validate box is available
  const box = await Box.findOne({ _id: boxId, terminalId });
  if (!box) {
    return res.status(404).json({ success: false, message: 'Box not found on this terminal' });
  }
  if (box.boxStatus !== 'EMPTY_CLOSED') {
    return res.status(409).json({ success: false, message: `Box is not available (current status: ${box.boxStatus})` });
  }

  const accessCode = generateAccessCode();
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create order and mark box as BOOKED atomically
  const order = await Order.create({
    orderId: generateOrderId(),
    userId: user._id,
    terminalId,
    boxId: box._id,
    status: 'READY_FOR_PICKUP',
    accessCode,
    phoneNumber,
    boxName: box.identifiableName,
    startTime: new Date(),
    expiryTime,
    pickupWindow: '24 hours',
  });

  await Box.findByIdAndUpdate(box._id, { boxStatus: 'BOOKED' });

  // Send access code to user via SMS (non-blocking — failure won't break the order)
  sendSMS(phoneNumber, `Your Cloakbe locker access code is: ${accessCode}. Valid for 24 hours. Box: ${box.identifiableName}`).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Order created. Access code sent via SMS.',
    data: {
      orderId: order.orderId,
      boxName: order.boxName,
      status: order.status,
      expiryTime: order.expiryTime,
      // Expose accessCode in response for demo purposes (remove in production)
      accessCode: order.accessCode,
    },
  });
});

// POST /api/orders/access
// Simulates the user typing their access code at the physical locker kiosk.
// No auth required — the kiosk is a public device.
// Body: { accessCode }
// On success: box → OCCUPIED_OPEN, order → IN_PROGRESS (admin sees this as "access mode")
const accessBox = asyncHandler(async (req, res) => {
  const { accessCode } = req.body;

  if (!accessCode) {
    return res.status(400).json({ success: false, message: 'accessCode is required' });
  }

  const order = await Order.findOne({ accessCode, status: 'READY_FOR_PICKUP' });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Invalid access code or order already used' });
  }

  if (order.expiryTime < new Date()) {
    await Order.findByIdAndUpdate(order._id, { status: 'EXPIRED' });
    await Box.findByIdAndUpdate(order.boxId, { boxStatus: 'EMPTY_CLOSED' });
    return res.status(410).json({ success: false, message: 'Access code has expired. Box has been released.' });
  }

  // Dispatch open command — hardware will confirm once the latch actuates
  await Box.findByIdAndUpdate(order.boxId, { boxStatus: 'OPEN_REQUESTED' });

  res.json({
    success: true,
    message: 'Open command dispatched. Awaiting hardware confirmation.',
    data: {
      orderId: order.orderId,
      boxName: order.boxName,
      status: order.status,
      boxStatus: 'OPEN_REQUESTED',
    },
  });
});

// POST /api/orders/:id/close
// User physically closes the box door after placing or retrieving items.
// Box: OCCUPIED_OPEN → OCCUPIED_CLOSED
const closeBox = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID format' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.status !== 'IN_PROGRESS') {
    return res.status(409).json({ success: false, message: `Cannot close box — order status is ${order.status}` });
  }

  const box = await Box.findById(order.boxId);
  if (!box || box.boxStatus !== 'OCCUPIED_OPEN') {
    return res.status(409).json({ success: false, message: 'Box is not currently open' });
  }

  await Box.findByIdAndUpdate(order.boxId, { boxStatus: 'OCCUPIED_CLOSED' });

  res.json({
    success: true,
    message: 'Box closed.',
    data: { orderId: order.orderId, boxName: order.boxName, boxStatus: 'OCCUPIED_CLOSED' },
  });
});

// POST /api/orders/:id/complete
// Simulates the user completing the pickup — box is released back to the pool.
// Box: OCCUPIED_CLOSED → EMPTY_CLOSED, Order: → COMPLETED
const completeOrder = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID format' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.status !== 'IN_PROGRESS') {
    return res.status(409).json({ success: false, message: `Cannot complete — order status is ${order.status}` });
  }

  const now = new Date();
  await Promise.all([
    Box.findByIdAndUpdate(order.boxId, { boxStatus: 'EMPTY_CLOSED' }),
    Order.findByIdAndUpdate(order._id, { status: 'COMPLETED', endTime: now }),
  ]);

  res.json({
    success: true,
    message: 'Order completed. Box released.',
    data: { orderId: order.orderId, boxName: order.boxName, status: 'COMPLETED', endTime: now },
  });
});

// GET /api/orders — Admin: list all orders with optional filters
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, terminalId, phoneNumber } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (terminalId) {
    if (!validateObjectId(terminalId)) return res.status(400).json({ success: false, message: 'Invalid terminalId' });
    filter.terminalId = terminalId;
  }
  if (phoneNumber) filter.phoneNumber = phoneNumber;

  const { skip, limit: lim } = paginateQuery(page, limit);
  const [total, data] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate('boxId', 'identifiableName boxStatus type')
      .populate('terminalId', 'identifiableName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim),
  ]);

  res.json({ success: true, total, page: Number(page), limit: lim, data });
});

// GET /api/orders/:id — Admin: get single order detail
const getOrderById = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID format' });
  }

  const order = await Order.findById(req.params.id)
    .populate('boxId', 'identifiableName boxStatus type row col')
    .populate('terminalId', 'identifiableName siteId')
    .populate('userId', 'phoneNumber name');

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  res.json({ success: true, data: order });
});

module.exports = { createOrder, accessBox, closeBox, completeOrder, getOrders, getOrderById };

