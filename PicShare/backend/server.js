const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/db');

let server;

const startServer = async () => {
  try {
    await connectDatabase();

    server = http.createServer(app);

    server.listen(env.PORT, '0.0.0.0', () => {
      console.log(
        `[PicShare API] Running in ${env.NODE_ENV} mode on port ${env.PORT}`
      );
    });
  } catch (err) {
    console.error('[PicShare API] Failed to start server:', err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n[PicShare API] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
