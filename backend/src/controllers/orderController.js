const Box = require('../models/Box');
const Order = require('../models/Order');
const Terminal = require('../models/Terminal');
const { validateObjectId } = require('../utils/helpers');
const {
  getAvailableTerminals,
  getTerminalLayout,
  allocateChosenBox,
  releaseBox
} = require('../services/allocationService');

// GET /api/orders/terminals — list all terminals with available boxes
exports.getTerminals = async (req, res) => {
  try {
    const terminals = await getAvailableTerminals();
    res.json({ terminals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/terminals/:terminalId/layout — view box layout
exports.getLayout = async (req, res) => {
  try {
    const { terminalId } = req.params;
    if (!validateObjectId(terminalId))
      return res.status(400).json({ message: 'Invalid terminal ID' });

    const boxes = await getTerminalLayout(terminalId);
    if (!boxes.length)
      return res.status(404).json({ message: 'No boxes found for this terminal' });

    res.json({ terminalId, boxes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/book — book a specific box
// POST /api/orders/book — select box + pay + set PIN in one flow
// POST /api/orders/book — select box, atomic reservation
exports.bookBox = async (req, res) => {
  try {
    const { boxId } = req.body;
    const userId = req.user.userId || req.user._id;
    const phoneNumber = req.user.phone;

    if (!boxId) return res.status(400).json({ message: 'boxId is required' });
    if (!validateObjectId(boxId))
      return res.status(400).json({ message: 'Invalid box ID' });

    const box = await Box.findById(boxId).populate('terminalId');
    if (!box) return res.status(404).json({ message: 'Box not found' });

    if (box.terminalId.status !== 'ACTIVE')
      return res.status(400).json({ message: 'Terminal is not active' });

    const result = await allocateChosenBox(userId, boxId, phoneNumber);

    res.status(201).json({
      message: 'Box selected! Please complete payment to confirm.',
      orderId: result.order.orderId,
      boxName: result.box.identifiableName,
      status: result.order.status,
      amountDue: 30
    });
  } catch (error) {
    console.error(error);
    res.status(409).json({ message: error.message });
  }
};

// POST /api/orders/pay/:orderId — dummy payment
exports.makePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId || req.user._id;

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'RESERVED')
      return res.status(400).json({ message: 'Order is not in RESERVED status' });
    if (order.userId.toString() !== userId.toString())
      return res.status(403).json({ message: 'Not your order' });

    // Dummy payment — always succeeds
    order.slotPrice = 30;
    await order.save();

    res.json({
      message: 'Payment successful! Please set your PIN.',
      orderId: order.orderId,
      boxName: order.boxName,
      status: order.status,
      amountPaid: 30
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/set-pin/:orderId — user sets PIN after payment
exports.setPin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId || req.user._id;

    if (!pin) return res.status(400).json({ message: 'PIN is required' });
    if (pin.length !== 4 || isNaN(pin))
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId.toString() !== userId.toString())
      return res.status(403).json({ message: 'Not your order' });
    if (!order.slotPrice)
      return res.status(400).json({ message: 'Payment not completed yet' });

    order.pin = pin;
    order.status = 'READY_FOR_PICKUP';
    await order.save();

    res.json({
      message: 'PIN set! Visit the terminal and enter your PIN to open your box.',
      orderId: order.orderId,
      boxName: order.boxName,
      instructions: `At the terminal, enter PIN ${pin} to open box ${order.boxName}`,
      expiryTime: order.expiryTime,
      status: order.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/complete/:orderId — complete pickup, release box
// POST /api/orders/pickup/:orderId — user enters PIN at terminal
exports.completePickup = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { pin } = req.body;

    if (!pin) return res.status(400).json({ message: 'PIN is required' });

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'READY_FOR_PICKUP')
      return res.status(400).json({ message: 'Order is not ready for pickup' });

    if (order.pin !== pin)
      return res.status(401).json({ message: 'Incorrect PIN. Try again.' });

    order.status = 'COMPLETED';
    order.endTime = new Date();
    await order.save();

    await releaseBox(order.boxId);

    res.json({
      message: '✅ PIN correct! Box is now open. Enjoy your pickup!',
      orderId: order.orderId,
      boxName: order.boxName,
      status: order.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/cancel/:orderId — cancel order, release box
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order)
      return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'COMPLETED')
      return res.status(400).json({ message: 'Cannot cancel completed order' });

    order.status = 'CANCELLED';
    await order.save();

    await releaseBox(order.boxId);

    res.json({ message: 'Order cancelled. Box is now available.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/my — get my orders
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const orders = await Order.find({ userId })
      .populate('boxId', 'identifiableName type row col')
      .populate('terminalId', 'identifiableName physicalLocation')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/:orderId — get single order details
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId })
      .populate('boxId', 'identifiableName type row col')
      .populate('terminalId', 'identifiableName physicalLocation');

    if (!order)
      return res.status(404).json({ message: 'Order not found' });

    res.json({ order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/ready/:orderId — admin marks order ready, reveals access code
