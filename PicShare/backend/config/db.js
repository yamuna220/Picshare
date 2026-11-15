const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  };

  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Connected to database');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database');
  });

  await mongoose.connect(env.MONGO_URI, options);
  return mongoose.connection;
};

const disconnectDatabase = async () => {
  await mongoose.connection.close();
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
