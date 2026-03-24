import { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'fs';
import path from 'path';

export default function defineAppConfig({ config }: ConfigContext): ExpoConfig {
  const googleServicesJsonPath = path.resolve(__dirname, 'google-services.json');
  const googleServiceInfoPlistPath = path.resolve(__dirname, 'GoogleService-Info.plist');
  const hasAndroidFirebaseConfig = fs.existsSync(googleServicesJsonPath);
  const hasIosFirebaseConfig = fs.existsSync(googleServiceInfoPlistPath);

  return {
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
      ...(hasIosFirebaseConfig ? { googleServicesFile: './GoogleService-Info.plist' } : {}),
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
      ...(hasAndroidFirebaseConfig ? { googleServicesFile: './google-services.json' } : {}),
      permissions: [
        'android.permission.CAMERA',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
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
      'expo-notifications',
      'expo-secure-store',
      'expo-localization',
      './plugins/withAndroidFirebaseNativeSetup',
      './plugins/withIosPushConfiguration',
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '15.1',
          },
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 30,
          },
        },
      ],
    ],
    extra: {
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
}
