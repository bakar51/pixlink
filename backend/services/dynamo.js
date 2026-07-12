/**
 * services/dynamo.js — DynamoDB helpers (SDK v3)
 *
 * Uses DynamoDBDocumentClient from @aws-sdk/lib-dynamodb which automatically
 * marshals/unmarshals DynamoDB's typed attribute format to/from plain JS objects.
 *
 * Provides four functions:
 *  - putItem(item)           → writes a new image metadata record
 *  - getItem(code)           → reads a record by short-code
 *  - incrementViews(code)    → atomically increments the view counter
 *  - getStats(code)          → alias for getItem, used by the stats route
 */

'use strict';

const { DynamoDBClient }                         = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand,
        GetCommand, UpdateCommand }               = require('@aws-sdk/lib-dynamodb');

/**
 * Build the DynamoDB client config.
 * On EC2 with an IAM role attached, no credentials are needed — the SDK
 * resolves them automatically from the instance metadata service (IMDS).
 * For local dev set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env.
 */
const dbClientConfig = { region: process.env.AWS_REGION };

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  const { fromEnv } = require('@aws-sdk/credential-providers');
  dbClientConfig.credentials = fromEnv();
}

const dbClient = new DynamoDBClient(dbClientConfig);

// DynamoDBDocumentClient wraps the base client and handles attribute marshalling
const docClient = DynamoDBDocumentClient.from(dbClient);

// Support both DYNAMODB_TABLE (preferred) and legacy DYNAMO_TABLE_NAME
const TABLE = process.env.DYNAMODB_TABLE || process.env.DYNAMO_TABLE_NAME;

/**
 * putItem(item)
 *
 * Writes a new image record to DynamoDB.
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
  const command = new PutCommand({
    TableName: TABLE,
    Item: {
      ...item,
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
  const command = new GetCommand({
    TableName: TABLE,
    Key: { code },
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
  const command = new UpdateCommand({
    TableName:        TABLE,
    Key:              { code },
    UpdateExpression: 'ADD #v :inc',
    ExpressionAttributeNames:  { '#v': 'views' },
    ExpressionAttributeValues: { ':inc': 1 },
  });
  await docClient.send(command);
}

/**
 * getStats(code) — convenience alias for getItem, used by the stats route
 *
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
async function getStats(code) {
  return getItem(code);
}

module.exports = { putItem, getItem, incrementViews, getStats };
