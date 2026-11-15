const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (userId) => {
  return jwt.sign({ id: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
