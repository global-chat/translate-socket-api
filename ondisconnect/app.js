// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

//modified AWS template
//https://github.com/aws-samples/simple-websockets-chat-app

var AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
var DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

exports.handler = async function (event, context, callback) {
  var deleteParams = {
    TableName: process.env.TABLE_NAME,
    Key: {
      connectionId: { S: event.requestContext.connectionId }
    }
  };

  let getItem = await DDB.getItem(deleteParams).promise();
  
  try {
    await Promise.all(getItem);
  } catch (e) {
  }
  
  const deleteItem = await DDB.deleteItem(deleteParams).promise();
  
  try {
    await Promise.all(deleteItem);
  } catch (e) {
  }
  
  let connectionData;
  const postData = {
    "chat": `${getItem.Item.userName.S} has left the chat.`, 
    "userName": getItem.Item.userName.S, 
    "language": "en", 
    "state": "ondisconnect"
  }
  
  try {
    connectionData = await ddb.scan({ TableName: process.env.TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });
  
  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(postData) }).promise();
    } catch (e) {
      console.log(e);
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb.delete({ TableName: process.env.TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }
  });
  
  try {
    const a = await Promise.all(postCalls);
    console.log(a);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
};