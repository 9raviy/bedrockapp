# BedrockApp - Adaptive Quiz Application

An intelligent quiz application powered by AWS Bedrock (Claude 3.5 Sonnet) that creates adaptive, personalized quizzes on any topic with real-time feedback and explanations.

## 🚀 Features

- **AI-Powered Quiz Generation**: Uses Claude 3.5 Sonnet to create dynamic multiple-choice questions
- **Adaptive Learning**: Questions adapt based on your performance and knowledge level
- **Real-Time Feedback**: Instant explanations for both correct and incorrect answers
- **Multi-Environment Support**: Separate dev/prod environments with environment-specific configurations
- **Serverless Architecture**: Built on AWS Lambda, API Gateway, S3, and CloudFront
- **Custom Domain Support**: SSL-enabled custom domains with CloudFront CDN
- **CI/CD Pipeline**: Automated deployments via GitHub Actions

## 🏗️ Architecture

```
Frontend (React) → CloudFront → S3
                      ↓
API Gateway → Lambda → AWS Bedrock (Claude 3.5 Sonnet)
                ↓
Route 53 ← ACM SSL Certificate
```

## 🚀 Quick Start

### 1. Setup Environment Configuration
```bash
node setup-environment.js
```
This interactive script will help you configure your domain, AWS settings, and create the required environment files.

### 2. Configure GitHub Secrets (for CI/CD deployment)
- Copy `GITHUB-SECRETS-SETUP.md.template` to `GITHUB-SECRETS-SETUP.md` 
- Follow the guide to set up required GitHub repository secrets
- **Never commit the actual secrets file** - it's in `.gitignore`

### 3. Deploy via GitHub Actions
- Push to `main` branch for production deployment
- Push to `develop` branch for development deployment

### 4. Manual Deployment (alternative)
- See detailed instructions in the Manual Deployment section below

## 🔐 Security & Configuration

This repository is configured to keep sensitive information secure:

- ✅ **Sensitive config files** are in `.gitignore` 
- ✅ **Template files** provide examples with placeholder values
- ✅ **Setup script** helps create proper configuration files
- ✅ **GitHub Secrets** store sensitive deployment credentials
- ✅ **No hardcoded** domain names or AWS account details in code

## 📋 Environment Configuration System

The application supports multiple environments (dev, prod) with environment-specific configurations:

### Configuration Structure

```
config/
├── environments/
│   ├── dev.json      # Development environment config
│   ├── prod.json     # Production environment config
│   └── staging.json  # (Future) Staging environment config
└── validate-config.js # Configuration validator
```

### Environment Config Schema

Each environment configuration file contains:

```json
{
  "projectName": "your-project-name",
  "environment": "dev|prod",
  "domain": {
    "domainName": "your-domain.com",
    "subdomainName": "dev-your-app|your-app",
    "hostedZoneId": "YOUR_HOSTED_ZONE_ID",
    "customUrl": "https://dev-your-app.your-domain.com|https://your-app.your-domain.com"
  },
  "backend": {
    "runtime": "nodejs20.x",
    "timeout": 30|15,
    "memory": 256|128,
    "handler": "src/handlers/queryBedrock.handler",
    "environment": {
      "BEDROCK_MODEL_ID": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "LOG_LEVEL": "DEBUG|INFO"
    }
  },
  "frontend": {
    "buildCommand": "npm run build",
    "buildDir": "build",
    "caching": {
      "staticAssets": "max-age=86400|max-age=31536000",
      "htmlFiles": "no-cache, no-store, must-revalidate"
    }
  },
  "infrastructure": {
    "region": "us-west-2",
    "sslRegion": "us-east-1",
    "stackName": "your-project-name-dev-stack|your-project-name-prod-stack"
  },
  "features": {
    "enableSSL": true,
    "enableCloudFront": true,
    "enableCustomDomain": true,
    "enableMonitoring": true|false
  }
}
```

### Key Differences Between Environments

| Feature | Development | Production |
|---------|-------------|------------|
| **URL** | `https://dev-your-app.your-domain.com` | `https://your-app.your-domain.com` |
| **Lambda Timeout** | 30 seconds | 15 seconds |
| **Lambda Memory** | 256 MB | 128 MB |
| **Log Level** | DEBUG | INFO |
| **Caching** | 1 day | 1 year |
| **Monitoring** | Enabled | Disabled |
| **Stack Name** | `your-project-name-dev-stack` | `your-project-name-prod-stack` |

## 🛠️ Local Development & Deployment

### Prerequisites

- Node.js 20+
- AWS CLI configured with appropriate credentials
- AWS Account with Bedrock access
- Custom domain registered in Route 53 (optional)

### Environment Setup

1. **Validate Configuration**
   ```powershell
   cd config
   node validate-config.js
   ```

2. **Deploy to Development**
   ```powershell
   # Using local deployment script
   node deploy-local.js dev
   
   # Or using GitHub Actions (push to develop branch)
   git checkout develop
   git push origin develop
   ```

