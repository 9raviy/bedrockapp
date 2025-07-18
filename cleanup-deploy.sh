#!/bin/bash

# Script to clean up and redeploy the CloudFormation stack
# This is useful when the stack gets stuck or has missing resources

set -e

STACK_NAME="bedrock-query-stack"
REGION="us-west-2"

echo "🧹 Cleaning up and redeploying CloudFormation stack..."

# Check if stack exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION > /dev/null 2>&1; then
    echo "📋 Stack exists. Checking current resources..."
    
    # Get current outputs
    echo "Current stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}' \
        --region $REGION \
        --output table
    
    echo ""
    read -p "Do you want to delete and recreate the stack? (y/N): " confirm
    
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "🗑️ Deleting existing stack..."
        aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
        
        echo "⏳ Waiting for stack deletion to complete..."
        aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
        
        echo "✅ Stack deleted successfully"
    else
        echo "⚠️ Keeping existing stack. Will attempt update..."
    fi
else
    echo "📋 Stack does not exist. Will create new stack."
fi

echo "🚀 Deploying CloudFormation stack..."
cd infrastructure

aws cloudformation deploy \
    --template-file bedrock-query-template.yaml \
    --stack-name $STACK_NAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --no-fail-on-empty-changeset

echo "⏳ Waiting for stack to be ready..."
aws cloudformation wait stack-deploy-complete --stack-name $STACK_NAME --region $REGION || true

echo "📋 Final stack outputs:"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}' \
    --region $REGION \
    --output table

echo "✅ Stack deployment completed!"
