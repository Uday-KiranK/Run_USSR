const Pricing = require('../models/Pricing');
const { asyncHandler, validateObjectId } = require('../utils/helpers');
const { BOX_TYPES } = require('../config/constants');

// PDF Pricing entity: { id, config (JSON string), createdAt, updatedAt, updatedBy, createdBy }
//
// Config JSON format we define (coordinate with Person A):
// {
//   "rates": { "SMALL": 20, "MEDIUM": 35, "LARGE": 50, "EXTRA_LARGE": 70 },
//   "currency": "THB"
// }

const createPricing = asyncHandler(async (req, res) => {
  const { rates, currency = 'THB', updatedBy } = req.body;
  if (!rates || typeof rates !== 'object') {
    return res.status(400).json({ success: false, message: 'rates object is required (e.g. { SMALL: 20, MEDIUM: 35, LARGE: 50, EXTRA_LARGE: 70 })' });
  }
  for (const [type, rate] of Object.entries(rates)) {
    if (!BOX_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid box type in rates: ' + type });
    }
    if (typeof rate !== 'number' || rate <= 0) {
      return res.status(400).json({ success: false, message: 'Rate for ' + type + ' must be a positive number' });
    }
  }
  const config = JSON.stringify({ rates, currency });
  const pricing = await Pricing.create({ config, createdBy: updatedBy, updatedBy });
  res.status(201).json({ success: true, data: { ...pricing.toObject(), parsedConfig: { rates, currency } } });
});

const getPricing = asyncHandler(async (req, res) => {
  const pricing = await Pricing.find().sort({ createdAt: -1 });
  const data = pricing.map((p) => {
    try {
      return { ...p.toObject(), parsedConfig: JSON.parse(p.config) };
    } catch {
      return p.toObject();
    }
  });
  res.json({ success: true, data });
});

const getLatestPricing = asyncHandler(async (req, res) => {
  const pricing = await Pricing.findOne().sort({ createdAt: -1 });
  if (!pricing) return res.status(404).json({ success: false, message: 'No pricing configured' });
  res.json({ success: true, data: { ...pricing.toObject(), parsedConfig: JSON.parse(pricing.config) } });
});

const updatePricing = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const pricing = await Pricing.findById(req.params.id);
  if (!pricing) return res.status(404).json({ success: false, message: 'Pricing not found' });

  const existing = JSON.parse(pricing.config);
  const { rates, currency, updatedBy } = req.body;
  const merged = {
    rates: rates ? { ...existing.rates, ...rates } : existing.rates,
    currency: currency || existing.currency,
  };
  const updated = await Pricing.findByIdAndUpdate(
    req.params.id,
    { config: JSON.stringify(merged), updatedBy, updatedAt: new Date() },
    { new: true }
  );
  res.json({ success: true, data: { ...updated.toObject(), parsedConfig: merged } });
});

const deletePricing = asyncHandler(async (req, res) => {
  if (!validateObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  const pricing = await Pricing.findByIdAndDelete(req.params.id);
  if (!pricing) return res.status(404).json({ success: false, message: 'Pricing not found' });
  res.json({ success: true, message: 'Pricing deleted' });
});

module.exports = { createPricing, getPricing, getLatestPricing, updatePricing, deletePricing };
