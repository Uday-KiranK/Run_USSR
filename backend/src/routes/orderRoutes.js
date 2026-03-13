const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getTerminals,
  getLayout,
  bookBox,
  makePayment,
  setPin,
  completePickup,
  cancelOrder,
  getMyOrders,
  getOrder
} = require('../controllers/orderController');

router.get('/terminals', getTerminals);
router.get('/terminals/:terminalId/layout', getLayout);
router.post('/book', protect, bookBox);
router.post('/pay/:orderId', protect, makePayment);
router.post('/set-pin/:orderId', protect, setPin);
router.post('/pickup/:orderId', protect, completePickup);
router.post('/cancel/:orderId', protect, cancelOrder);
router.get('/my', protect, getMyOrders);
router.get('/:orderId', protect, getOrder);

module.exports = router;