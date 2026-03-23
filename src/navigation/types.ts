import { VerifiableCredential } from '@/types';
import type { PendingPresentationRequest } from '@/plugins/types';

export type RootStackParamList = {
  Onboarding: undefined;
  Lock: undefined;
  Main: undefined;
  CredentialDetail: { credentialId: string };
  RevokeConfirmation: { credentialId: string };
  Renewal: { credentialId: string };
  Issuance: undefined;
  Notifications: undefined;
  PresentationConfirm: { request: PendingPresentationRequest };
};

export type TabParamList = {
  Wallet: undefined;
  Services: undefined;
  Scan: undefined;
  Activity: undefined;
  Profile: undefined;
};
