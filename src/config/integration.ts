import { APP_CONFIG } from './app';
import { CREDENTIALS_CONFIG } from './credentials';
import { PROFILES_CONFIG } from './profiles';
import { TRUST_CONFIG } from './trust';

export const INTEGRATION_CONFIG = {
  app: APP_CONFIG,
  issuer: PROFILES_CONFIG.issuer,
  verifier: PROFILES_CONFIG.verifier,
  credentials: CREDENTIALS_CONFIG,
  dev: TRUST_CONFIG,
} as const;

export type SupportedCredentialKey = keyof typeof INTEGRATION_CONFIG.credentials;
