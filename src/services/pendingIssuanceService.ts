import { oid4vciHandler } from '@/wallet-core/protocol/oid4vci/Oid4vciHandler';
import {
  resolveCredentialConfigId,
  resolveCredentialConfiguration,
  resolveCredentialOffer,
} from '@/wallet-core/protocol/oid4vci/offerResolver';
import { oid4vciClient } from '@/wallet-core/protocol/oid4vci/client';
import { pendingIssuanceStore } from '@/wallet-core/domain/PendingIssuanceStore';

class PendingIssuanceService {
  async begin(uri: string): Promise<void> {
    if (!oid4vciHandler.canHandle(uri)) {
      return;
    }

    if (uri.startsWith('did://oid4vci') || uri.startsWith('exp+did://oid4vci')) {
      return;
    }

    try {
      const offer = await resolveCredentialOffer(uri);
      const issuerMetadata = await oid4vciClient.resolveIssuerMetadata(offer.credential_issuer);
      const credentialConfigurationId = resolveCredentialConfigId(offer, issuerMetadata);
      const configuration = resolveCredentialConfiguration(
        credentialConfigurationId,
        issuerMetadata
      );

      pendingIssuanceStore.setCurrent({
        id: `pending-issuance-${Date.now()}`,
        uri,
        credentialConfigurationId,
        title: configuration.displayName || '新签证',
        subtitle: configuration.rawFormat ? `format: ${configuration.rawFormat}` : undefined,
        issuerName:
          (issuerMetadata as { credentialIssuer?: { display?: Array<{ name?: string }> } })
            ?.credentialIssuer?.display?.find((item) => item?.name)?.name ??
          'Issuer',
        startedAt: new Date().toISOString(),
        state: 'issuing',
      });
    } catch {
      pendingIssuanceStore.setCurrent({
        id: `pending-issuance-${Date.now()}`,
        uri,
        title: '新签证',
        issuerName: 'Issuer',
        startedAt: new Date().toISOString(),
        state: 'issuing',
      });
    }
  }

  complete(): void {
    pendingIssuanceStore.clearCurrent();
  }

  fail(): void {
    pendingIssuanceStore.clearCurrent();
  }
}

export const pendingIssuanceService = new PendingIssuanceService();
