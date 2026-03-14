const Box = require('../models/Box');
const Order = require('../models/Order');
const Terminal = require('../models/Terminal');
const mongoose = require('mongoose');
const { validateObjectId } = require('../utils/helpers');
const {
  getAvailableTerminals,
  getTerminalLayout,
  allocateChosenBox,
  releaseBox,
  getTerminalPricing
} = require('../services/allocationService');
  const TerminalMetaData = require('../models/TerminalMetaData');

// GET /api/orders/terminals
exports.getTerminals = async (req, res) => {
  try {
    const terminals = await getAvailableTerminals();
    res.json({ terminals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/terminals/:terminalId/layout
exports.getLayout = async (req, res) => {
  try {
    const { terminalId } = req.params;
    if (!validateObjectId(terminalId))
      return res.status(400).json({ message: 'Invalid terminal ID' });

    const [boxes, terminal] = await Promise.all([
      getTerminalLayout(terminalId),
      Terminal.findById(terminalId).select('identifiableName physicalLocation')
    ]);

    if (!boxes.length)
      return res.status(404).json({ message: 'No boxes found for this terminal' });

    res.json({
      terminalId,
      boxes,
      terminalName: terminal?.identifiableName || '',
      terminalLocation: terminal?.physicalLocation || ''
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/terminals/:terminalId/pricing
exports.getTerminalPricingInfo = async (req, res) => {
  try {
    const { terminalId } = req.params;
    if (!validateObjectId(terminalId))
      return res.status(400).json({ message: 'Invalid terminal ID' });

    const rates = await getTerminalPricing(terminalId);
    const slots = [1, 2, 3, 6, 12];

    res.json({ terminalId, rates, slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/book
exports.bookBox = async (req, res) => {
  try {
    const { boxId, durationHours = 1, source = 'WEB' } = req.body;
    const userId = req.user.userId || req.user._id;
    const phoneNumber = req.user.phone;

    if (!boxId) return res.status(400).json({ message: 'boxId is required' });
    if (!validateObjectId(boxId))
      return res.status(400).json({ message: 'Invalid box ID' });

    const validSlots = [1, 2, 3, 6, 12];
    if (!validSlots.includes(Number(durationHours)))
      return res.status(400).json({ message: 'Invalid duration. Choose from 1, 2, 3, 6, or 12 hours.' });

    const box = await Box.findById(boxId).populate('terminalId');
    if (!box) return res.status(404).json({ message: 'Box not found' });

    if (box.terminalId.status !== 'ACTIVE')
      return res.status(400).json({ message: 'Terminal is not active' });

    // Calculate price based on box type and duration
    const rates = await getTerminalPricing(box.terminalId._id);
    const ratePerHour = rates[box.type] || 30;
    const slotPrice = ratePerHour * Number(durationHours);

    const result = await allocateChosenBox(userId, boxId, phoneNumber, Number(durationHours), slotPrice, source);

    res.status(201).json({
      message: 'Box selected! Please complete payment to confirm.',
      orderId: result.order.orderId,
      boxName: result.box.identifiableName,
      boxType: result.box.type,
      durationHours: Number(durationHours),
      ratePerHour,
      status: result.order.status,
      amountDue: slotPrice
    });
  } catch (error) {
    console.error(error);
    res.status(409).json({ message: error.message });
  }
};

// POST /api/orders/pay/:orderId
exports.makePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId || req.user._id;
    const phone = req.user.phone;
    const now = new Date();

    // Find and validate the order
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const ownsOrder =
      order.userId.toString() === userId.toString() ||
      (phone && order.phoneNumber === phone); // fallback for orders not yet migrated
    if (!ownsOrder) return res.status(403).json({ message: 'Not your order' });
    if (order.paymentDone) return res.status(409).json({ message: 'Payment already processed' });
    if (order.status !== 'RESERVED') return res.status(400).json({ message: 'Order is not payable' });

    if (order.paymentExpiry && order.paymentExpiry < now) {
      await Order.findOneAndUpdate({ orderId }, { $set: { status: 'EXPIRED' } });
      return res.status(410).json({ message: 'Payment window expired. Please book again.' });
    }

    // ATOMIC: Reserve the box now — this is the point where the box gets blocked.
    // If two users race to pay for the same box, only the first succeeds here.
    const reservedBox = await Box.findOneAndUpdate(
      { _id: order.boxId, boxStatus: 'EMPTY_CLOSED' },
      { $set: { boxStatus: 'BOOKED' } },
      { new: true }
    );

    if (!reservedBox) {
      // Box was just taken by another user who paid first — cancel this order
      await Order.findOneAndUpdate({ orderId }, { $set: { status: 'CANCELLED' } });
      return res.status(409).json({
        message: 'This box was just taken by someone else. Please go back and select a different box.'
      });
    }

    // Mark payment complete
    await Order.findOneAndUpdate({ orderId }, { $set: { paymentDone: true } });

    res.json({
      message: 'Payment successful! Please set your PIN.',
      orderId: order.orderId,
      boxName: order.boxName,
      durationHours: order.durationHours,
      status: order.status,
      amountPaid: order.slotPrice
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/orders/set-pin/:orderId
exports.setPin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId || req.user._id;

    if (!pin) return res.status(400).json({ message: 'PIN is required' });
    if (pin.length !== 4 || isNaN(pin))
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' });

    const phone = req.user.phone;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const ownsOrder =
      order.userId.toString() === userId.toString() ||
      (phone && order.phoneNumber === phone); // fallback for orders not yet migrated
    if (!ownsOrder) return res.status(403).json({ message: 'Not your order' });
    if (!order.paymentDone)
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

// POST /api/orders/pickup/:orderId
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

// POST /api/orders/cancel/:orderId
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId || req.user._id;
    const phone = req.user.phone;
    const isAdmin = req.user.role === 'ADMIN';

    const order = await Order.findOne({ orderId });
    if (!order)
      return res.status(404).json({ message: 'Order not found' });

    const ownsOrder =
      isAdmin ||
      order.userId.toString() === userId.toString() ||
      (phone && order.phoneNumber === phone);

    if (!ownsOrder)
      return res.status(403).json({ message: 'Not your order' });

    if (order.status === 'COMPLETED')
      return res.status(400).json({ message: 'Cannot cancel completed order' });

    order.status = 'CANCELLED';
    await order.save();

    // Only release the box if payment was completed (box was actually BOOKED).
    // If unpaid, box was never blocked so nothing to release.
    if (order.paymentDone) {
      await releaseBox(order.boxId);
    }

    res.json({ message: 'Order cancelled. Box is now available.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/my
exports.getMyOrders = async (req, res) => {
  try {
    const phone = req.user.phone;

    if (!phone) return res.status(401).json({ message: 'Not authenticated' });

    // Filter strictly by the verified phone number — phone is the ground truth in
    // OTP-based auth and is stored on every order at booking time.
    const orders = await Order.find({ phoneNumber: phone })
      .populate('userId', 'phoneNumber name email')
      .populate('boxId', 'identifiableName type row col')
      .populate('terminalId', 'identifiableName physicalLocation')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/all  (admin — all orders)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('boxId', 'identifiableName type row col')
      .populate('terminalId', 'identifiableName physicalLocation')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/:orderId
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId || req.user._id;
    const phone = req.user.phone;
    const isAdmin = req.user.role === 'ADMIN';

    const order = await Order.findOne({ orderId })
      .populate('boxId', 'identifiableName type row col')
      .populate('terminalId', 'identifiableName physicalLocation');

    if (!order)
      return res.status(404).json({ message: 'Order not found' });

    const ownsOrder =
      isAdmin ||
      order.userId.toString() === userId.toString() ||
      (phone && order.phoneNumber === phone);

    if (!ownsOrder)
      return res.status(403).json({ message: 'Not your order' });

    res.json({ order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};