# 📱 InvoicePe Internal Distribution System

Complete setup for sharing your InvoicePe app with partners without App Store/Play Store.

## 🎯 Overview

This system allows you to:
- **Build native apps** for iOS and Android
- **Share via direct links** - no app stores needed
- **Professional installation** experience for partners
- **Easy updates** when you release new versions

## 🚀 Quick Start

### Option 1: Quick Deploy (Recommended)
```bash
# Build and get share links automatically
pnpm run quick:deploy:wait
```

### Option 2: Manual Process
```bash
# 1. Build apps
pnpm run build:internal

# 2. Wait 15-20 minutes for builds to complete

# 3. Generate share links
pnpm run share:app
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `pnpm run build:internal` | Start builds for both platforms |
| `pnpm run share:app` | Generate download links from completed builds |
| `pnpm run quick:deploy` | Build and exit (check manually later) |
| `pnpm run quick:deploy:wait` | Build and wait for completion |

## 🔧 Setup Requirements

### First Time Setup
1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to EAS**:
   ```bash
   eas login
   ```

3. **Verify environment variables** are set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Other required env vars from your `.env` file

## 📱 Distribution Process

### Step 1: Build Apps
```bash
pnpm run build:internal
```
- Builds both iOS and Android versions
- Takes 15-20 minutes
- Runs on EAS cloud servers
- You'll get email notifications when complete

### Step 2: Generate Share Links
```bash
pnpm run share:app
```
- Fetches download URLs from completed builds
- Creates shareable content
- Generates installation instructions
- Saves sharing template

### Step 3: Share with Partner
- Copy the download links from the output
- Send via WhatsApp, Email, or SMS
- Include the installation guide if needed

## 📊 Build Profiles

### Internal Profile
- **Distribution**: Internal (no app store)
- **iOS**: Release build with auto-increment
- **Android**: APK build with auto-increment
- **Optimized**: For production use

## 🎯 Partner Installation

### Android
1. Click download link → Download APK
2. Allow "Install from unknown sources"
3. Install and launch

### iOS
1. Click download link → Download via TestFlight-like system
2. Trust developer certificate in Settings
3. Install and launch

## 📁 Generated Files

| File | Purpose |
|------|---------|
| `build-info.json` | Build metadata and status |
| `share-info.json` | Shareable content and links |
| `SHARE_TEMPLATE.md` | Formatted sharing template |

## 🔄 Updates

### For New Versions
1. Update version in `app.config.js`
2. Run `pnpm run quick:deploy:wait`
3. Share new links with partners

### For Hot Fixes
- Use EAS Updates for JavaScript-only changes
- Full rebuilds for native changes

## 🛠️ Troubleshooting

### Build Issues
- **Not logged in**: Run `eas login`
- **Missing env vars**: Check your `.env` file
- **Build fails**: Check EAS dashboard for details

### Sharing Issues
- **No builds found**: Run `pnpm run build:internal` first
- **Old builds**: Builds are sorted by date, latest first
- **Invalid links**: Builds expire after 30 days

### Partner Installation Issues
- **Android blocked**: Enable "Unknown sources" in settings
- **iOS untrusted**: Trust developer in Settings > General > Device Management
- **Download fails**: Check internet connection and storage space

## 📞 Support

### For Build Issues
1. Check EAS dashboard: https://expo.dev
2. Review build logs for errors
3. Verify environment configuration

### For Installation Issues
1. Share `PARTNER_INSTALLATION_GUIDE.md` with partner
2. Check device compatibility requirements
3. Try downloading again

## 🎉 Success Metrics

### Build Success
- ✅ Both iOS and Android builds complete
- ✅ Download links generated
- ✅ Apps install successfully on test devices

### Partner Success
- ✅ Partner receives links
- ✅ Partner installs on their devices
- ✅ Apps launch and function correctly
- ✅ Partner can use all features

## 💡 Tips

1. **Test first**: Install on your own devices before sharing
2. **Clear instructions**: Include installation guide for partners
3. **Monitor builds**: Check EAS dashboard for build status
4. **Version control**: Keep track of which version you shared
5. **Backup links**: Save download links for future reference

---

**Ready to share your app?** Run `pnpm run quick:deploy:wait` and get shareable links in 20 minutes!
