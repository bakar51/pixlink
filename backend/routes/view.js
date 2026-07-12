/**
 * routes/view.js — GET /api/view/:code
 *
 * Fetches image details and increments the view counter in one API call.
 */

'use strict';

const { Router } = require('express');
const { getItem, incrementViews } = require('../services/dynamo');
const { getPublicUrl }            = require('../services/s3');

const router = Router();

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    // Fetch the record from DynamoDB
    const item = await getItem(code);

    // Unknown code → 404
    if (!item) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Check expiry
    const expired =
      item.expiresAt !== 'never' && new Date(item.expiresAt) < new Date();

    if (expired) {
      return res.status(410).json({ error: 'expired' });
    }

    // Increment view counter — fire-and-forget
    incrementViews(code).catch((err) =>
      console.error(`[view api] Failed to increment views for ${code}:`, err.message)
    );

    // Return the image details
    return res.status(200).json({
      viewUrl: getPublicUrl(item.s3Key),
      originalName: item.originalName,
      size: item.size,
      uploadedAt: item.uploadedAt,
      expiresAt: item.expiresAt,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
