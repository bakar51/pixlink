require('dotenv').config();
const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'pixlink-images';

async function addGSI() {
  const params = {
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: 'userId-index',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      }
    ]
  };

  try {
    console.log(`Adding userId-index GSI to ${TABLE_NAME}...`);
    const command = new UpdateTableCommand(params);
    const result = await client.send(command);
    console.log('Update initiated successfully!');
    console.log('The index will take a few minutes to build. You can check the AWS console for its status.');
  } catch (err) {
    if (err.name === 'ValidationException' && err.message.includes('already exists')) {
      console.log('The index already exists or is currently being created.');
    } else {
      console.error('Error updating table:', err);
    }
  }
}

addGSI();
