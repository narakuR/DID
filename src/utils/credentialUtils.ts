import { VerifiableCredential, CredentialStatusInfo } from '@/types';
import { CONFIG } from '@/constants/config';

export function getCredentialStatus(credential: VerifiableCredential): CredentialStatusInfo {
  const now = new Date();
  const expiry = new Date(credential.expirationDate);
  const isRevoked = credential.status === 'revoked';
  const isExpired = !isRevoked && expiry < now;
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isNearExpiry = !isRevoked && !isExpired && daysUntilExpiry <= CONFIG.NEAR_EXPIRY_DAYS;

  let status: CredentialStatusInfo['status'];
  if (isRevoked) {
    status = 'revoked';
  } else if (isExpired) {
    status = 'expired';
  } else if (isNearExpiry) {
    status = 'near_expiry';
  } else {
    status = 'active';
  }

  return { status, isExpired, isNearExpiry, isRevoked, daysUntilExpiry };
}
