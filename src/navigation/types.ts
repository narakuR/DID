import type { NavigatorScreenParams } from '@react-navigation/native';
import type { PendingPresentationRequest } from '@/plugins/types';

export type TabParamList = {
  Wallet: undefined;
  Services: undefined;
  Scan: undefined;
  Activity: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Lock: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  CredentialDetail: { credentialId: string };
  RevokeConfirmation: { credentialId: string };
  Renewal: { credentialId: string };
  Issuance: undefined;
  Notifications: undefined;
  PresentationConfirm: { request: PendingPresentationRequest };
};
