import { Platform } from 'react-native';

const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME || 'did';
const localHostAlias =
  process.env.EXPO_PUBLIC_LOCALHOST_ALIAS ||
  (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

export const APP_CONFIG = {
  env: process.env.EXPO_PUBLIC_APP_ENV || 'local',
  scheme: appScheme,
  localHostAlias,
  issuanceRedirectUri:
    process.env.EXPO_PUBLIC_OID4VCI_REDIRECT_URI || `${appScheme}://oid4vci`,
  presentationRedirectUri:
    process.env.EXPO_PUBLIC_OID4VP_REDIRECT_URI || `${appScheme}://oid4vp`,
} as const;
