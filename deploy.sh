#!/bin/bash

# Deployment script for the Adaptive Quiz App
# This script deploys both backend and frontend to AWS

set -e

echo "🚀 Starting deployment of Adaptive Quiz App..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured or credentials are invalid"
    exit 1
fi

# Set variables
STACK_NAME="bedrock-query-stack"
REGION="us-west-2"
S3_BUCKET="my-lambda-deployment-bucket-for-bedrock2"

echo "📋 Configuration:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo "  S3 Bucket: $S3_BUCKET"

# Step 1: Create S3 bucket if it doesn't exist
echo "🪣 Checking S3 bucket..."
if ! aws s3 ls "s3://$S3_BUCKET" > /dev/null 2>&1; then
    echo "  Creating S3 bucket: $S3_BUCKET"
    aws s3api create-bucket \
        --bucket $S3_BUCKET \
        --region $REGION \
        --create-bucket-configuration LocationConstraint=$REGION
else
    echo "  S3 bucket already exists: $S3_BUCKET"
fi

# Step 2: Build and upload Lambda function
echo "🔧 Building Lambda function..."
cd backend
npm install
zip -r function.zip . -x "*.git*" "node_modules/aws-sdk/*"

echo "📤 Uploading Lambda function to S3..."
aws s3 cp function.zip s3://$S3_BUCKET/function.zip

# Step 3: Deploy CloudFormation stack
echo "☁️ Deploying CloudFormation stack..."
cd ../infrastructure
aws cloudformation deploy \
    --template-file bedrock-query-template.yaml \
    --stack-name $STACK_NAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

# Step 4: Update Lambda function code
echo "🔄 Updating Lambda function code..."
aws lambda update-function-code \
    --function-name bedrock-query \
    --s3-bucket $S3_BUCKET \
    --s3-key function.zip \
    --region $REGION

# Step 5: Get API Gateway URL
echo "🔗 Getting API Gateway URL..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text \
    --region $REGION)

echo "  API Gateway URL: $API_URL"

# Step 6: Build and deploy frontend
echo "🎨 Building frontend..."
cd ../frontend
npm install

# Update API endpoint in frontend
sed -i.bak "s|const LAMBDA_ENDPOINT = \".*\";|const LAMBDA_ENDPOINT = \"$API_URL\";|" src/api.js

# Build frontend
npm run build

# Get S3 bucket name for frontend
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendS3BucketName`].OutputValue' \
    --output text \
    --region $REGION)

echo "📤 Deploying frontend to S3 bucket: $FRONTEND_BUCKET"
aws s3 sync build/ s3://$FRONTEND_BUCKET --delete

# Get CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendCloudFrontURL`].OutputValue' \
    --output text \
    --region $REGION)

echo "🌐 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(echo $CLOUDFRONT_URL | sed 's|https://||' | sed 's|\.cloudfront\.net||')
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" > /dev/null

# Restore original api.js
mv src/api.js.bak src/api.js

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Application URLs:"
echo "  Frontend (CloudFront): $CLOUDFRONT_URL"
echo "  API Gateway: $API_URL"
echo ""
echo "🎉 Your Adaptive Quiz App is now live!"
