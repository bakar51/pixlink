/**
 * routes/redirect.js — GET /i/:code
 *
 * The core short-link redirect handler.
 *
 * Flow:
 *  1. Look up the code in DynamoDB
 *  2. If not found → 404 HTML page
 *  3. If found but expired → 410 HTML page ("This link has expired")
 *  4. If valid → increment view counter (fire-and-forget) → 302 redirect to image URL
 *
 * The view counter increment is intentionally not awaited in the redirect
 * path — we don't want a slow DynamoDB call to delay the user's redirect.
 */

'use strict';

const { Router } = require('express');
const { getItem, incrementViews } = require('../services/dynamo');
const { getPublicUrl }            = require('../services/s3');

const router = Router();

// ── Inline HTML templates for error states ────────────────────────────────────
// Kept here (not in separate files) to keep the project structure simple.
// These pages intentionally match the app's minimal visual style.

/**
 * expiredPage(code)
 * Returns a self-contained HTML page for expired links (410 Gone).
 */
function expiredPage(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired — PixLink</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: #111214;
      color: #e8e9eb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      text-align: center;
    }
    .card {
      background: #1c1e21;
      border: 1px solid #2c2e33;
      border-radius: 12px;
      padding: 2.5rem 3rem;
      max-width: 420px;
      width: 100%;
    }
    .label {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a8c93;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e8e9eb;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    p {
      font-size: 0.9375rem;
      color: #8a8c93;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.875rem;
      color: #5b76f5;
      background: rgba(91,118,245,0.1);
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
    a {
      display: inline-block;
      padding: 0.625rem 1.5rem;
      background: #3d5af1;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: background 150ms ease;
    }
    a:hover { background: #2d47d6; }
  </style>
</head>
<body>
  <div class="card">
    <p class="label">PixLink</p>
    <h1>This link has expired</h1>
    <p>
      The image at <code>/i/${code}</code> was set to expire and is no longer available.
      The original uploader can re-upload the image to get a new link.
    </p>
    <a href="/">Upload a new image</a>
  </div>
</body>
</html>`;
}

/**
 * notFoundPage(code)
 * Returns a self-contained HTML page for unknown short-codes (404).
 */
function notFoundPage(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not Found — PixLink</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: #111214;
      color: #e8e9eb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      text-align: center;
    }
    .card {
      background: #1c1e21;
      border: 1px solid #2c2e33;
      border-radius: 12px;
      padding: 2.5rem 3rem;
      max-width: 420px;
      width: 100%;
    }
    .label {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a8c93;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e8e9eb;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 0.9375rem;
      color: #8a8c93;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.875rem;
      color: #5b76f5;
      background: rgba(91,118,245,0.1);
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
    a {
      display: inline-block;
      padding: 0.625rem 1.5rem;
      background: #3d5af1;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: background 150ms ease;
    }
    a:hover { background: #2d47d6; }
  </style>
</head>
<body>
  <div class="card">
    <p class="label">PixLink</p>
    <h1>Link not found</h1>
    <p>
      No image was found at <code>/i/${code}</code>.
      The link may have been mistyped or was never created.
    </p>
    <a href="/">Upload an image</a>
  </div>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    // Fetch the record from DynamoDB
    const item = await getItem(code);

    // Unknown code → 404
    if (!item) {
      return res.status(404).send(notFoundPage(code));
    }

    // Check expiry
    const expired =
      item.expiresAt !== 'never' && new Date(item.expiresAt) < new Date();

    if (expired) {
      return res.status(410).send(expiredPage(code));
    }

    // Increment view counter — fire-and-forget so it doesn't slow the redirect
    incrementViews(code).catch((err) =>
      console.error(`[redirect] Failed to increment views for ${code}:`, err.message)
    );

    // Build the image URL and redirect
    const imageUrl = getPublicUrl(item.s3Key);
    return res.redirect(302, imageUrl);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
