/**
 * routes/stats.js — GET /api/stats/:code
 *
 * Returns metadata and view count for a given short-code.
 * Used by the frontend to display stats on the result card.
 *
 * Response shape:
 *  200 { code, views, uploadedAt, expiresAt, expired }
 *  404 { error: string }
 */

'use strict';

const { Router } = require('express');
const { getStats } = require('../services/dynamo');

const router = Router();

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    // Look up the record in DynamoDB
    const item = await getStats(code);

    if (!item) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    // Determine whether the link has expired
    const expired =
      item.expiresAt !== 'never' && new Date(item.expiresAt) < new Date();

    return res.status(200).json({
      code:       item.code,
      views:      item.views  || 0,
      uploadedAt: item.uploadedAt,
      expiresAt:  item.expiresAt,
      expired,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
