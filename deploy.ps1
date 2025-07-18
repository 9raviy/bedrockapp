# PowerShell deployment script for the Adaptive Quiz App
# This script deploys both backend and frontend to AWS

param(
    [string]$Region = "us-west-2",
    [string]$StackName = "bedrock-query-stack",
    [string]$S3Bucket = "my-lambda-deployment-bucket-for-bedrock2"
)

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment of Adaptive Quiz App..." -ForegroundColor Green

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not configured or credentials are invalid" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Stack Name: $StackName" -ForegroundColor Yellow
Write-Host "  Region: $Region" -ForegroundColor Yellow
Write-Host "  S3 Bucket: $S3Bucket" -ForegroundColor Yellow

# Step 1: Create S3 bucket if it doesn't exist
Write-Host "🪣 Checking S3 bucket..." -ForegroundColor Cyan
try {
    aws s3 ls "s3://$S3Bucket" | Out-Null
    Write-Host "  S3 bucket already exists: $S3Bucket" -ForegroundColor Green
} catch {
    Write-Host "  Creating S3 bucket: $S3Bucket" -ForegroundColor Yellow
    aws s3api create-bucket --bucket $S3Bucket --region $Region --create-bucket-configuration LocationConstraint=$Region
}

# Step 2: Build and upload Lambda function
Write-Host "🔧 Building Lambda function..." -ForegroundColor Cyan
Push-Location backend
npm install

# Remove existing function.zip if it exists
if (Test-Path "function.zip") {
    Remove-Item "function.zip"
}

# Create zip file (using 7-Zip if available, otherwise use PowerShell)
if (Get-Command "7z" -ErrorAction SilentlyContinue) {
    7z a function.zip . -x!.git* -x!node_modules\aws-sdk\*
} else {
    # Fallback to PowerShell compression
    $files = Get-ChildItem -Recurse -File | Where-Object { 
        $_.FullName -notlike "*\.git*" -and 
        $_.FullName -notlike "*\node_modules\aws-sdk\*" 
    }
    Compress-Archive -Path $files -DestinationPath "function.zip" -Force
}

Write-Host "📤 Uploading Lambda function to S3..." -ForegroundColor Cyan
aws s3 cp function.zip "s3://$S3Bucket/function.zip"

Pop-Location

# Step 3: Deploy CloudFormation stack
Write-Host "☁️ Deploying CloudFormation stack..." -ForegroundColor Cyan
Push-Location infrastructure
aws cloudformation deploy --template-file bedrock-query-template.yaml --stack-name $StackName --capabilities CAPABILITY_NAMED_IAM --region $Region
Pop-Location

# Step 4: Update Lambda function code
Write-Host "🔄 Updating Lambda function code..." -ForegroundColor Cyan
aws lambda update-function-code --function-name bedrock-query --s3-bucket $S3Bucket --s3-key function.zip --region $Region

# Step 5: Get API Gateway URL
Write-Host "🔗 Getting API Gateway URL..." -ForegroundColor Cyan
$ApiUrl = aws cloudformation describe-stacks --stack-name $StackName --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text --region $Region
Write-Host "  API Gateway URL: $ApiUrl" -ForegroundColor Green

# Step 6: Build and deploy frontend
Write-Host "🎨 Building frontend..." -ForegroundColor Cyan
Push-Location frontend
npm install

# Update API endpoint in frontend
$apiJs = Get-Content "src\api.js" -Raw
$updatedApiJs = $apiJs -replace 'const LAMBDA_ENDPOINT\s*=\s*"[^"]*";', "const LAMBDA_ENDPOINT = `"$ApiUrl`";"
Set-Content "src\api.js" $updatedApiJs

# Build frontend
npm run build

# Get S3 bucket name for frontend
$FrontendBucket = aws cloudformation describe-stacks --stack-name $StackName --query 'Stacks[0].Outputs[?OutputKey==`FrontendS3BucketName`].OutputValue' --output text --region $Region

Write-Host "📤 Deploying frontend to S3 bucket: $FrontendBucket" -ForegroundColor Cyan
aws s3 sync build\ "s3://$FrontendBucket" --delete

# Get CloudFront URL
$CloudFrontUrl = aws cloudformation describe-stacks --stack-name $StackName --query 'Stacks[0].Outputs[?OutputKey==`FrontendCloudFrontURL`].OutputValue' --output text --region $Region

Write-Host "🌐 Invalidating CloudFront cache..." -ForegroundColor Cyan
$DistributionId = $CloudFrontUrl -replace "https://", "" -replace "\.cloudfront\.net", ""
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" | Out-Null

# Restore original api.js
git checkout -- src\api.js 2>$null || Write-Host "  Note: Could not restore original api.js (this is normal if not using git)" -ForegroundColor Yellow

Pop-Location

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Application URLs:" -ForegroundColor Yellow
Write-Host "  Frontend (CloudFront): $CloudFrontUrl" -ForegroundColor Green
Write-Host "  API Gateway: $ApiUrl" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Your Adaptive Quiz App is now live!" -ForegroundColor Magenta
