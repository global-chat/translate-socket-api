/* Copyright 2017-2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file
 except in compliance with the License. A copy of the License is located at

     http://aws.amazon.com/apache2.0/

 or in the "license" file accompanying this file. This file is distributed on an "AS IS"
 BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 License for the specific language governing permissions and limitations under the License.
*/

//https://github.com/aws-samples/simple-websockets-chat-app
//https://github.com/awslabs/aws-support-tools/tree/master/Cognito/decode-verify-jwt
//Combined AWS's token authorization template with onConnect actions
//if user's token is verified, puts user's connections in the database
//there is an error in AWS's template, there is no claims.aud -> changed it to claims.client_id on line 60



var https = require('https');
var jose = require('node-jose');
var AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
var DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
var region = 'REGION';
var userpool_id = 'User Pool ID';
var app_client_id = 'Client ID';
var keys_url = 'https://cognito-idp.' + region + '.amazonaws.com/' + userpool_id + '/.well-known/jwks.json';

exports.handler = (event, context, callback) => {
    console.log(event.queryStringParameters);
    var token = event.queryStringParameters.token;
    var sections = token.split('.');
    var header = jose.util.base64url.decode(sections[0]);
    header = JSON.parse(header);
    var kid = header.kid;

    https.get(keys_url, function(response) {
        if (response.statusCode == 200) {
            response.on('data', function(body) {
                var keys = JSON.parse(body)['keys'];
                var key_index = -1;
                for (var i=0; i < keys.length; i++) {
                        if (kid == keys[i].kid) {
                            key_index = i;
                            break;
                        }
                }
                if (key_index == -1) {
                    console.log('Public key not found in jwks.json');
                    callback('Public key not found in jwks.json');
                }
                jose.JWK.asKey(keys[key_index]).
                then(function(result) {
                    jose.JWS.createVerify(result).
                    verify(token).
                    then(function(result) {
                        var claims = JSON.parse(result.payload);
                        var current_ts = Math.floor(new Date() / 1000);
                        if (current_ts > claims.exp) {
                            callback('Token is expired');
                        }
                        if (claims.client_id != app_client_id) {
                            callback('Token was not issued for this audience');
                        }
                    }).
                    catch(function() {
                        callback('Signature verification failed');
                    });
                });
            });
        }
    });
    var putParams = {
      TableName: process.env.TABLE_NAME,
      Item: {
        connectionId: { S: event.requestContext.connectionId },
        userName: {S: event.queryStringParameters.username}
      }
    };
    DDB.putItem(putParams, function (err) {
      callback(null, {
        statusCode: err ? 500 : 200,
        body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected."
      });
    });
}
