const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const c = require('../controllers/terminalController');

router.route('/')
  .get(protect, adminOnly, c.getTerminals)
  .post(protect, adminOnly, c.createTerminal);

router.route('/:id')
  .get(protect, adminOnly, c.getTerminalById)
  .put(protect, adminOnly, c.updateTerminal);

router.route('/:id/layout')
  .post(protect, adminOnly, c.setupLayout)
  .put(protect, adminOnly, c.updateLayout);

module.exports = router;
