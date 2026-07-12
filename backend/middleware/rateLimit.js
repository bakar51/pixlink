/**
 * middleware/rateLimit.js — Upload rate limiter
 *
 * Applied only to POST /api/upload to prevent abuse.
 * Configuration comes from environment variables so it can be tuned
 * without code changes.
 *
 * Default: 20 uploads per IP per 60 seconds.
 */

'use strict';

const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  // How long to remember requests for (in ms)
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,

  // Maximum number of requests per IP per window
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 20,

  // Message returned when limit is exceeded
  message: {
    error: 'Too many uploads from this IP. Please wait before trying again.',
  },

  // Use the standard 'RateLimit-*' headers (RFC 6585)
  standardHeaders: true,

  // Disable the legacy X-RateLimit-* headers
  legacyHeaders: false,
});

module.exports = { uploadLimiter };
