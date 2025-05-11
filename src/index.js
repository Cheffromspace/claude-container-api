require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { logger, createLogger } = require('./utils/logger');
const githubRoutes = require('./routes/github');
const claudeRoutes = require('./routes/claude');

const app = express();
const PORT = process.env.PORT || 3003;
const appLogger = createLogger('app');

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    appLogger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    }, `${req.method} ${req.url}`);
  });

  next();
});

// Middleware
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    // Store the raw body buffer for webhook signature verification
    req.rawBody = buf;
  }
}));

// Routes
app.use('/api/webhooks/github', githubRoutes);
app.use('/api/claude', claudeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  appLogger.error({
    err: {
      message: err.message,
      stack: err.stack
    },
    method: req.method,
    url: req.url
  }, 'Request error');

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  appLogger.info(`Server running on port ${PORT}`);
});
