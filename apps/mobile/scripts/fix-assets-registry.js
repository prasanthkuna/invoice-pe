#!/usr/bin/env node

/**
 * Fix for React Native 0.74.5 + Expo SDK 51 compatibility
 * Creates the missing @react-native/assets-registry module that expo-asset expects
 */

const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../node_modules/@react-native/assets-registry');
const targetFile = path.join(targetDir, 'registry.js');
const packageJsonFile = path.join(targetDir, 'package.json');

// Create directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('✅ Created @react-native/assets-registry directory');
}

// Create the registry.js file
const registryContent = `// Compatibility shim for React Native 0.74.5 + Expo SDK 51
// This file provides the missing @react-native/assets-registry/registry module
// that expo-asset expects but doesn't exist in RN 0.74.5

module.exports = require('react-native/Libraries/Image/AssetRegistry');
`;

fs.writeFileSync(targetFile, registryContent);
console.log('✅ Created @react-native/assets-registry/registry.js');

// Create a minimal package.json
const packageJsonContent = {
  "name": "@react-native/assets-registry",
  "version": "0.74.5-compat",
  "description": "Compatibility shim for React Native 0.74.5",
  "main": "registry.js"
};

fs.writeFileSync(packageJsonFile, JSON.stringify(packageJsonContent, null, 2));
console.log('✅ Created @react-native/assets-registry/package.json');

console.log('🎉 Assets registry compatibility fix applied successfully!');
