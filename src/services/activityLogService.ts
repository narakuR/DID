import { useActivityLogStore } from '@/store/activityLogStore';
import { ActivityLog, VerifiableCredential } from '@/types';

type ActivityAction = ActivityLog['action'];

function createActivityLog(
  credential: VerifiableCredential,
  action: ActivityAction
): ActivityLog {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    credentialId: credential.id,
    credentialName: credential.visual?.title ?? credential.type.at(-1) ?? 'Credential',
    action,
    institution: credential.issuer.name,
    timestamp: new Date().toISOString(),
  };
}

class ActivityLogService {
  async logCredentialEvent(
    credential: VerifiableCredential,
    action: ActivityAction
  ): Promise<void> {
    await useActivityLogStore.getState().append(createActivityLog(credential, action));
  }

  async logReceived(credential: VerifiableCredential): Promise<void> {
    await this.logCredentialEvent(credential, 'RECEIVED');
  }

  async logPresented(credential: VerifiableCredential): Promise<void> {
    await this.logCredentialEvent(credential, 'PRESENTED');
  }

  async logRevoked(credential: VerifiableCredential): Promise<void> {
    await this.logCredentialEvent(credential, 'REVOKED');
  }

  async clear(): Promise<void> {
    await useActivityLogStore.getState().clear();
  }
}

export const activityLogService = new ActivityLogService();
