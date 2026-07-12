/**
 * services/s3.js — AWS S3 helpers (SDK v3)
 *
 * Provides two functions:
 *  - uploadToS3(key, buffer, mimeType) → uploads a file buffer to S3
 *  - getPublicUrl(key)                 → constructs the public URL for a key
 *
 * Authentication: On EC2, the SDK automatically uses the instance's IAM role
 * via the instance metadata service (IMDS). No access keys needed.
 * Locally, it falls back to ~/.aws/credentials or AWS_PROFILE env var.
 */

'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Build the S3 client config.
 * - On EC2 with an IAM role: no credentials needed — SDK uses IMDS automatically.
 * - Locally (or on EC2 without a role): set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 *   in .env and the SDK credential chain picks them up automatically.
 * We never hardcode keys in source code.
 */
const s3ClientConfig = { region: process.env.AWS_REGION };

// If explicit keys are present in env, inject them (useful for local dev without AWS CLI)
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  const { fromEnv } = require('@aws-sdk/credential-providers');
  s3ClientConfig.credentials = fromEnv();
}

const s3 = new S3Client(s3ClientConfig);

// Support both AWS_BUCKET_NAME (preferred) and legacy S3_BUCKET_NAME
const BUCKET = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET_NAME;

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
  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimeType,
    // ACL omitted intentionally — bucket policy or CloudFront OAC controls access.
    // If you want objects publicly readable directly from S3 (not via CloudFront),
    // uncomment the next line and ensure the bucket allows public ACLs.
    // ACL: 'public-read',
  });

  await s3.send(command);
}

/**
 * getPublicUrl(key)
 *
 * Returns the URL to access a stored image.
 * Prefers the CloudFront base URL when configured; falls back to S3 URL.
 *
 * @param {string} key - S3 object key, e.g. "uploads/aB3dK9.jpg"
 * @returns {string}
 */
function getPublicUrl(key) {
  const cloudfrontBase = process.env.CLOUDFRONT_BASE_URL;

  if (cloudfrontBase) {
    // CloudFront: https://d1abc.cloudfront.net/uploads/aB3dK9.jpg
    return `${cloudfrontBase.replace(/\/$/, '')}/${key}`;
  }

  // Direct S3 URL — only works if the object/bucket is publicly accessible
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

module.exports = { uploadToS3, getPublicUrl };
