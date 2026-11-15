const mongoose = require('mongoose');

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const getHealthStatus = (req, res) => {
  const dbStateCode = mongoose.connection.readyState;

  res.status(200).json({
    success: true,
    service: 'PicShare API',
    timestamp: new Date().toISOString(),
    database: {
      status: READY_STATES[dbStateCode] || 'unknown',
      readyState: dbStateCode,
    },
  });
};

module.exports = {
  getHealthStatus,
};
