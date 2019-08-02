// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//https://github.com/aws-samples/simple-websockets-chat-app

//modified template to store conversation in DB and add more message metadata

const AWS = require('aws-sdk');

// Add ApiGatewayManagementApi to the AWS namespace
//require('aws-sdk/clients/apigatewaymanagementapi');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { TABLE_NAME } = process.env;
const { CONV_TABLE } = process.env;
exports.handler = async (event, context) => {
  let connectionData;
  
  try {
    connectionData = await ddb.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });
  
  const postData = JSON.parse(event.body).data;
  console.log(postData);
  
  var params = {
    TableName : CONV_TABLE,
    Item: {
     conversationID: (Math.random() * 10000000000).toString(),
     userName: postData.userName,
     language: postData.language,
     message: postData.chat
    }
  };
  
  const addItem = await ddb.put(params).promise();
  
  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(postData) }).promise();
    } catch (e) {
      console.log(e);
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }
  });
  
  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
    try {
    await Promise.all(addItem);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  return { statusCode: 200, body: 'Data sent.' };
};
