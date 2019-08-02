# translate-socket-api

## Introduction

This is a backend WebSocket portion of "Found-In-Translation" using the Severless Application Repository

https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:729047367331:applications~simple-websockets-chat-app

It is responsible for real-time chat communication.

It is deployed as AWS lambda functions connected through API gateway,

## Deployment Instructions

- Clone this repo
- Visit the Severless Application Repository and publish the repo.
- The sample template.yml will auto build the API WebSocket
- Afterwards create a DynamoDB "conversation" Table to hold the messages

