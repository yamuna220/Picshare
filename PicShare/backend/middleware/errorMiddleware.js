const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Image exceeds the 5 MB maximum upload size.';
    } else {
      message = `File upload error: ${err.message}`;
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.code === 11000) {
    statusCode = 409;
    const duplicateFields = err.keyValue ? Object.keys(err.keyValue) : ['field'];
    message = `Duplicate value for ${duplicateFields.join(', ')}.`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format for ${err.path}.`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
  }

  const payload = {
    success: false,
    message,
  };

  if (details) {
    payload.details = details;
  }

  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
