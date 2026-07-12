/**
 * utils/compress.js — Client-side image compression wrapper
 *
 * Wraps the `browser-image-compression` library with sensible defaults.
 * Compression runs entirely in the browser (Web Worker) before upload,
 * reducing bandwidth usage and storage costs.
 *
 * The function returns both the compressed File and the compressed size
 * so the UI can display "original vs compressed" to the user.
 */

import imageCompression from 'browser-image-compression';

/**
 * Default compression options.
 * These are intentionally conservative — we want to reduce size without
 * visible quality loss for typical photos/screenshots.
 */
const DEFAULT_OPTIONS = {
  maxSizeMB:          1,       // target max 1 MB after compression
  maxWidthOrHeight:   1920,    // cap dimension for large images
  useWebWorker:       true,    // non-blocking; runs in background thread
  fileType:           undefined, // keep original format
  initialQuality:     0.82,    // good quality:size ratio for photos
};

/**
 * compressImage(file, options?)
 *
 * Compresses an image File in the browser and returns a result object.
 *
 * @param {File}   file          - The original image File from the input/drag event
 * @param {Object} [options={}]  - Overrides for DEFAULT_OPTIONS
 * @returns {Promise<{
 *   compressed: File,          - The compressed File object (ready to upload)
 *   originalSize: number,      - Original size in bytes
 *   compressedSize: number,    - Compressed size in bytes
 *   savedPercent: number,      - Percentage reduction (0–100)
 * }>}
 */
export async function compressImage(file, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const originalSize = file.size;

  // If the file is already small (< 200 KB), skip compression to avoid
  // any quality loss on already-small images.
  if (originalSize < 200 * 1024) {
    return {
      compressed:     file,
      originalSize,
      compressedSize: originalSize,
      savedPercent:   0,
    };
  }

  const compressedFile = await imageCompression(file, mergedOptions);

  const compressedSize = compressedFile.size;
  const savedPercent   = Math.round((1 - compressedSize / originalSize) * 100);

  return {
    compressed:   compressedFile,
    originalSize,
    compressedSize,
    savedPercent: Math.max(0, savedPercent), // clamp at 0 in case of tiny increase
  };
}

/**
 * formatBytes(bytes, decimals?)
 *
 * Converts a byte count to a human-readable string.
 * e.g. 1_500_000 → "1.43 MB"
 *
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k     = 1024;
  const sizes  = ['B', 'KB', 'MB', 'GB'];
  const i      = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
