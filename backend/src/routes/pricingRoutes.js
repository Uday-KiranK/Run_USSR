const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const c = require('../controllers/pricingController');

router.route('/')
  .get(protect, c.getPricing)
  .post(protect, adminOnly, c.createPricing);

router.get('/latest', protect, c.getLatestPricing);

router.route('/:id')
  .put(protect, adminOnly, c.updatePricing)
  .delete(protect, adminOnly, c.deletePricing);

module.exports = router;
