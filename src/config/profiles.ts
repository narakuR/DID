import { APP_CONFIG } from './app';

const issuerBaseUrl =
  process.env.EXPO_PUBLIC_ISSUER_BASE_URL ||
  `http://${APP_CONFIG.localHostAlias}/pid-issuer`;
const verifierBaseUrl =
  process.env.EXPO_PUBLIC_VERIFIER_BASE_URL ||
  `http://${APP_CONFIG.localHostAlias}:8080`;

export const PROFILES_CONFIG = {
  issuer: {
    baseUrl: issuerBaseUrl,
    offerCreateUrl:
      process.env.EXPO_PUBLIC_ISSUER_OFFER_CREATE_URL ||
      `${issuerBaseUrl}/issuer/credentialsOffer/create`,
    authorizationServerBaseUrl:
      process.env.EXPO_PUBLIC_ISSUER_AUTHORIZATION_SERVER_BASE_URL ||
      `http://${APP_CONFIG.localHostAlias}/idp`,
    clientId: process.env.EXPO_PUBLIC_ISSUER_CLIENT_ID || 'wallet-dev',
    entryMode: process.env.EXPO_PUBLIC_ISSUER_ENTRY_MODE || 'test-issuer',
    authMode: process.env.EXPO_PUBLIC_ISSUER_AUTH_MODE || 'authorization_code',
  },
  verifier: {
    baseUrl: verifierBaseUrl,
    initTransactionUrl:
      process.env.EXPO_PUBLIC_VERIFIER_INIT_TRANSACTION_URL ||
      `${verifierBaseUrl}/ui/presentations`,
    requestScheme:
      process.env.EXPO_PUBLIC_VERIFIER_REQUEST_SCHEME || 'openid4vp',
    defaultResponseMode:
      process.env.EXPO_PUBLIC_VERIFIER_RESPONSE_MODE || 'direct_post',
    defaultJarMode:
      process.env.EXPO_PUBLIC_VERIFIER_JAR_MODE || 'by_reference',
  },
} as const;
