import type { StoredCredential, VerifiableCredential } from '@/types';
import type { IProtocolHandler, ProtocolContext, ProtocolResult } from '@/wallet-core/types/contracts';
import type { WalletOperation } from '@/wallet-core/domain/models';
import { toWalletDocument } from '@/wallet-core/domain/models';
import type { WalletPersistence } from './types';

export class IssuanceManager {
  constructor(private readonly persistence: WalletPersistence) {}

  async handleWithHandler(
    handler: IProtocolHandler,
    uri: string,
    ctx: ProtocolContext
  ): Promise<WalletOperation> {
    const result = await handler.handle(uri, ctx);
    if (result.type === 'credential_received') {
      await this.persistIssuedCredentials(result.credentials);
      return {
        kind: 'issuance_completed',
        session: {
          id: `issuance-${Date.now()}`,
          uri,
          status: 'issued',
          documents: result.credentials.map(toWalletDocument),
        },
        protocolResult: result,
      };
    }

    if (result.type === 'redirect') {
      return {
        kind: 'issuance_redirect',
        session: {
          id: `issuance-${Date.now()}`,
          uri,
          status: 'redirect_required',
          redirectUrl: result.url,
          documents: [],
        },
        protocolResult: result,
      };
    }

    return {
      kind: 'failure',
      message: result.type === 'error' ? result.message : 'Unsupported issuance result',
      protocolResult:
        result.type === 'error'
          ? result
          : { type: 'error', message: 'Unsupported issuance result' },
    };
  }

  async persistIssuedCredentials(credentials: VerifiableCredential[]): Promise<void> {
    for (const credential of credentials) {
      if (credential._raw) {
        const stored: StoredCredential = {
          id: credential.id,
          format: (credential._format ?? 'jwt_vc_json') as StoredCredential['format'],
          raw: credential._raw,
          storedAt: new Date().toISOString(),
          displayModel: credential,
        };
        await this.persistence.saveIssuedCredential(stored);
      }

      await this.persistence.addDisplayCredential(credential);
    }
  }
}
