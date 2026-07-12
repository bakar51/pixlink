'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { getPublicUrl } = require('../services/s3');

const router = Router();

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const TABLE = process.env.DYNAMODB_TABLE || 'pixlink-metadata';

// GET /api/user/uploads
router.get('/uploads', requireAuth, async (req, res, next) => {
  try {
    const command = new QueryCommand({
      TableName: TABLE,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': req.userId,
      },
    });

    const result = await docClient.send(command);
    
    // Map items to include full URLs
    const items = (result.Items || []).map(item => {
      const host = req.get('host') || `localhost:${process.env.PORT || 4000}`;
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
      
      return {
        ...item,
        shortUrl: `${protocol}://${host}/i/${item.code}`,
        viewUrl: getPublicUrl(item.s3Key),
        thumbUrl: item.thumbS3Key ? getPublicUrl(item.thumbS3Key) : null
      };
    });

    // Sort by uploadedAt descending
    items.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.status(200).json(items);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
