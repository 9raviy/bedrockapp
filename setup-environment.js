/**
 * Environment Setup Script
 * 
 * This script helps you configure the environment-specific settings
 * by creating the required configuration files from templates.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupEnvironment() {
  console.log('🚀 BedrockApp Environment Setup');
  console.log('================================\n');

  console.log('This script will help you configure your environment settings.');
  console.log('Please provide the following information:\n');

  // Collect user inputs
  const projectName = await ask('Project name (e.g., bedrock-quiz): ');
  const domainName = await ask('Your domain name (e.g., yourdomain.com): ');
  const subdomainProd = await ask('Production subdomain (e.g., quiz): ');
  const subdomainDev = await ask('Development subdomain (e.g., dev-quiz): ');
  const hostedZoneId = await ask('Route 53 Hosted Zone ID: ');
  const awsRegion = await ask('AWS Region (default: us-west-2): ') || 'us-west-2';

  console.log('\n📝 Creating configuration files...\n');

  // Create production config
  const prodConfig = {
    projectName: projectName,
    environment: "prod",
    domain: {
      domainName: domainName,
      subdomainName: subdomainProd,
      hostedZoneId: hostedZoneId,
      customUrl: `https://${subdomainProd}.${domainName}`
    },
    backend: {
      runtime: "nodejs20.x",
      timeout: 15,
      memory: 128,
      handler: "src/handlers/queryBedrock.handler",
      environment: {
        BEDROCK_MODEL_ID: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        LOG_LEVEL: "INFO"
      }
    },
    frontend: {
      buildCommand: "npm run build",
      buildDir: "build",
      caching: {
        staticAssets: "max-age=31536000",
        htmlFiles: "no-cache, no-store, must-revalidate"
      }
    },
    infrastructure: {
      region: awsRegion,
      sslRegion: "us-east-1",
      stackName: `${projectName}-prod-stack`
    },
    features: {
      enableSSL: true,
      enableCloudFront: true,
      enableCustomDomain: true,
      enableMonitoring: false
    }
  };

  // Create development config
  const devConfig = {
    ...prodConfig,
    environment: "dev",
    domain: {
      ...prodConfig.domain,
      subdomainName: subdomainDev,
      customUrl: `https://${subdomainDev}.${domainName}`
    },
    backend: {
      ...prodConfig.backend,
      timeout: 30,
      memory: 256,
      environment: {
        ...prodConfig.backend.environment,
        LOG_LEVEL: "DEBUG"
      }
    },
    frontend: {
      ...prodConfig.frontend,
      caching: {
        staticAssets: "max-age=86400",
        htmlFiles: "no-cache, no-store, must-revalidate"
      }
    },
    infrastructure: {
      ...prodConfig.infrastructure,
      stackName: `${projectName}-dev-stack`
    },
    features: {
      ...prodConfig.features,
      enableMonitoring: true
    }
  };

  // Write configuration files
  const configDir = path.join(__dirname, 'config', 'environments');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, 'prod.json'),
    JSON.stringify(prodConfig, null, 2)
  );

  fs.writeFileSync(
    path.join(configDir, 'dev.json'),
    JSON.stringify(devConfig, null, 2)
  );

  console.log('✅ Created config/environments/prod.json');
  console.log('✅ Created config/environments/dev.json\n');

  console.log('🎉 Environment setup completed!\n');
  console.log('Next steps:');
  console.log('1. Set up GitHub Secrets (see GITHUB-SECRETS-SETUP.md.template)');
  console.log('2. Run: git add . && git commit -m "Add environment configuration"');
  console.log('3. Deploy: git push origin main (for production)');
  console.log('           git push origin develop (for development)\n');

  rl.close();
}

setupEnvironment().catch(console.error);
