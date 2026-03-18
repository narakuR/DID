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
