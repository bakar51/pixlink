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
const { optionalAuth }                     = require('../middleware/auth');
const { uploadToS3, getPublicUrl }         = require('../services/s3');
const { putItem }                          = require('../services/dynamo');
const { generateCode }                     = require('../utils/shortCode');

const router = Router();

// Multer config — store uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 11 * 1024 * 1024 }, // 11 MB
  fileFilter: multerFileFilter,
});

/**
 * computeExpiresAt(expiry)
 */
function computeExpiresAt(expiry) {
  const daysMap = { '1d': 1, '7d': 7, '30d': 30 };
  const days    = daysMap[expiry];

  if (!days) return 'never';

  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// POST /api/upload
router.post(
  '/',
  uploadLimiter,
  optionalAuth,
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      // With upload.fields, files are in req.files object
      const files = req.files || {};
      const file = files['file'] ? files['file'][0] : null;
      const thumbnail = files['thumbnail'] ? files['thumbnail'][0] : null;

      if (!file) {
        return res.status(400).json({ error: 'No file provided.' });
      }

      // Secondary size check
      const sizeError = validateFileSize(file);
      if (sizeError) {
        return res.status(sizeError.status).json({ error: sizeError.message });
      }

      const allowedExpiry = new Set(['never', '1d', '7d', '30d']);
      const expiry = allowedExpiry.has(req.body.expiry) ? req.body.expiry : 'never';

      const originalName = file.originalname || 'upload';
      const ext          = path.extname(originalName).toLowerCase() || '.jpg';

      const code  = await generateCode();
      const s3Key = `uploads/${code}${ext}`;
      
      // Upload main file
      await uploadToS3(s3Key, file.buffer, file.mimetype);
      
      // Upload thumbnail if provided
      let thumbS3Key = null;
      if (thumbnail) {
        thumbS3Key = `uploads/thumbs/${code}.webp`;
        await uploadToS3(thumbS3Key, thumbnail.buffer, thumbnail.mimetype);
      }

      const uploadedAt = new Date().toISOString();
      const expiresAt  = computeExpiresAt(expiry);

      // Build metadata record
      const itemToSave = {
        code,
        s3Key,
        thumbS3Key,
        originalName,
        mimeType:   file.mimetype,
        size:       file.size,
        uploadedAt,
        expiresAt,
      };

      // Only add userId if logged in to prevent DynamoDB GSI Type Mismatch
      if (req.userId) {
        itemToSave.userId = req.userId;
      }

      // Write metadata record to DynamoDB
      await putItem(itemToSave);

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
