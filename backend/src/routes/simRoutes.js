const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { simulateOpened } = require('../controllers/simController');

// Admin-only: simulate the IoT hardware confirming the box latch has opened
router.post('/box/:boxId/opened', protect, adminOnly, simulateOpened);

module.exports = router;
