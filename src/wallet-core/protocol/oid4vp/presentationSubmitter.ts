import { credentialRepository } from '@/services/credentialRepository';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { normalizeVerifierContextUrl } from '@/wallet-core/transport/urlResolver';
import type { ProtocolContext, ProtocolResult } from '@/wallet-core/types/contracts';
import { buildKeyBindingJwt } from './keyBindingBuilder';
import {
  deletePresentationRequest,
  getPresentationRequest,
} from './presentationSessionStore';

export async function submitPresentation(
  presentationId: string,
  ctx: ProtocolContext
): Promise<ProtocolResult> {
  const stored = getPresentationRequest(presentationId);
  if (!stored) {
    return {
      type: 'error',
      message: 'Presentation request not found or already submitted.',
    };
  }

  const responseUri =
    stored.requestObject.response_uri || stored.requestObject.redirect_uri;
  if (!responseUri) {
    return { type: 'error', message: 'response_uri missing in request object' };
  }

  if (
    stored.requestObject.response_mode &&
    stored.requestObject.response_mode !==
      INTEGRATION_CONFIG.verifier.defaultResponseMode
  ) {
    return {
      type: 'error',
      message: `Unsupported response_mode: ${stored.requestObject.response_mode}`,
    };
  }

  try {
    const vpToken: Record<string, string[]> = {};

    for (const match of stored.matched) {
      const repoHit = credentialRepository.getById(match.credential.id);
      const rawCredential = repoHit?.raw ?? match.credential._raw;
      if (!rawCredential) {
        return {
          type: 'error',
          message: `No raw credential token available for ${match.credential.id}`,
        };
      }

      let presentationEntry = rawCredential;
      if (
        match.credential._format === 'sd-jwt-vc' &&
        match.disclosedClaims.length > 0
      ) {
        const formatHandler = ctx.registry.getCredentialFormat('sd-jwt-vc');
        presentationEntry = await formatHandler.selectDisclose(
          rawCredential,
          match.disclosedClaims
        );
      }

      if (match.credential._format === 'sd-jwt-vc') {
        const kbJwt = await buildKeyBindingJwt(presentationEntry, stored.requestObject);
        presentationEntry = presentationEntry.endsWith('~')
          ? `${presentationEntry}${kbJwt}`
          : `${presentationEntry}~${kbJwt}`;
      }

      vpToken[match.queryId] = [presentationEntry];
    }

    const body = new URLSearchParams({
      state: stored.requestObject.state || '',
      vp_token: JSON.stringify(vpToken),
    });

    const submitRes = await fetch(normalizeVerifierContextUrl(responseUri), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!submitRes.ok) {
      return {
        type: 'error',
        message: `VP submission failed (${submitRes.status})`,
      };
    }

    const contentType = submitRes.headers.get('content-type') || '';
    const verificationResult = contentType.includes('application/json')
      ? ((await submitRes.json()) as Record<string, unknown>)
      : ({ status: 'ok' } as Record<string, unknown>);

    deletePresentationRequest(presentationId);
    return {
      type: 'presentation_sent',
      verifier: stored.verifier,
      verificationResult,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { type: 'error', message: `VP submission error: ${message}` };
  }
}
