#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📱 InvoicePe App Sharing Tool\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Function to get recent builds
function getRecentBuilds() {
  return new Promise((resolve, reject) => {
    log('🔍 Fetching recent builds...', 'cyan');
    
    exec('eas build:list --limit=10 --json', (error, stdout) => {
      if (error) {
        logError('Failed to fetch builds. Make sure you\'re logged in to EAS.');
        reject(error);
        return;
      }

      try {
        const builds = JSON.parse(stdout);
        const internalBuilds = builds.filter(build =>
          (build.buildProfile === 'internal' || build.buildProfile === 'production') &&
          build.status === 'FINISHED' &&
          build.artifacts?.buildUrl
        );

        if (internalBuilds.length === 0) {
          logWarning('No completed builds found.');
          logWarning('Run `pnpm run build:production` or `pnpm run build:internal` first to create builds.');
          resolve([]);
          return;
        }

        resolve(internalBuilds);
      } catch (parseError) {
        logError('Failed to parse build data');
        reject(parseError);
      }
    });
  });
}

// Function to generate QR code (simple text-based for now)
function generateQRCode(url, platform) {
  // For now, we'll provide the URL and suggest QR generation
  // In a more advanced version, we could use a QR code library
  return {
    url: url,
    platform: platform,
    qrSuggestion: `Generate QR code for: ${url}`
  };
}

// Function to create shareable content
function createShareableContent(builds) {
  log('\n📋 Creating shareable content...', 'cyan');

  const iosBuilds = builds.filter(b => b.platform === 'ios');
  const androidBuilds = builds.filter(b => b.platform === 'android');

  const latestIOS = iosBuilds[0];
  const latestAndroid = androidBuilds[0];

  const shareContent = {
    timestamp: new Date().toISOString(),
    appName: 'InvoicePe',
    version: latestIOS?.appVersion || latestAndroid?.appVersion || '1.0.0',
    builds: {
      ios: latestIOS ? {
        url: latestIOS.artifacts.buildUrl,
        buildId: latestIOS.id,
        createdAt: latestIOS.createdAt,
        qr: generateQRCode(latestIOS.artifacts.buildUrl, 'iOS')
      } : null,
      android: latestAndroid ? {
        url: latestAndroid.artifacts.buildUrl,
        buildId: latestAndroid.id,
        createdAt: latestAndroid.createdAt,
        qr: generateQRCode(latestAndroid.artifacts.buildUrl, 'Android')
      } : null
    }
  };

  // Save to file
  const shareFilePath = path.join(__dirname, 'share-info.json');
  fs.writeFileSync(shareFilePath, JSON.stringify(shareContent, null, 2));

  return shareContent;
}

// Function to display sharing information
function displaySharingInfo(shareContent) {
  log('\n🎉 InvoicePe App Ready for Sharing!', 'green');
  log('=' .repeat(50), 'bright');

  log(`\n📱 App: ${shareContent.appName}`, 'bright');
  log(`📦 Version: ${shareContent.version}`, 'bright');
  log(`🕒 Generated: ${new Date(shareContent.timestamp).toLocaleString()}`, 'bright');

  if (shareContent.builds.android) {
    log('\n🤖 ANDROID VERSION', 'green');
    log('─'.repeat(30));
    log(`📱 Direct Download: ${shareContent.builds.android.url}`, 'blue');
    log(`🆔 Build ID: ${shareContent.builds.android.buildId}`);
    log(`📅 Created: ${new Date(shareContent.builds.android.createdAt).toLocaleString()}`);
  }

  if (shareContent.builds.ios) {
    log('\n🍎 iOS VERSION', 'green');
    log('─'.repeat(30));
    log(`📱 Direct Download: ${shareContent.builds.ios.url}`, 'blue');
    log(`🆔 Build ID: ${shareContent.builds.ios.buildId}`);
    log(`📅 Created: ${new Date(shareContent.builds.ios.createdAt).toLocaleString()}`);
  }

  log('\n📋 SHARING INSTRUCTIONS', 'cyan');
  log('─'.repeat(30));
  log('1. Copy the download links above');
  log('2. Send to your partner via WhatsApp/Email/SMS');
  log('3. Partner clicks link → Downloads app → Installs');
  log('4. No App Store needed! Direct installation');

  log('\n💡 INSTALLATION NOTES', 'yellow');
  log('─'.repeat(30));
  log('📱 Android: May need to allow "Install from unknown sources"');
  log('🍎 iOS: May need to trust developer certificate in Settings');
  log('🔄 Updates: Run this process again for new versions');

  log('\n🎯 QUICK SHARE MESSAGE', 'magenta');
  log('─'.repeat(30));
  log('Copy this message to send to your partner:');
  log('');
  log(`🚀 InvoicePe App v${shareContent.version} is ready!`, 'bright');
  
  if (shareContent.builds.android) {
    log(`\n📱 Android: ${shareContent.builds.android.url}`, 'blue');
  }
  
  if (shareContent.builds.ios) {
    log(`🍎 iOS: ${shareContent.builds.ios.url}`, 'blue');
  }
  
  log('\nJust click the link for your device and install! 🎉');
}

// Function to save sharing template
function saveShareTemplate(shareContent) {
  const template = `
# InvoicePe App Distribution

## App Information
- **Name**: ${shareContent.appName}
- **Version**: ${shareContent.version}
- **Generated**: ${new Date(shareContent.timestamp).toLocaleString()}

## Download Links

${shareContent.builds.android ? `### Android
- **Download**: ${shareContent.builds.android.url}
- **Build ID**: ${shareContent.builds.android.buildId}
- **Created**: ${new Date(shareContent.builds.android.createdAt).toLocaleString()}
` : '### Android\n- No Android build available\n'}

${shareContent.builds.ios ? `### iOS
- **Download**: ${shareContent.builds.ios.url}
- **Build ID**: ${shareContent.builds.ios.buildId}
- **Created**: ${new Date(shareContent.builds.ios.createdAt).toLocaleString()}
` : '### iOS\n- No iOS build available\n'}

## Installation Instructions

### Android
1. Click the Android download link
2. Download the APK file
3. Allow "Install from unknown sources" if prompted
4. Install the app

### iOS
1. Click the iOS download link
2. Follow iOS installation prompts
3. Trust developer certificate in Settings > General > Device Management
4. Launch the app

## Support
If you have any issues installing the app, please contact the development team.
`;

  const templatePath = path.join(__dirname, 'SHARE_TEMPLATE.md');
  fs.writeFileSync(templatePath, template);
  logSuccess('Share template saved to SHARE_TEMPLATE.md');
}

// Main sharing function
async function shareApp() {
  try {
    log('🎯 Preparing InvoicePe for sharing...', 'bright');

    // Get recent builds
    const builds = await getRecentBuilds();
    
    if (builds.length === 0) {
      log('\n❌ No builds available to share', 'red');
      log('💡 Run `pnpm run build:internal` first to create builds', 'yellow');
      return;
    }

    // Create shareable content
    const shareContent = createShareableContent(builds);

    // Display sharing information
    displaySharingInfo(shareContent);

    // Save template
    saveShareTemplate(shareContent);

    log('\n✨ Ready to share! Copy the links above and send to your partner.', 'green');

  } catch (error) {
    logError(`Sharing failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the sharing process
shareApp();
