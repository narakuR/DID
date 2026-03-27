import { Platform } from 'react-native';

const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME || 'did';
const localHostAlias =
  process.env.EXPO_PUBLIC_LOCALHOST_ALIAS ||
  (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const issuerBaseUrl =
  process.env.EXPO_PUBLIC_ISSUER_BASE_URL ||
  `http://${localHostAlias}/pid-issuer`;
const issuerOfferCreateUrl =
  process.env.EXPO_PUBLIC_ISSUER_OFFER_CREATE_URL ||
  `${issuerBaseUrl}/issuer/credentialsOffer/create`;
const verifierBaseUrl =
  process.env.EXPO_PUBLIC_VERIFIER_BASE_URL ||
  `http://${localHostAlias}:8080`;
const issuerAuthorizationServerBaseUrl =
  process.env.EXPO_PUBLIC_ISSUER_AUTHORIZATION_SERVER_BASE_URL ||
  `http://${localHostAlias}/idp`;
const verifierInitTransactionUrl =
  process.env.EXPO_PUBLIC_VERIFIER_INIT_TRANSACTION_URL ||
  `${verifierBaseUrl}/ui/presentations`;

export const INTEGRATION_CONFIG = {
  app: {
    env: process.env.EXPO_PUBLIC_APP_ENV || 'local',
    scheme: appScheme,
    localHostAlias,
    issuanceRedirectUri:
      process.env.EXPO_PUBLIC_OID4VCI_REDIRECT_URI || `${appScheme}://oid4vci`,
    presentationRedirectUri:
      process.env.EXPO_PUBLIC_OID4VP_REDIRECT_URI || `${appScheme}://oid4vp`,
  },
  issuer: {
    baseUrl: issuerBaseUrl,
    offerCreateUrl: issuerOfferCreateUrl,
    authorizationServerBaseUrl: issuerAuthorizationServerBaseUrl,
    clientId: process.env.EXPO_PUBLIC_ISSUER_CLIENT_ID || 'wallet-dev',
    entryMode: process.env.EXPO_PUBLIC_ISSUER_ENTRY_MODE || 'test-issuer',
    authMode: process.env.EXPO_PUBLIC_ISSUER_AUTH_MODE || 'authorization_code',
  },
  verifier: {
    baseUrl: verifierBaseUrl,
    initTransactionUrl: verifierInitTransactionUrl,
    requestScheme:
      process.env.EXPO_PUBLIC_VERIFIER_REQUEST_SCHEME || 'openid4vp',
    defaultResponseMode:
      process.env.EXPO_PUBLIC_VERIFIER_RESPONSE_MODE || 'direct_post',
    defaultJarMode:
      process.env.EXPO_PUBLIC_VERIFIER_JAR_MODE || 'by_reference',
  },
  credentials: {
    defaultTestCredential:
      process.env.EXPO_PUBLIC_DEFAULT_TEST_CREDENTIAL || 'ehic_sd_jwt_vc',
    ehic: {
      enabled: (process.env.EXPO_PUBLIC_EHIC_ENABLED || 'true') === 'true',
      credentialConfigurationId:
        process.env.EXPO_PUBLIC_EHIC_CREDENTIAL_CONFIGURATION_ID ||
        'urn:eudi:ehic:1:dc+sd-jwt-compact',
      scope:
        process.env.EXPO_PUBLIC_EHIC_SCOPE || 'urn:eudi:ehic:1:dc+sd-jwt',
      vct: process.env.EXPO_PUBLIC_EHIC_VCT || 'urn:eudi:ehic:1',
      label: 'EHIC SD-JWT VC',
    },
    pid: {
      enabled: (process.env.EXPO_PUBLIC_PID_ENABLED || 'true') === 'true',
      credentialConfigurationId:
        process.env.EXPO_PUBLIC_PID_CREDENTIAL_CONFIGURATION_ID ||
        'eu.europa.ec.eudi.pid_vc_sd_jwt',
      scope:
        process.env.EXPO_PUBLIC_PID_SCOPE || 'eu.europa.ec.eudi.pid_vc_sd_jwt',
      vct: process.env.EXPO_PUBLIC_PID_VCT || 'urn:eudi:pid:1',
      label: 'PID SD-JWT VC',
    },
  },
  dev: {
    allowSelfSigned:
      (process.env.EXPO_PUBLIC_ALLOW_SELF_SIGNED_CERT || 'true') === 'true',
    enableTestIssuerMenu:
      (process.env.EXPO_PUBLIC_ENABLE_TEST_ISSUER_MENU || 'true') === 'true',
    enableScanOffer:
      (process.env.EXPO_PUBLIC_ENABLE_SCAN_OFFER || 'true') === 'true',
    enablePasteOffer:
      (process.env.EXPO_PUBLIC_ENABLE_PASTE_OFFER || 'true') === 'true',
    enableVerifierDebugResult:
      (process.env.EXPO_PUBLIC_ENABLE_VERIFIER_DEBUG_RESULT || 'true') ===
      'true',
  },
} as const;

export type SupportedCredentialKey = keyof typeof INTEGRATION_CONFIG.credentials;
