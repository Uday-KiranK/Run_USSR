const Site = require('../models/Site');
const Terminal = require('../models/Terminal');
const { asyncHandler, paginateQuery, validateObjectId } = require('../utils/helpers');

// PDF Site fields: id, latitude, longitude, name, address, state, pincode
const createSite = asyncHandler(async (req, res) => {
  const { name, address, state, latitude, longitude, pincode } = req.body;
  if (!name || !address || !state) {
    return res.status(400).json({ success: false, message: 'name, address, and state are required' });
  }
  const site = await Site.create({ name, address, state, latitude, longitude, pincode });
  res.status(201).json({ success: true, data: site });
});

const getSites = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, state } = req.query;
  const filter = {};
  if (state) filter.state = state;

  const { skip, limit: lim } = paginateQuery(page, limit);
  const [total, data] = await Promise.all([
    Site.countDocuments(filter),
    Site.find(filter).skip(skip).limit(lim).sort({ createdAt: -1 }),
  ]);

  res.json({ success: true, total, page: Number(page), limit: lim, data });
});

const getSiteById = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const [site, terminalCount] = await Promise.all([
    Site.findById(req.params.id),
    Terminal.countDocuments({ siteId: req.params.id }),
  ]);
  if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
  res.json({ success: true, data: { ...site.toObject(), terminalCount } });
});

const updateSite = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const allowed = ['name', 'address', 'state', 'latitude', 'longitude', 'pincode'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const site = await Site.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
  res.json({ success: true, data: site });
});

const deleteSite = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const activeTerminals = await Terminal.countDocuments({ siteId: req.params.id, status: 'ACTIVE' });
  if (activeTerminals > 0) {
    return res.status(409).json({ success: false, message: 'Cannot delete site with ACTIVE terminals' });
  }
  const site = await Site.findByIdAndDelete(req.params.id);
  if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
  res.json({ success: true, message: 'Site deleted' });
});

module.exports = { createSite, getSites, getSiteById, updateSite, deleteSite };
