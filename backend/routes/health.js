/**
 * routes/health.js — GET /api/health
 *
 * Simple health-check endpoint used by uptime monitors (UptimeRobot, etc.)
 * and the PM2 process check. Returns HTTP 200 with a JSON status object.
 */

'use strict';

const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    ts:     new Date().toISOString(),
  });
});

module.exports = router;
