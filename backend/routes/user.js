'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { getPublicUrl, deleteFromS3 } = require('../services/s3');
const { getItem, deleteItem } = require('../services/dynamo');

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

// DELETE /api/user/uploads/:code
router.delete('/uploads/:code', requireAuth, async (req, res, next) => {
  try {
    const code = req.params.code;
    const item = await getItem(code);

    if (!item) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (item.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete from S3
    await deleteFromS3(item.s3Key);
    if (item.thumbS3Key) {
      await deleteFromS3(item.thumbS3Key);
    }

    // Delete from DynamoDB
    await deleteItem(code);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
