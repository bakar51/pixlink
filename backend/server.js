/**
 * server.js — PixLink Express entry point
 *
 * Responsibilities:
 *  - Load environment variables
 *  - Configure middleware (CORS, Helmet, JSON body parsing)
 *  - Register route handlers
 *  - Start the HTTP server
 */

'use strict';

// Load .env before anything else so all modules see the variables
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');

// Route handlers
const healthRouter   = require('./routes/health');
const uploadRouter   = require('./routes/upload');
const statsRouter    = require('./routes/stats');
const viewRouter     = require('./routes/view');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security headers ──────────────────────────────────────────────────────────
// Helmet sets sensible HTTP security headers (X-Content-Type-Options, etc.)
// crossOriginResourcePolicy is relaxed so images are accessible from any origin.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// In development the frontend runs on localhost:5173 (Vite dev server).
// In production set ALLOWED_ORIGIN to the EC2 IP (http://13.60.220.175).
// Multiple origins are supported via comma-separated values in ALLOWED_ORIGIN.
const rawOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigin.split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST'],
  })
);

// ── JSON body parsing ─────────────────────────────────────────────────────────
// Multipart (file uploads) is handled by multer inside the upload route,
// so we only need JSON here for potential future endpoints.
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/stats',  statsRouter);
app.use('/api/view',   viewRouter);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches any error passed via next(err) in route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[PixLink API] Listening on port ${PORT}`);
  console.log(`[PixLink API] CORS origin: ${allowedOrigin}`);
});
