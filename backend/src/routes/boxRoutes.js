const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const c = require('../controllers/boxController');

router.get('/terminal/:terminalId', protect, c.getTerminalLayout);
router.get('/:id', protect, c.getBoxById);
router.put('/:id/status', protect, adminOnly, c.updateBoxStatus);

module.exports = router;
