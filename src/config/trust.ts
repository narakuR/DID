export const TRUST_CONFIG = {
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
} as const;
