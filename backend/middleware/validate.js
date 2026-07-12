/**
 * middleware/validate.js — File type and size validation
 *
 * Used as a multer fileFilter callback.
 * Rejects uploads that are:
 *  - Not in the allowed MIME type whitelist (jpg, png, webp, gif)
 *  - Larger than MAX_FILE_BYTES (default: 10 MB)
 *
 * Note: multer's limits.fileSize catches oversized files DURING streaming
 * (before the whole file is buffered). The explicit size check here is a
 * secondary guard on the already-buffered file.
 */

'use strict';

// Allowed MIME types — only common web image formats
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Maximum allowed file size: 10 MB in bytes
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * multerFileFilter(req, file, callback)
 *
 * Called by multer for each incoming file.
 * Pass `true` to accept, or an Error to reject.
 *
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file
 * @param {Function} callback
 */
function multerFileFilter(req, file, callback) {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    const err = new Error(
      `Unsupported file type: ${file.mimetype}. ` +
      `Allowed types: JPEG, PNG, WebP, GIF.`
    );
    err.status = 400;
    return callback(err, false);
  }
  callback(null, true);
}

/**
 * validateFileSize(file)
 *
 * Secondary size check after multer has buffered the file.
 * Returns an error object if too large, or null if OK.
 *
 * @param {Express.Multer.File} file
 * @returns {{ status: number, message: string } | null}
 */
function validateFileSize(file) {
  if (file.size > MAX_FILE_BYTES) {
    return {
      status: 400,
      message: `File too large. Maximum allowed size is ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return null;
}

module.exports = { multerFileFilter, validateFileSize, MAX_FILE_BYTES, ALLOWED_TYPES };
