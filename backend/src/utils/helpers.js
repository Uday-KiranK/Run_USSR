const mongoose = require('mongoose');
const { ROW_LABELS } = require('../config/constants');

const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const generateBoxLabel = (rowIndex, colIndex) => `${ROW_LABELS[rowIndex]}-${colIndex + 1}`;

const paginateQuery = (page = 1, limit = 20) => ({
  skip: (page - 1) * limit,
  limit: Number(limit),
});

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

module.exports = { asyncHandler, generateBoxLabel, paginateQuery, validateObjectId, generateOTP };
