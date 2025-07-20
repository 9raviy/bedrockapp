#!/usr/bin/env node

/**
 * GitHub Actions Workflow Monitor
 * Monitors the status of GitHub Actions workflows
 */

const { execSync } = require('child_process');

function checkWorkflowStatus() {
  try {
    console.log('🔍 Checking GitHub Actions workflow status...\n');
    
    // Get recent workflow runs
    const result = execSync('gh run list --limit 5 --json status,name,conclusion,createdAt,url', { encoding: 'utf8' });
    const workflows = JSON.parse(result);
    
    if (workflows.length === 0) {
      console.log('ℹ️  No recent workflow runs found');
      return;
    }
    
    console.log('📊 Recent Workflow Runs:');
    console.log('=' .repeat(80));
    
    workflows.forEach((workflow, index) => {
      const status = workflow.status;
      const conclusion = workflow.conclusion || 'running';
      const name = workflow.name;
      const createdAt = new Date(workflow.createdAt).toLocaleString();
      const url = workflow.url;
      
      let statusIcon = '';
      switch (status) {
        case 'completed':
          statusIcon = conclusion === 'success' ? '✅' : '❌';
          break;
        case 'in_progress':
          statusIcon = '🔄';
          break;
        case 'queued':
          statusIcon = '⏳';
          break;
        default:
          statusIcon = '❓';
      }
      
      console.log(`${statusIcon} ${name}`);
      console.log(`   Status: ${status} ${conclusion ? `(${conclusion})` : ''}`);
      console.log(`   Started: ${createdAt}`);
      console.log(`   URL: ${url}`);
      console.log('');
    });
    
    // Check if we have both dev and prod deployments
    const devDeployment = workflows.find(w => w.name.includes('Development'));
    const prodDeployment = workflows.find(w => w.name.includes('Production'));
    
    console.log('🎯 Environment Status Summary:');
    console.log('-' .repeat(40));
    
    if (devDeployment) {
      const devStatus = devDeployment.status === 'completed' ? 
        (devDeployment.conclusion === 'success' ? '✅ Success' : '❌ Failed') : 
        '🔄 Running';
      console.log(`Development: ${devStatus}`);
    } else {
      console.log('Development: ❓ No recent runs');
    }
    
    if (prodDeployment) {
      const prodStatus = prodDeployment.status === 'completed' ? 
        (prodDeployment.conclusion === 'success' ? '✅ Success' : '❌ Failed') : 
        '🔄 Running';
      console.log(`Production: ${prodStatus}`);
    } else {
      console.log('Production: ❓ No recent runs');
    }
    
  } catch (error) {
    if (error.message.includes('gh: command not found') || error.message.includes('not recognized')) {
      console.log('ℹ️  GitHub CLI (gh) not found. Please install it to monitor workflow status.');
      console.log('   You can check workflows manually at: https://github.com/9raviy/bedrockapp/actions');
    } else {
      console.error('❌ Error checking workflow status:', error.message);
      console.log('\n📝 Manual check: Visit https://github.com/9raviy/bedrockapp/actions');
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const watch = args.includes('--watch') || args.includes('-w');
  
  if (watch) {
    console.log('👀 Watching workflow status (press Ctrl+C to stop)...\n');
    
    checkWorkflowStatus();
    
    const interval = setInterval(() => {
      console.log('\n' + '='.repeat(80));
      console.log(`🔄 Refreshing at ${new Date().toLocaleTimeString()}...\n`);
      checkWorkflowStatus();
    }, 30000); // Check every 30 seconds
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n👋 Stopped monitoring');
      process.exit(0);
    });
    
  } else {
    checkWorkflowStatus();
    console.log('\n💡 Tip: Use --watch flag to monitor continuously');
    console.log('   Example: node monitor-workflows.js --watch');
  }
}

if (require.main === module) {
  main();
}
