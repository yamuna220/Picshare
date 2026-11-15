const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const configured = Array.isArray(env.CLIENT_URL) ? env.CLIENT_URL : [env.CLIENT_URL];
      const isAllowed =
        configured.includes(origin) ||
        /^https:\/\/picshare-client.*\.onrender\.com$/.test(origin) ||
        /^http:\/\/localhost:[0-9]+$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Deliberately do NOT mount express.static('/uploads') here.
// All uploaded post photos and avatars are served through authorized API media routes.

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
