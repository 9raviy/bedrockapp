#!/usr/bin/env node

/**
 * Local Environment Deployment Script
 * Deploys BedrockApp to specified environment using local environment configs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadConfig(environment) {
  const configPath = path.join(__dirname, 'config', 'environments', `${environment}.json`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function deployEnvironment(environment, skipSSL = false) {
  console.log(`🚀 Starting deployment to ${environment} environment`);
  console.log('=' .repeat(60));
  
  const config = loadConfig(environment);
  
  console.log(`📋 Configuration loaded:`);
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Project: ${config.projectName}`);
  console.log(`   Stack: ${config.infrastructure.stackName}`);
  console.log(`   Domain: ${config.domain.customUrl}`);
  console.log(`   Region: ${config.infrastructure.region}`);
  
  // Set environment variables for AWS CLI commands
  process.env.PROJECT_NAME = config.projectName;
  process.env.ENVIRONMENT = config.environment;
  process.env.DOMAIN_NAME = config.domain.domainName;
  process.env.SUBDOMAIN_NAME = config.domain.subdomainName;
  process.env.HOSTED_ZONE_ID = config.domain.hostedZoneId;
  process.env.LAMBDA_TIMEOUT = config.backend.timeout.toString();
  process.env.LAMBDA_MEMORY = config.backend.memory.toString();
  process.env.STACK_NAME = config.infrastructure.stackName;
  process.env.AWS_REGION = config.infrastructure.region;
  
  try {
    // Step 1: Install backend dependencies and create zip
    console.log('\n📦 Preparing backend...');
    runCommand('cd backend && npm install', 'Installing backend dependencies');
    runCommand('cd backend && powershell -Command "Compress-Archive -Path . -DestinationPath function.zip -Force -CompressionLevel Optimal"', 'Creating backend zip');
    
    // Step 2: Upload to S3 (assuming bucket exists)
    runCommand('cd backend && aws s3 cp function.zip s3://my-lambda-deployment-bucket-for-bedrock2/function.zip', 'Uploading backend to S3');
    
    // Step 3: Deploy SSL certificate (if not skipped)
    if (!skipSSL && config.features.enableSSL) {
      console.log('\n🔒 Deploying SSL certificate...');
      runCommand(`cd infrastructure && aws cloudformation deploy --template-file ssl-certificate-template.yaml --stack-name ${config.projectName}-${config.environment}-ssl-certificate --capabilities CAPABILITY_IAM --region ${config.infrastructure.sslRegion} --parameter-overrides DomainName=${config.domain.domainName} SubdomainName=${config.domain.subdomainName} HostedZoneId=${config.domain.hostedZoneId}`, 'Deploying SSL certificate');
    }
    
    // Step 4: Get SSL Certificate ARN
    let sslCertArn = '';
    if (config.features.enableSSL && !skipSSL) {
      try {
        const sslOutput = execSync(`aws cloudformation describe-stacks --stack-name ${config.projectName}-${config.environment}-ssl-certificate --region ${config.infrastructure.sslRegion} --query 'Stacks[0].Outputs[?OutputKey==\`SSLCertificateArn\`].OutputValue' --output text`, { encoding: 'utf8' });
        sslCertArn = sslOutput.trim();
        console.log(`🔒 SSL Certificate ARN: ${sslCertArn}`);
      } catch (error) {
        console.warn('⚠️  Could not retrieve SSL certificate ARN, deploying without SSL');
      }
    }
    
    // Step 5: Deploy main infrastructure
    console.log('\n🏗️  Deploying infrastructure...');
    const deployCommand = `cd infrastructure && aws cloudformation deploy --template-file bedrock-query-template.yaml --stack-name ${config.infrastructure.stackName} --capabilities CAPABILITY_NAMED_IAM --region ${config.infrastructure.region} --parameter-overrides ProjectName=${config.projectName} Environment=${config.environment} DomainName=${config.domain.domainName} SubdomainName=${config.domain.subdomainName} HostedZoneId=${config.domain.hostedZoneId} SSLCertificateArn=${sslCertArn} LambdaTimeout=${config.backend.timeout} LambdaMemory=${config.backend.memory} --no-fail-on-empty-changeset`;
    
    runCommand(deployCommand, 'Deploying infrastructure stack');
    
    // Step 6: Update Lambda function code
    console.log('\n⚡ Updating Lambda function...');
    runCommand(`aws lambda update-function-code --function-name ${config.projectName}-${config.environment}-backend --s3-bucket my-lambda-deployment-bucket-for-bedrock2 --s3-key function.zip --region ${config.infrastructure.region}`, 'Updating Lambda function code');
    
    // Step 7: Build and deploy frontend
    console.log('\n🎨 Building frontend...');
    runCommand('cd frontend && npm install', 'Installing frontend dependencies');
    runCommand('cd frontend && npm run build', 'Building frontend');
    
    // Step 8: Get API Gateway URL and update frontend
    console.log('\n🔗 Updating API endpoint...');
    const apiUrl = execSync(`aws cloudformation describe-stacks --stack-name ${config.infrastructure.stackName} --query 'Stacks[0].Outputs[?OutputKey==\`ApiGatewayUrl\`].OutputValue' --output text --region ${config.infrastructure.region}`, { encoding: 'utf8' }).trim();
    console.log(`API URL: ${apiUrl}`);
    
    // Update api.js file
    const apiJsPath = path.join(__dirname, 'frontend', 'src', 'api.js');
    let apiJsContent = fs.readFileSync(apiJsPath, 'utf8');
    apiJsContent = apiJsContent.replace(
      /const LAMBDA_ENDPOINT\s*=\s*["'][^"']*["'];?/,
      `const LAMBDA_ENDPOINT = "${apiUrl}";`
    );
    fs.writeFileSync(apiJsPath, apiJsContent);
    
    // Rebuild frontend with updated API endpoint
    runCommand('cd frontend && npm run build', 'Rebuilding frontend with updated API endpoint');
    
    // Step 9: Deploy to S3
    const bucketName = execSync(`aws cloudformation describe-stacks --stack-name ${config.infrastructure.stackName} --query 'Stacks[0].Outputs[?OutputKey==\`FrontendS3BucketName\`].OutputValue' --output text --region ${config.infrastructure.region}`, { encoding: 'utf8' }).trim();
    
    console.log(`\n☁️  Deploying to S3 bucket: ${bucketName}`);
    runCommand(`cd frontend && aws s3 sync build/ s3://${bucketName} --delete --cache-control "max-age=86400" --exclude "*.html"`, 'Uploading static assets');
    runCommand(`cd frontend && aws s3 sync build/ s3://${bucketName} --cache-control "no-cache, no-store, must-revalidate" --include "*.html"`, 'Uploading HTML files');
    
    // Step 10: Invalidate CloudFront
    const distributionId = execSync(`aws cloudformation describe-stacks --stack-name ${config.infrastructure.stackName} --query 'Stacks[0].Outputs[?OutputKey==\`FrontendCloudFrontDistributionId\`].OutputValue' --output text --region ${config.infrastructure.region}`, { encoding: 'utf8' }).trim();
    
    console.log('\n🔄 Invalidating CloudFront cache...');
    runCommand(`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`, 'Creating CloudFront invalidation');
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log(`🌐 Application URL: ${config.domain.customUrl}`);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const environment = args[0];
  const skipSSL = args.includes('--skip-ssl');
  
  if (!environment || !['dev', 'prod'].includes(environment)) {
    console.error('Usage: node deploy-local.js <dev|prod> [--skip-ssl]');
    console.error('');
    console.error('Examples:');
    console.error('  node deploy-local.js dev          # Deploy to development');
    console.error('  node deploy-local.js prod         # Deploy to production');
    console.error('  node deploy-local.js dev --skip-ssl  # Skip SSL deployment');
    process.exit(1);
  }
  
  deployEnvironment(environment, skipSSL);
}

if (require.main === module) {
  main();
}
