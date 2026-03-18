import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DID',
  slug: 'DID',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/images/icon.png',
  scheme: 'did',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.did.wallet',
    infoPlist: {
      NSCameraUsageDescription: 'Used to scan QR codes for credential issuance',
      NSFaceIDUsageDescription: 'Used to authenticate and unlock your wallet',
    },
  },
  android: {
    package: 'com.did.wallet',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './src/assets/images/android-icon-foreground.png',
      backgroundImage: './src/assets/images/android-icon-background.png',
      monochromeImage: './src/assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  web: {
    output: 'static',
    favicon: './src/assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './src/assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Used to scan QR codes for credential issuance',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Used to authenticate and unlock your wallet',
      },
    ],
    'expo-secure-store',
    'expo-localization',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
        },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 30,
        },
      },
    ],
  ],
  extra: {
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    eas: {
      projectId: 'your-project-id',
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
