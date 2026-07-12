/**
 * services/s3.js — AWS S3 helpers (SDK v3)
 *
 * Authentication strategy:
 *   On EC2: the IAM Role attached to the instance is used automatically.
 *   The AWS SDK v3 default credential provider chain checks (in order):
 *     1. Environment variables (AWS_ACCESS_KEY_ID etc.) — not set on EC2
 *     2. Shared credentials file (~/.aws/credentials)   — not present on EC2
 *     3. Instance Metadata Service (IMDS/IAM Role)      — used on EC2
 *   No credentials are ever hardcoded.
 *
 * Provides:
 *   uploadToS3(key, buffer, mimeType) → uploads a file buffer to S3
 *   getPublicUrl(key)                 → returns the public URL for a stored image
 */

'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// S3 client — credentials resolved automatically from IAM Role (on EC2)
// or the default credential chain (local dev with ~/.aws/credentials).
const s3 = new S3Client({ region: process.env.AWS_REGION });

// Bucket name from environment — no fallback to prevent silent misconfiguration
const BUCKET = process.env.AWS_BUCKET_NAME;

/**
 * uploadToS3(key, buffer, mimeType)
 *
 * Uploads a file buffer to the configured S3 bucket.
 *
 * @param {string} key      - S3 object key, e.g. "uploads/aB3dK9.jpg"
 * @param {Buffer} buffer   - Raw file bytes
 * @param {string} mimeType - MIME type, e.g. "image/jpeg"
 * @returns {Promise<void>}
 */
async function uploadToS3(key, buffer, mimeType) {
  if (!BUCKET) {
    throw new Error('AWS_BUCKET_NAME is not set in environment variables.');
  }

  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimeType,
    // ACL is intentionally omitted.
    // Public access is controlled via S3 Bucket Policy or CloudFront OAC,
    // not per-object ACLs. Set the bucket policy to allow public GetObject.
  });

  await s3.send(command);
}

/**
 * getPublicUrl(key)
 *
 * Returns the URL to access a stored image.
 * Prefers CloudFront base URL if configured; otherwise returns direct S3 URL.
 *
 * @param {string} key - S3 object key, e.g. "uploads/aB3dK9.jpg"
 * @returns {string}
 */
function getPublicUrl(key) {
  const cloudfrontBase = process.env.CLOUDFRONT_BASE_URL;

  if (cloudfrontBase) {
    // e.g. https://d1abc.cloudfront.net/uploads/aB3dK9.jpg
    return `${cloudfrontBase.replace(/\/$/, '')}/${key}`;
  }

  // Direct S3 URL — requires bucket policy allowing public s3:GetObject
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

module.exports = { uploadToS3, getPublicUrl };
