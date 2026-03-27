import { Buffer } from 'buffer';

export function base64UrlToString(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function stringToBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function parseJwtUnsafe(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signingInput: string;
  signature: string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT: expected 3 parts, got ${parts.length}`);
  }
  return {
    header: JSON.parse(base64UrlToString(parts[0])),
    payload: JSON.parse(base64UrlToString(parts[1])),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: parts[2],
  };
}
