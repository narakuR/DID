export const CONFIG = {
  INACTIVITY_LIMIT_MS: 5 * 60 * 1000, // 5 minutes
  OTP_DEMO_CODE: '123456',
  OTP_RESEND_COOLDOWN_S: 30,
  PHONE_MIN_CHARS: 8,
  BIOMETRIC_SIM_MS: 1500,
  SERVICE_FLOW_STEPS_MS: {
    CONNECT: 1500,
    AUTH: 2000,
    SHARE: 2000,
    SUCCESS: 1500,
    REDIRECT: 1500,
  },
  ISSUANCE_STEPS_MS: {
    CONNECTING: 1500,
    AUTHENTICATING: 1500,
    ISSUING: 2000,
    SUCCESS: 1500,
  },
  RENEWAL_YEARS: 5,
  NEAR_EXPIRY_DAYS: 90, // credentials expiring within 90 days
  CLOUD_PASSWORD_MIN_CHARS: 4,
  QR_PRESENT_TIMEOUT_S: 300, // 5 minutes
  RESTORE_PROGRESS_STAGES: [
    { label: 'Downloading backup…', from: 0, to: 40 },
    { label: 'Verifying integrity…', from: 40, to: 70 },
    { label: 'Decrypting data…', from: 70, to: 90 },
    { label: 'Importing credentials…', from: 90, to: 100 },
  ],
} as const;

export const STORAGE_KEYS = {
  CREDENTIALS: '@did_wallet/credentials',
  STORED_CREDENTIALS: '@did_wallet/stored_credentials',
  AUTH_STATE: '@did_wallet/auth_state',
  SETTINGS: '@did_wallet/settings',
  ACTIVITY_LOGS: '@did_wallet/activity_logs',
  DID_METADATA: '@did_wallet/did_metadata',
  DID_DOCUMENT: '@did_wallet/did_document',
  DEVICE_PUSH_TOKEN: '@did_wallet/device_push_token',
  NOTIFICATIONS: '@did_wallet/notifications',
} as const;

export const SECURE_STORE_KEYS = {
  PIN: 'did_wallet_pin',
  CLOUD_KEY: 'did_wallet_cloud_key',
  DID_PRIVATE_KEY_PREFIX: 'did_wallet_did_pk_',
} as const;
