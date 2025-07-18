# PowerShell script to clean up and redeploy the CloudFormation stack
# This is useful when the stack gets stuck or has missing resources

param(
    [string]$Region = "us-west-2",
    [string]$StackName = "bedrock-query-stack"
)

$ErrorActionPreference = "Stop"

Write-Host "🧹 Cleaning up and redeploying CloudFormation stack..." -ForegroundColor Green

# Check if stack exists
try {
    aws cloudformation describe-stacks --stack-name $StackName --region $Region | Out-Null
    Write-Host "📋 Stack exists. Checking current resources..." -ForegroundColor Yellow
    
    # Get current outputs
    Write-Host "Current stack outputs:" -ForegroundColor Cyan
    aws cloudformation describe-stacks --stack-name $StackName --query 'Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}' --region $Region --output table
    
    Write-Host ""
    $confirm = Read-Host "Do you want to delete and recreate the stack? (y/N)"
    
    if ($confirm -eq "y" -or $confirm -eq "Y" -or $confirm -eq "yes") {
        Write-Host "🗑️ Deleting existing stack..." -ForegroundColor Yellow
        aws cloudformation delete-stack --stack-name $StackName --region $Region
        
        Write-Host "⏳ Waiting for stack deletion to complete..." -ForegroundColor Yellow
        aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
        
        Write-Host "✅ Stack deleted successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Keeping existing stack. Will attempt update..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "📋 Stack does not exist. Will create new stack." -ForegroundColor Cyan
}

Write-Host "🚀 Deploying CloudFormation stack..." -ForegroundColor Green
Push-Location infrastructure

try {
    aws cloudformation deploy --template-file bedrock-query-template.yaml --stack-name $StackName --capabilities CAPABILITY_NAMED_IAM --region $Region --no-fail-on-empty-changeset
    
    Write-Host "⏳ Waiting for stack to be ready..." -ForegroundColor Yellow
    try {
        aws cloudformation wait stack-deploy-complete --stack-name $StackName --region $Region 2>$null
    } catch {
        Write-Host "Wait command failed, but stack may still be deployed" -ForegroundColor Yellow
    }
    
    Write-Host "📋 Final stack outputs:" -ForegroundColor Cyan
    aws cloudformation describe-stacks --stack-name $StackName --query 'Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}' --region $Region --output table
    
    Write-Host "✅ Stack deployment completed!" -ForegroundColor Green
} finally {
    Pop-Location
}
