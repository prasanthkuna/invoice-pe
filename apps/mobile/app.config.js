import 'dotenv/config';

export default {
  expo: {
    name: "InvoicePe",
    slug: "invoicepe",
    version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "invoicepe",
    description: "Smart invoice management with seamless payments - Create, manage, and pay invoices with PhonePe integration",

    platforms: ["ios", "android", "web"],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.prasanthkuna.invoicepe",
      appleTeamId: "VWZAFH2ZDV",
      buildNumber: "1",
      deploymentTarget: "15.1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "InvoicePe needs camera access to scan and capture invoice photos for easy record keeping.",
        NSPhotoLibraryUsageDescription: "InvoicePe needs photo library access to select invoice images from your gallery.",
        NSContactsUsageDescription: "InvoicePe can access contacts to quickly add vendor information (optional).",
        NSLocationWhenInUseUsageDescription: "InvoicePe can use location to auto-fill business addresses (optional).",
        NSUserNotificationsUsageDescription: "InvoicePe sends notifications for payment confirmations and invoice updates."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },

      package: "com.invoicepe.beta",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_CONTACTS",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK"
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-asset",
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "15.1",
            useFrameworks: "static",
            privacyManifestAggregationEnabled: true,
            flipper: false
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            buildToolsVersion: "33.0.0",
            enableProguardInReleaseBuilds: true,
            enableHermes: true,
            enableShrinkResourcesInReleaseBuilds: true,
            useLegacyPackaging: false,
            packagingOptions: {
              pickFirst: ["**/libc++_shared.so", "**/libjsc.so"]
            }
          }
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "InvoicePe needs camera access to scan and capture invoice photos for easy record keeping."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "InvoicePe needs photo library access to select invoice images from your gallery."
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "InvoicePe can access contacts to quickly add vendor information (optional)."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "InvoicePe can use location to auto-fill business addresses (optional).",
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: false
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#ffffff",
          defaultChannel: "default"
        }
      ]
    ],
    experiments: {
      typedRoutes: false
    },
    extra: {
      eas: {
        projectId: "18541abf-f0a9-4c86-a226-abf9471c625a"
      },
      // Environment variables accessible via expo-constants
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      phonepeEnvironment: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
      // PhonePe credentials based on environment
      phonepeMerchantId: process.env.EXPO_PUBLIC_ENVIRONMENT === "production" 
        ? process.env.EXPO_PUBLIC_PHONEPE_MERCHANT_ID 
        : process.env.EXPO_PUBLIC_PHONEPE_UAT_MERCHANT_ID,
      phonepeSaltKey: process.env.EXPO_PUBLIC_ENVIRONMENT === "production"
        ? process.env.EXPO_PUBLIC_PHONEPE_SALT_KEY
        : process.env.EXPO_PUBLIC_PHONEPE_UAT_SALT_KEY,
      phonepeKeyIndex: process.env.EXPO_PUBLIC_ENVIRONMENT === "production"
        ? process.env.EXPO_PUBLIC_PHONEPE_KEY_INDEX
        : process.env.EXPO_PUBLIC_PHONEPE_UAT_KEY_INDEX,
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
      apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || "30000")
    }
  }
};
