export interface TrustPolicy {
  id: string;
  allowSelfSigned: boolean;
  allowedAlgs: string[];
  trustedIssuerPatterns?: string[];
  trustedVerifierPatterns?: string[];
  metadata?: Record<string, unknown>;
}
