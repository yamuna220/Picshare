const { User } = require('../models');
const { signAccessToken } = require('../services/tokenService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { serializeUser } = require('../utils/mediaUrl');
const {
  isValidEmail,
  isValidUsername,
  isValidPassword,
} = require('../utils/validators');

const register = asyncHandler(async (req, res) => {
  const rawEmail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const rawUsername =
    typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword =
    typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (!rawEmail || !rawUsername || !password || !confirmPassword) {
    throw new ApiError(400, 'Email, username, password, and confirm password are required.');
  }

  if (!isValidEmail(rawEmail)) {
    throw new ApiError(400, 'Please provide a valid email address.');
  }

  if (!isValidUsername(rawUsername)) {
    throw new ApiError(
      400,
      'Username must be 3 to 30 characters and contain only letters, numbers, periods, or underscores.'
    );
  }

  if (!isValidPassword(password)) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, 'Password and confirmation password do not match.');
  }

  const existingEmail = await User.findOne({ email: rawEmail }).lean();
  if (existingEmail) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const existingUsername = await User.findOne({ username: rawUsername }).lean();
  if (existingUsername) {
    throw new ApiError(409, 'This username is already taken.');
  }

  const user = await User.create({
    email: rawEmail,
    username: rawUsername,
    password,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please log in.',
    data: {
      user: serializeUser(user, req, { includeEmail: true }),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const rawUsername =
    typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!rawUsername || !password) {
    throw new ApiError(400, 'Username and password are required.');
  }

  const user = await User.findOne({ username: rawUsername }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  const token = signAccessToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Signed in successfully.',
    data: {
      token,
      user: serializeUser(user, req, { includeEmail: true }),
    },
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(req.user, req, { includeEmail: true }),
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const currentPassword =
    typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword =
    typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  const confirmNewPassword =
    typeof req.body.confirmNewPassword === 'string' ? req.body.confirmNewPassword : '';

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    throw new ApiError(
      400,
      'Current password, new password, and confirmation are required.'
    );
  }

  if (!isValidPassword(newPassword)) {
    throw new ApiError(400, 'New password must be at least 6 characters long.');
  }

  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, 'New password and confirmation do not match.');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from your current password.');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
  });
});

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword,
};
