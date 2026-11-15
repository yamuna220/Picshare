const { User } = require('../models');
const { verifyAccessToken } = require('../services/tokenService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new ApiError(401, 'Authentication required. Please sign in.'));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired authentication token.'));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError(401, 'User account no longer exists.'));
  }

  req.user = user;
  return next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }

  return next();
});

module.exports = {
  protect,
  optionalAuth,
};
