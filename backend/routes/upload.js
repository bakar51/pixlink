/**
 * routes/upload.js — POST /api/upload
 *
 * Accepts a multipart form upload with fields:
 *   - file   : the image binary (required)
 *   - expiry : one of "never" | "1d" | "7d" | "30d" (optional, default "never")
 *
 * Processing steps:
 *  1. Rate limit check (via middleware)
 *  2. Multer parses the multipart body and buffers the file in memory
 *  3. Validate MIME type (multer fileFilter) and file size
 *  4. Generate a unique 6-char short code
 *  5. Compute the S3 key and upload the file buffer
 *  6. Calculate expiry timestamp
 *  7. Write metadata to DynamoDB
 *  8. Return { code, shortUrl, viewUrl, originalName, size, uploadedAt }
 *
 * Response shape:
 *  200 { code, shortUrl, viewUrl, originalName, size, uploadedAt }
 *  400 { error: string }
 *  429 { error: string }   (from rate limiter)
 *  500 { error: string }
 */

'use strict';

const { Router } = require('express');
const multer     = require('multer');
const path       = require('path');

const { uploadLimiter }                    = require('../middleware/rateLimit');
const { multerFileFilter, validateFileSize } = require('../middleware/validate');
const { uploadToS3, getPublicUrl }         = require('../services/s3');
const { putItem }                          = require('../services/dynamo');
const { generateCode }                     = require('../utils/shortCode');

const router = Router();

// Multer config — store uploads in memory (Buffer), not on disk.
// limits.fileSize is the first line of defence against oversized uploads;
// it aborts the stream early so we never buffer a huge file.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 11 * 1024 * 1024 }, // 11 MB: slightly above our 10 MB limit
  fileFilter: multerFileFilter,
});

/**
 * computeExpiresAt(expiry)
 *
 * Converts the user's expiry choice into an ISO-8601 timestamp string,
 * or "never" if no expiry was chosen.
 *
 * @param {string} expiry - "never" | "1d" | "7d" | "30d"
 * @returns {string}
 */
function computeExpiresAt(expiry) {
  const daysMap = { '1d': 1, '7d': 7, '30d': 30 };
  const days    = daysMap[expiry];

  if (!days) return 'never'; // covers "never" and any unknown value

  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// POST /api/upload
router.post(
  '/',
  uploadLimiter,                  // rate limiting
  upload.single('file'),          // multer — parses 'file' field
  async (req, res, next) => {
    try {
      // multer puts the file at req.file; if missing, the field was absent
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided.' });
      }

      // Secondary size check (multer.memoryStorage already buffered the file)
      const sizeError = validateFileSize(req.file);
      if (sizeError) {
        return res.status(sizeError.status).json({ error: sizeError.message });
      }

      // Parse and validate expiry option (default to "never")
      const allowedExpiry = new Set(['never', '1d', '7d', '30d']);
      const expiry = allowedExpiry.has(req.body.expiry) ? req.body.expiry : 'never';

      // Derive a clean file extension from the original name
      const originalName = req.file.originalname || 'upload';
      const ext          = path.extname(originalName).toLowerCase() || '.jpg';

      // Generate a unique short code and build the S3 key
      const code  = await generateCode();
      const s3Key = `uploads/${code}${ext}`;

      // Upload the file buffer to S3
      await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

      const uploadedAt = new Date().toISOString();
      const expiresAt  = computeExpiresAt(expiry);

      // Write metadata record to DynamoDB
      await putItem({
        code,
        s3Key,
        originalName,
        mimeType:   req.file.mimetype,
        size:       req.file.size,
        uploadedAt,
        expiresAt,
      });

      // Build the response URLs
      // shortUrl is the redirect URL the user will share
      const host     = req.get('host') || `localhost:${process.env.PORT || 4000}`;
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
      const shortUrl = `${protocol}://${host}/i/${code}`;

      // viewUrl points directly to the image (S3 or CloudFront)
      const viewUrl = getPublicUrl(s3Key);

      return res.status(200).json({
        code,
        shortUrl,
        viewUrl,
        originalName,
        size:       req.file.size,
        uploadedAt,
        expiresAt,
      });

    } catch (err) {
      // Pass any unexpected errors to the global error handler
      next(err);
    }
  }
);

// Handle multer errors (e.g. file too large, wrong type from fileFilter)
// Multer throws these as errors with specific codes before the main handler runs.
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
  }
  // Other multer errors (e.g. from fileFilter) carry a status property
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
