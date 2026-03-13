const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const c = require('../controllers/siteController');

router.route('/')
  .get(protect, adminOnly, c.getSites)
  .post(protect, adminOnly, c.createSite);

router.route('/:id')
  .get(protect, adminOnly, c.getSiteById)
  .put(protect, adminOnly, c.updateSite)
  .delete(protect, adminOnly, c.deleteSite);

module.exports = router;
