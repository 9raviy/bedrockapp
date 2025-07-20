#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Validates the structure and content of environment configuration files
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = {
  projectName: 'string',
  environment: 'string',
  domain: {
    domainName: 'string',
    subdomainName: 'string',
    hostedZoneId: 'string',
    customUrl: 'string'
  },
  backend: {
    runtime: 'string',
    timeout: 'number',
    memory: 'number',
    handler: 'string',
    environment: 'object'
  },
  frontend: {
    buildCommand: 'string',
    buildDir: 'string',
    caching: 'object'
  },
  infrastructure: {
    region: 'string',
    sslRegion: 'string',
    stackName: 'string'
  },
  features: 'object'
};

function validateType(value, expectedType, path = '') {
  if (expectedType === 'object' && typeof value === 'object' && value !== null) {
    return true;
  }
  if (typeof value !== expectedType) {
    console.error(`❌ Type mismatch at ${path}: expected ${expectedType}, got ${typeof value}`);
    return false;
  }
  return true;
}

function validateConfig(config, schema, basePath = '') {
  let isValid = true;
  
  for (const [key, expectedType] of Object.entries(schema)) {
    const currentPath = basePath ? `${basePath}.${key}` : key;
    
    if (!(key in config)) {
      console.error(`❌ Missing required field: ${currentPath}`);
      isValid = false;
      continue;
    }
    
    if (typeof expectedType === 'object') {
      if (!validateType(config[key], 'object', currentPath)) {
        isValid = false;
      } else {
        isValid = validateConfig(config[key], expectedType, currentPath) && isValid;
      }
    } else {
      isValid = validateType(config[key], expectedType, currentPath) && isValid;
    }
  }
  
  return isValid;
}

function validateEnvironmentConfig(environment) {
  const configPath = path.join(__dirname, 'environments', `${environment}.json`);
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log(`\n🔍 Validating ${environment} environment configuration...`);
    
    const isValid = validateConfig(config, REQUIRED_FIELDS);
    
    if (isValid) {
      console.log(`✅ ${environment} configuration is valid`);
      
      // Additional environment-specific validations
      if (config.environment !== environment) {
        console.warn(`⚠️  Environment mismatch: file is ${environment}.json but environment field is '${config.environment}'`);
      }
      
      if (environment === 'prod') {
        if (config.backend.environment.LOG_LEVEL !== 'INFO') {
          console.warn(`⚠️  Production should use LOG_LEVEL=INFO, found: ${config.backend.environment.LOG_LEVEL}`);
        }
      }
      
      if (environment === 'dev') {
        if (config.backend.environment.LOG_LEVEL !== 'DEBUG') {
          console.warn(`⚠️  Development should use LOG_LEVEL=DEBUG, found: ${config.backend.environment.LOG_LEVEL}`);
        }
      }
      
      console.log(`   📋 Project: ${config.projectName}`);
      console.log(`   🌐 URL: ${config.domain.customUrl}`);
      console.log(`   📦 Stack: ${config.infrastructure.stackName}`);
    } else {
      console.error(`❌ ${environment} configuration is invalid`);
    }
    
    return isValid;
  } catch (error) {
    console.error(`❌ Error parsing ${environment} configuration: ${error.message}`);
    return false;
  }
}

function main() {
  const environments = ['dev', 'prod'];
  let allValid = true;
  
  console.log('🔧 BedrockApp Environment Configuration Validator');
  console.log('=' .repeat(50));
  
  for (const env of environments) {
    allValid = validateEnvironmentConfig(env) && allValid;
  }
  
  console.log('\n' + '=' .repeat(50));
  if (allValid) {
    console.log('✅ All environment configurations are valid!');
    process.exit(0);
  } else {
    console.log('❌ Some configurations are invalid. Please fix the errors above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateEnvironmentConfig, validateConfig };