3. **Deploy to Production**
   ```powershell
   # Using local deployment script
   node deploy-local.js prod
   
   # Or using GitHub Actions (push to main branch)
   git checkout main
   git push origin main
   ```

### Manual Deployment Steps

If you prefer manual deployment:

1. **Backend Deployment**
   ```powershell
   cd backend
   npm install
   Compress-Archive -Path . -DestinationPath function.zip -Force
   aws s3 cp function.zip s3://my-lambda-deployment-bucket-for-bedrock2/
   ```

2. **Infrastructure Deployment**
   ```powershell
   cd infrastructure
   
   # Deploy SSL Certificate (us-east-1 for CloudFront)
   aws cloudformation deploy `
     --template-file ssl-certificate-template.yaml `
     --stack-name your-project-name-dev-ssl-certificate `
     --region us-east-1 `
     --parameter-overrides `
       DomainName=your-domain.com `
       SubdomainName=dev-your-app `
       HostedZoneId=YOUR_HOSTED_ZONE_ID
   
   # Deploy Main Stack
   aws cloudformation deploy `
     --template-file bedrock-query-template.yaml `
     --stack-name your-project-name-dev-stack `
     --capabilities CAPABILITY_NAMED_IAM `
     --parameter-overrides `
       ProjectName=your-project-name `
       Environment=dev `
       DomainName=your-domain.com `
       SubdomainName=dev-your-app
   ```

3. **Frontend Deployment**
   ```powershell
   cd frontend
   npm install
   npm run build
   
   # Get bucket name from CloudFormation output
   $bucketName = aws cloudformation describe-stacks --stack-name bedrock-quiz-dev-stack --query 'Stacks[0].Outputs[?OutputKey==`FrontendS3BucketName`].OutputValue' --output text
   
   # Deploy to S3
   aws s3 sync build/ s3://$bucketName --delete
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

- **Production Deploy** (`.github/workflows/deploy-lambda.yml`)
  - Triggers on: Push to `main` branch or manual dispatch
  - Environment: `production`
  - Uses: `config/environments/prod.json`

- **Development Deploy** (`.github/workflows/deploy-dev.yml`)
  - Triggers on: Push to `develop` branch or manual dispatch
  - Environment: `development`
  - Uses: `config/environments/dev.json`

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

### Workflow Features

- **Environment Loading**: Dynamically loads config from JSON files
- **SSL Certificate Management**: Automatic SSL cert deployment in us-east-1
- **Stack State Handling**: Automatically handles failed stack states
- **API Endpoint Updates**: Updates frontend with correct API Gateway URLs
- **CloudFront Invalidation**: Clears CDN cache after deployment
- **Error Handling**: Comprehensive error reporting and rollback

## 🌐 Live Applications

After configuration and deployment:
- **Production**: `https://your-app.your-domain.com`
- **Development**: `https://dev-your-app.your-domain.com`

## 📊 Usage

1. Visit the application URL
2. Enter a topic for your quiz
3. Answer the multiple-choice questions
4. Receive instant feedback and explanations
5. Continue with adaptive questions based on your performance

## 🔧 Configuration Validation

Use the built-in validator to ensure your environment configurations are correct:

```powershell
cd config
node validate-config.js
```

This will check:
- ✅ Required fields presence
- ✅ Data type validation
- ✅ Environment-specific settings
- ⚠️ Best practice recommendations

## 🚀 Adding New Environments

To add a new environment (e.g., staging):

1. Create `config/environments/staging.json` with appropriate settings
2. Copy and modify one of the existing GitHub Actions workflows
3. Update the validator script to include the new environment
4. Add the environment to the local deployment script

## 📝 Project Structure

```
BedrockApp/
├── .github/workflows/          # GitHub Actions CI/CD
│   ├── deploy-lambda.yml       # Production deployment
│   └── deploy-dev.yml          # Development deployment
├── backend/                    # Lambda function code
│   ├── src/handlers/
│   │   └── queryBedrock.js     # Main Lambda handler
│   ├── src/utils/
│   │   └── bedrockClient.js    # Bedrock API client
│   └── package.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.js              # Main React component
│   │   ├── Quiz.js             # Quiz interface
│   │   ├── api.js              # API client
│   │   └── styles.css          # Application styles
│   └── package.json
├── infrastructure/             # CloudFormation templates
│   ├── bedrock-query-template.yaml    # Main infrastructure
│   └── ssl-certificate-template.yaml # SSL certificate
├── config/                     # Environment configurations
│   ├── environments/
│   │   ├── dev.json            # Development config
│   │   └── prod.json           # Production config
│   └── validate-config.js      # Config validator
├── deploy-local.js             # Local deployment script
└── README.md                   # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes
4. Ensure all configurations validate
5. Test in development environment
6. Submit a pull request

## 📜 License

MIT License - feel free to use this project as a template for your own AWS serverless applications!

---

**Built with ❤️ using AWS Bedrock, Lambda, React, and CloudFormation**