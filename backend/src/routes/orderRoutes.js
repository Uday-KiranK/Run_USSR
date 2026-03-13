const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const c = require('../controllers/orderController');

// Admin: view all orders
router.get('/', protect, adminOnly, c.getOrders);

// Admin: view single order
router.get('/:id', protect, adminOnly, c.getOrderById);

// Admin: create a booking for a user
router.post('/', protect, adminOnly, c.createOrder);

// Public (kiosk simulation): user types access code at the locker
router.post('/access', c.accessBox);

// Protected: close the box after opening
router.post('/:id/close', protect, c.closeBox);

// Protected: complete the order and release the box
router.post('/:id/complete', protect, c.completeOrder);

module.exports = router;
