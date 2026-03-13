const Pricing = require('../models/Pricing');

/**
 * Calculate total price for a booking.
 * Uses latest Pricing record's config JSON.
 *
 * Config format: { rates: { SMALL: 20, MEDIUM: 35, LARGE: 50, EXTRA_LARGE: 70 }, currency: "THB" }
 *
 * @param {string} boxType - 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
 * @param {Date} startTime
 * @param {Date} endTime
 * @returns {Promise<number>} total price
 */
const calculatePrice = async (boxType, startTime, endTime) => {
  const pricing = await Pricing.findOne().sort({ createdAt: -1 });
  if (!pricing || !pricing.config) {
    const err = new Error('No pricing configuration found');
    err.status = 404;
    throw err;
  }
  const config = JSON.parse(pricing.config);
  const ratePerHour = config.rates && config.rates[boxType];
  if (!ratePerHour) {
    const err = new Error('No pricing rate found for box type ' + boxType);
    err.status = 404;
    throw err;
  }
  const durationMs = new Date(endTime) - new Date(startTime);
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
  return ratePerHour * durationHours;
};

module.exports = { calculatePrice };
