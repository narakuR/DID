import { oid4vpHandler } from '@/wallet-core/protocol/oid4vp/Oid4vpHandler';
import type { IProtocolHandler, ProtocolContext, ProtocolResult } from '@/wallet-core/types/contracts';
import type { WalletOperation } from '@/wallet-core/domain/models';
import { toWalletDocument } from '@/wallet-core/domain/models';

export class PresentationManager {
  async handleWithHandler(
    handler: IProtocolHandler,
    uri: string,
    ctx: ProtocolContext
  ): Promise<WalletOperation> {
    const result = await handler.handle(uri, ctx);
    if (result.type === 'presentation_request') {
      return {
        kind: 'presentation_requested',
        session: {
          id: `presentation-${Date.now()}`,
          presentationId: result.request.presentationId,
          verifier: result.request.verifier,
          status: 'requested',
          matches: result.request.matches.map((match) => ({
            queryId: match.queryId,
            document: toWalletDocument(match.credential),
            disclosedClaims: match.disclosedClaims,
          })),
        },
        protocolResult: result,
      };
    }

    return {
      kind: 'failure',
      message: result.type === 'error' ? result.message : 'Unsupported presentation result',
      protocolResult:
        result.type === 'error'
          ? result
          : { type: 'error', message: 'Unsupported presentation result' },
    };
  }

  async submit(presentationId: string, ctx: ProtocolContext): Promise<WalletOperation> {
    const result = await oid4vpHandler.submitPresentation(presentationId, ctx);
    if (result.type === 'presentation_sent') {
      return {
        kind: 'presentation_submitted',
        session: {
          id: `presentation-${Date.now()}`,
          presentationId,
          verifier: result.verifier,
          status: 'submitted',
          matches: [],
          verificationResult: result.verificationResult,
        },
        protocolResult: result,
      };
    }

    return {
      kind: 'failure',
      message: result.type === 'error' ? result.message : 'Unsupported presentation result',
      protocolResult:
        result.type === 'error'
          ? result
          : { type: 'error', message: 'Unsupported presentation result' },
    };
  }
}
