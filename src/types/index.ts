export enum IssuerType {
  GOVERNMENT = 'GOVERNMENT',
  EDUCATION = 'EDUCATION',
  HEALTH = 'HEALTH',
  FINANCIAL = 'FINANCIAL',
  TRANSPORT = 'TRANSPORT',
  EMPLOYMENT = 'EMPLOYMENT',
  IDENTITY = 'IDENTITY',
  TRAVEL = 'TRAVEL',
}

export interface CredentialSubject {
  id?: string;
  [key: string]: string | number | boolean | object | undefined;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string; // urn:uuid:...
  type: string[];
  issuer: {
    id: string; // DID
    name: string;
    type: IssuerType;
    country?: string;
  };
  issuanceDate: string; // ISO 8601
  expirationDate: string; // ISO 8601
  credentialSubject: CredentialSubject;
  status?: 'active' | 'revoked';
  visual?: {
    title: string;
    description?: string;
    gradientKey: string; // key into GRADIENT_MAP
  };
  /** 原始凭证字符串（SD-JWT token / base64url CBOR），供 VP 出示时使用。不参与 UI 展示。 */
  _raw?: string;
  /** 凭证格式标识符，与 ICredentialFormat.name 对应 */
  _format?: 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';
}

/**
 * Persistent credential record that separates raw token, parsed metadata, and
 * the display model. This is the authoritative store for credential data — the
 * walletStore holds only the displayModel for UI rendering.
 */
export interface StoredCredential {
  /** Matches displayModel.id */
  id: string;
  format: 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';
  /** Original raw credential string (SD-JWT token / base64url CBOR) */
  raw: string;
  storedAt: string; // ISO 8601
  displayModel: VerifiableCredential;
}

export interface ActivityLog {
  id: string;
  credentialId: string;
  credentialName: string;
  action: 'PRESENTED' | 'RECEIVED' | 'REVOKED';
  institution: string;
  timestamp: string; // ISO 8601
}

export interface ActivityGraphPoint {
  day: string; // e.g. 'Mon'
  value: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  phone: string;
  authMethod: AuthMethod;
  createdAt: string;
}

export interface CloudSyncState {
  enabled: boolean;
  lastSyncAt: string | null;
}

export type AuthMethod = 'BIO' | 'PIN';

export type DIDMethod = 'did:key' | 'did:jwk' | 'did:web' | 'did:ebsi' | 'did:ion';

export type KeyAlgorithm = 'Ed25519' | 'ES256K' | 'P-256';

export interface DIDPrivateKeyRecord {
  keyId: string;
  algorithm: KeyAlgorithm;
  privateKeyBase64: string;
  createdAt: string;
}

export interface DIDDocument {
  '@context': ['https://www.w3.org/ns/did/v1', ...string[]];
  id: string;
  verificationMethod: {
    id: string;
    type: 'Ed25519VerificationKey2020' | 'EcdsaSecp256k1VerificationKey2019' | 'JsonWebKey2020';
    controller: string;
    publicKeyMultibase: string;
    publicKeyJwk?: Record<string, string>;
  }[];
  authentication: string[];
  assertionMethod: string[];
  created: string;
  updated: string;
}

export interface DIDMetadata {
  did: string;
  method: DIDMethod;
  algorithm: KeyAlgorithm;
  keyId: string;
  publicKeyMultibase: string;
  registeredAt: string;
  status: 'active' | 'rotated' | 'deactivated';
}

export type PushNotificationCategory =
  | 'CREDENTIAL_EXPIRY'
  | 'CREDENTIAL_REVOKED'
  | 'CREDENTIAL_ISSUED'
  | 'VERIFICATION_REQUEST'
  | 'SYSTEM'
  | 'BACKUP_REMINDER';

export interface PushNotificationRecord {
  id: string;
  category: PushNotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  receivedAt: string;
  isRead: boolean;
  actionTaken?: string;
}

export type Language = 'en' | 'zh' | 'es' | 'fr' | 'pt' | 'ar';

export type Theme = 'light' | 'dark';

export interface CredentialStatusInfo {
  status: 'active' | 'revoked' | 'expired' | 'near_expiry';
  isExpired: boolean;
  isNearExpiry: boolean;
  isRevoked: boolean;
  daysUntilExpiry: number;
}

export enum ServiceCategory {
  HEALTH = 'HEALTH',
  FINANCIAL = 'FINANCIAL',
  TRANSPORT = 'TRANSPORT',
  GOVERNMENT = 'GOVERNMENT',
  EDUCATION = 'EDUCATION',
  UTILITIES = 'UTILITIES',
}

export interface ServiceItem {
  id: string;
  name: string;
  provider: string;
  category: ServiceCategory;
  description: string;
  requiredCredentials: string[];
  iconColor: string;
}

export type NotificationType = 'error' | 'warning' | 'success' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  credentialId?: string;
  credentialName?: string;
}
