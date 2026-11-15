const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const parseClientOrigins = (clientUrlStr) => {
  if (!clientUrlStr) return ['http://localhost:3000', 'http://localhost:4200'];
  const origins = clientUrlStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
};

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/picshare',
  JWT_SECRET: process.env.JWT_SECRET || 'picshare_development_secret_change_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: parseClientOrigins(process.env.CLIENT_URL),
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 5 * 1024 * 1024,
  UPLOAD_ROOT: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../uploads'),
};

module.exports = env;
