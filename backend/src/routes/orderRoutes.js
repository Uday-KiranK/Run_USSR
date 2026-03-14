const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getTerminals,
  getLayout,
  getTerminalPricingInfo,
  bookBox,
  makePayment,
  setPin,
  completePickup,
  cancelOrder,
  getMyOrders,
  getAllOrders,
  getOrder
} = require('../controllers/orderController');

router.get('/terminals', getTerminals);
router.get('/terminals/:terminalId/layout', getLayout);
router.get('/terminals/:terminalId/pricing', getTerminalPricingInfo);
router.post('/book', protect, bookBox);
router.post('/pay/:orderId', protect, makePayment);
router.post('/set-pin/:orderId', protect, setPin);
router.post('/pickup/:orderId', completePickup);
router.post('/cancel/:orderId', protect, cancelOrder);
router.get('/my', protect, getMyOrders);
router.get('/all', protect, adminOnly, getAllOrders);
router.get('/:orderId', protect, getOrder);

module.exports = router;