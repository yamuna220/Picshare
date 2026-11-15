const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/;

const isValidEmail = (email) => {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
};

const isValidUsername = (username) => {
  return typeof username === 'string' && USERNAME_REGEX.test(username.trim());
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

module.exports = {
  EMAIL_REGEX,
  USERNAME_REGEX,
  isValidEmail,
  isValidUsername,
  isValidObjectId,
  isValidPassword,
};
