import type {
  IProtocolHandler,
  PendingPresentationRequest,
  ProtocolContext,
  ProtocolResult,
} from '@/wallet-core/types/contracts';
import {
  extractVerifierName,
  fetchRequestObjectJwt,
  parseOpenid4vpUri,
  parseRequestObjectJwt,
} from './requestObjectResolver';
import { selectMatches } from './dcqlMatcher';
import {
  createPresentationId,
  savePresentationRequest,
} from './presentationSessionStore';
import { submitPresentation as submitPresentationRequest } from './presentationSubmitter';

export class Oid4vpHandler implements IProtocolHandler {
  readonly scheme = 'openid4vp';

  canHandle(uri: string): boolean {
    return (
      uri.startsWith('openid4vp://') ||
      uri.startsWith('eudi-openid4vp://') ||
      uri.startsWith('haip://') ||
      (uri.includes('openid4vp') && uri.includes('request_uri'))
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    try {
      const { requestUri, requestJwt, requestUriMethod } = parseOpenid4vpUri(uri);
      const jwt =
        requestJwt ??
        (requestUri
          ? await fetchRequestObjectJwt(requestUri, requestUriMethod)
          : undefined);

      if (!jwt) {
        return { type: 'error', message: 'OID4VP request object is missing' };
      }

      const requestObject = parseRequestObjectJwt(jwt);
      const verifier = extractVerifierName(requestObject);
      const matchedCredentials = selectMatches(requestObject, ctx.credentials);

      if (matchedCredentials.length === 0) {
        return {
          type: 'error',
          message: 'No matching credentials found for this presentation request.',
        };
      }

      const presentationId = createPresentationId();
      savePresentationRequest(presentationId, {
        requestObject,
        matched: matchedCredentials,
        verifier,
      });

      const pendingRequest: PendingPresentationRequest = {
        verifier,
        presentationId,
        matches: matchedCredentials.map((m) => ({
          credential: m.credential,
          disclosedClaims: m.disclosedClaims,
          queryId: m.queryId,
        })),
      };

      return { type: 'presentation_request', request: pendingRequest };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VP error: ${message}` };
    }
  }

  async submitPresentation(
    presentationId: string,
    ctx: ProtocolContext
  ): Promise<ProtocolResult> {
    return submitPresentationRequest(presentationId, ctx);
  }
}

export const oid4vpHandler = new Oid4vpHandler();
