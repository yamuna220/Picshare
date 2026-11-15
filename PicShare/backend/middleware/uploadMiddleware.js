const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const createImageStorage = (subFolder) => {
  const targetDir = path.join(env.UPLOAD_ROOT, subFolder);
  ensureDirExists(targetDir);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirExists(targetDir);
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const randomToken = crypto.randomBytes(12).toString('hex');
      const timestamp = Date.now();
      cb(null, `${timestamp}-${randomToken}${ext}`);
    },
  });
};

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

  if (!isMimeValid || !isExtValid) {
    return cb(
      new ApiError(400, 'Only JPG, JPEG, and PNG image files are allowed.')
    );
  }

  return cb(null, true);
};

const uploadPostImage = multer({
  storage: createImageStorage('posts'),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
});

const uploadProfileImage = multer({
  storage: createImageStorage('profiles'),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
});

module.exports = {
  uploadPostImage,
  uploadProfileImage,
};
