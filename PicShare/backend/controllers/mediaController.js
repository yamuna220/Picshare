const fs = require('fs');
const path = require('path');
const { Post } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { canViewUserContent } = require('../middleware/authorizationMiddleware');

const serveProfilePicture = asyncHandler(async (req, res) => {
  const safeName = path.basename(req.params.filename || '');
  if (!safeName) {
    throw new ApiError(400, 'Invalid filename.');
  }

  const filePath = path.join(env.UPLOAD_ROOT, 'profiles', safeName);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Profile picture not found.');
  }

  res.sendFile(filePath);
});

const servePostImage = asyncHandler(async (req, res) => {
  const safeName = path.basename(req.params.filename || '');
  if (!safeName) {
    throw new ApiError(400, 'Invalid filename.');
  }

  const post = await Post.findOne({ imagePath: safeName }).populate('author');
  if (!post) {
    throw new ApiError(404, 'Post image not found.');
  }

  const allowed = await canViewUserContent(req.user, post.author);
  if (!allowed) {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required to view this photograph.');
    }
    throw new ApiError(403, 'You do not have permission to view this photograph.');
  }

  const filePath = path.join(env.UPLOAD_ROOT, 'posts', safeName);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Photograph file missing on server.');
  }

  res.sendFile(filePath);
});

module.exports = {
  serveProfilePicture,
  servePostImage,
};
