/**
 * services/dynamo.js — DynamoDB helpers (SDK v3)
 *
 * Authentication strategy:
 *   Uses the AWS SDK v3 default credential provider chain.
 *   On EC2 with an IAM Role: credentials are resolved automatically via IMDS.
 *   No credentials are ever hardcoded.
 *
 * Uses DynamoDBDocumentClient from @aws-sdk/lib-dynamodb which automatically
 * marshals/unmarshals DynamoDB's typed attribute format to/from plain JS objects.
 *
 * Provides:
 *   putItem(item)        → writes a new image metadata record
 *   getItem(code)        → reads a record by short-code
 *   incrementViews(code) → atomically increments the view counter
 *   getStats(code)       → alias for getItem, used by the stats route
 */

'use strict';

const { DynamoDBClient }                     = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand,
        GetCommand, UpdateCommand }           = require('@aws-sdk/lib-dynamodb');

// DynamoDB client — credentials resolved automatically from IAM Role on EC2.
const dbClient  = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

// Table name from environment — DYNAMODB_TABLE is the primary name
const TABLE = process.env.DYNAMODB_TABLE;

/**
 * putItem(item)
 *
 * Writes a new image record to DynamoDB with views initialised to 0.
 *
 * @param {Object} item
 * @param {string} item.code         - Short-code PK
 * @param {string} item.s3Key        - S3 object key
 * @param {string} item.originalName - Original filename
 * @param {string} item.mimeType     - MIME type
 * @param {number} item.size         - File size in bytes
 * @param {string} item.uploadedAt   - ISO-8601 timestamp
 * @param {string} item.expiresAt    - ISO-8601 timestamp or "never"
 * @returns {Promise<void>}
 */
async function putItem(item) {
  if (!TABLE) {
    throw new Error('DYNAMODB_TABLE is not set in environment variables.');
  }

  const command = new PutCommand({
    TableName: TABLE,
    Item: {
      ...item,
      shortCode: item.code, // Map internal 'code' to DynamoDB partition key 'shortCode'
      views: 0, // initialise view counter
    },
  });
  await docClient.send(command);
}

/**
 * getItem(code)
 *
 * Retrieves an image record by its short-code.
 *
 * @param {string} code - The short-code (partition key)
 * @returns {Promise<Object|null>} The item, or null if not found
 */
async function getItem(code) {
  if (!TABLE) {
    throw new Error('DYNAMODB_TABLE is not set in environment variables.');
  }

  const command = new GetCommand({
    TableName: TABLE,
    Key: { shortCode: code },
  });
  const result = await docClient.send(command);
  return result.Item || null;
}

/**
 * incrementViews(code)
 *
 * Atomically increments the view counter for a given short-code.
 * Uses ADD expression so the update is safe under concurrent requests.
 *
 * @param {string} code
 * @returns {Promise<void>}
 */
async function incrementViews(code) {
  if (!TABLE) return; // non-critical — don't crash the redirect

  const command = new UpdateCommand({
    TableName:        TABLE,
    Key:              { shortCode: code },
    UpdateExpression: 'ADD #v :inc',
    ExpressionAttributeNames:  { '#v': 'views' },
    ExpressionAttributeValues: { ':inc': 1 },
  });
  await docClient.send(command);
}

/**
 * getStats(code) — convenience alias for getItem, used by the stats route.
 *
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
async function getStats(code) {
  return getItem(code);
}

module.exports = { putItem, getItem, incrementViews, getStats };
