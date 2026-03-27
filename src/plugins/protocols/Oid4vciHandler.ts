import {
  AuthorizationFlow,
  Openid4vciClient,
  type CredentialOfferObject,
  type IssuerMetadataResult,
} from '@openid4vc/openid4vci';
import type {
  CredentialFormatName,
  IProtocolHandler,
  ProtocolContext,
  ProtocolResult,
} from '../types';
import { buildOid4vcCallbacks } from '../utils/oid4vcCallbacks';
import { didKeyProvider } from '../did/DidKeyProvider';
import { didJwkProvider } from '../did/DidJwkProvider';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';
import { INTEGRATION_CONFIG } from '@/config/integration';
import {
  normalizeIssuerOfferUri,
  normalizeIssuerContextUrl,
} from '@/utils/integrationUrls';

function toFormatName(format: string | undefined): CredentialFormatName {
  if (!format) return 'jwt_vc_json';
  if (format === 'vc+sd-jwt' || format === 'dc+sd-jwt') return 'sd-jwt-vc';
  if (format === 'jwt_vc_json' || format === 'jwt_vc') return 'jwt_vc_json';
  return format as CredentialFormatName;
}

type PendingOid4vciAuth = {
  credentialOffer: CredentialOfferObject;
  issuerMetadata: IssuerMetadataResult;
  credentialConfigurationId: string;
  pkceCodeVerifier?: string;
  redirectUri: string;
};

const callbacks = {
  ...buildOid4vcCallbacks(INTEGRATION_CONFIG.issuer.clientId),
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const rewritten =
      typeof input === 'string'
        ? normalizeIssuerContextUrl(input)
        : input instanceof URL
          ? new URL(normalizeIssuerContextUrl(input.toString()))
          : normalizeIssuerContextUrl(input.url);

    if (typeof input === 'string' || input instanceof URL) {
      return fetch(rewritten, init);
    }

    return fetch(rewritten, {
      ...init,
      method: input.method,
      headers: init?.headers ?? input.headers,
      body: init?.body,
    });
  },
};

const oid4vciClient = new Openid4vciClient({ callbacks });

function isOid4vciCallback(uri: string): boolean {
  return uri.startsWith(INTEGRATION_CONFIG.app.issuanceRedirectUri);
}

function resolveCredentialConfigId(offer: CredentialOfferObject): string {
  const configuredEhic =
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId;
  const offered = offer.credential_configuration_ids ?? [];
  if (offered.includes(configuredEhic)) {
    return configuredEhic;
  }
  return offered[0] ?? configuredEhic;
}

function resolveCredentialScope(credentialConfigurationId: string): string | undefined {
  if (
    credentialConfigurationId ===
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId
  ) {
    return INTEGRATION_CONFIG.credentials.ehic.scope;
  }
  if (
    credentialConfigurationId ===
    INTEGRATION_CONFIG.credentials.pid.credentialConfigurationId
  ) {
    return INTEGRATION_CONFIG.credentials.pid.scope;
  }
  return undefined;
}

async function resolveProofSigner(credentialConfigurationId: string): Promise<{
  clientId: string;
  didUrl: string;
  alg: 'EdDSA' | 'ES256';
}> {
  const needsEs256 =
    credentialConfigurationId ===
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId;

  if (needsEs256) {
    let metadata = await didJwkProvider.getStoredMetadata();
    if (!metadata) {
      const created = await didJwkProvider.create();
      metadata = created.metadata;
    }

    return {
      clientId: metadata.did,
      didUrl: metadata.keyId,
      alg: 'ES256',
    };
  }

  const metadata = await didKeyProvider.getStoredMetadata();
  if (!metadata) {
    throw new Error('No active DID found. Please finish wallet setup first.');
  }

  return {
    clientId: metadata.did,
    didUrl: metadata.keyId,
    alg: 'EdDSA',
  };
}

async function requestCredentialWithIssuerCompat(options: {
  accessToken: string;
  credentialIssuer: string;
  credentialConfigurationId: string;
  proofJwt: string;
}): Promise<{
  credential?: unknown;
  credentials?: ({ credential?: unknown } | unknown)[];
}> {
  const endpoint = normalizeIssuerContextUrl(
    `${options.credentialIssuer.replace(/\/$/, '')}/wallet/credentialEndpoint`
  );

  const response = await callbacks.fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credential_configuration_id: options.credentialConfigurationId,
      proofs: {
        jwt: [options.proofJwt],
      },
    }),
  });

  const rawText = await response.text();
  let payload: unknown = null;
  try {
    payload = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const details =
      typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    throw new Error(
      `Error retrieving credentials from '${options.credentialIssuer}'\n${details}`
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Issuer returned an empty credential response.');
  }

  return payload as {
    credential?: unknown;
    credentials?: ({ credential?: unknown } | unknown)[];
  };
}

function extractRawCredential(credentialResponse: {
  credential?: unknown;
  credentials?: ({ credential?: unknown } | unknown)[];
}): string {
  if (typeof credentialResponse.credential === 'string') {
    return credentialResponse.credential;
  }

  const first = credentialResponse.credentials?.[0];
  if (typeof first === 'string') {
    return first;
  }
  if (
    first &&
    typeof first === 'object' &&
    'credential' in first &&
    typeof (first as { credential?: unknown }).credential === 'string'
  ) {
    return (first as { credential: string }).credential;
  }

  throw new Error('Issuer response does not contain a compact credential string');
}

async function savePendingAuthRequest(pending: PendingOid4vciAuth): Promise<void> {
  await storageService.setItem(STORAGE_KEYS.PENDING_OID4VCI_AUTH, pending);
}

async function loadPendingAuthRequest(): Promise<PendingOid4vciAuth | null> {
  return storageService.getItem<PendingOid4vciAuth>(STORAGE_KEYS.PENDING_OID4VCI_AUTH);
}

async function clearPendingAuthRequest(): Promise<void> {
  await storageService.removeItem(STORAGE_KEYS.PENDING_OID4VCI_AUTH);
}

async function resolveCredentialOffer(uri: string): Promise<CredentialOfferObject> {
  return oid4vciClient.resolveCredentialOffer(normalizeIssuerOfferUri(uri));
}

export class Oid4vciHandler implements IProtocolHandler {
  readonly scheme = 'openid-credential-offer';

  canHandle(uri: string): boolean {
    return (
      isOid4vciCallback(uri) ||
      uri.startsWith('openid-credential-offer://') ||
      uri.startsWith('openid4vci://') ||
      uri.includes('credential_offer') ||
      uri.includes('credential_offer_uri')
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    try {
      if (isOid4vciCallback(uri)) {
        return this.handleAuthorizationCodeCallback(uri, ctx);
      }

      const credentialOffer = await resolveCredentialOffer(uri);
      const issuerMetadata = await oid4vciClient.resolveIssuerMetadata(
        credentialOffer.credential_issuer
      );

      if (credentialOffer.grants?.authorization_code) {
        return this.handleAuthorizationCodeFlow(credentialOffer);
      }

      const preAuthorizedCode =
        credentialOffer.grants?.[
          'urn:ietf:params:oauth:grant-type:pre-authorized_code'
        ]?.['pre-authorized_code'];

      if (!preAuthorizedCode) {
        return {
          type: 'error',
          message:
            'Issuer offer does not expose a supported grant. Expected authorization_code or pre-authorized_code.',
        };
      }

      const tokenResult =
        await oid4vciClient.retrievePreAuthorizedCodeAccessTokenFromOffer({
          credentialOffer,
          issuerMetadata,
        });

      const credentialConfigurationId =
        resolveCredentialConfigId(credentialOffer);
      const nonceResult = await oid4vciClient.requestNonce({ issuerMetadata });
      const proofSigner = await resolveProofSigner(credentialConfigurationId);
      const proof = await oid4vciClient.createCredentialRequestJwtProof({
        issuerMetadata,
        credentialConfigurationId,
        nonce: nonceResult.c_nonce,
        clientId: proofSigner.clientId,
        signer: {
          method: 'did',
          didUrl: proofSigner.didUrl,
          alg: proofSigner.alg,
        },
      });

      const credentialResponse = await requestCredentialWithIssuerCompat({
        accessToken: tokenResult.accessTokenResponse.access_token,
        credentialIssuer: credentialOffer.credential_issuer,
        credentialConfigurationId,
        proofJwt: proof.jwt,
      });

      return this.toCredentialReceivedResult(
        ctx,
        credentialConfigurationId,
        credentialResponse
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VCI error: ${message}` };
    }
  }

  private async handleAuthorizationCodeFlow(
      credentialOffer: CredentialOfferObject
  ): Promise<ProtocolResult> {
    const issuerMetadata = await oid4vciClient.resolveIssuerMetadata(
      credentialOffer.credential_issuer
    );
    const credentialConfigurationId = resolveCredentialConfigId(credentialOffer);
    const authorization = await oid4vciClient.initiateAuthorization({
      credentialOffer,
      issuerMetadata,
      clientId: INTEGRATION_CONFIG.issuer.clientId,
      redirectUri: INTEGRATION_CONFIG.app.issuanceRedirectUri,
      scope: resolveCredentialScope(credentialConfigurationId),
    });

    if (authorization.authorizationFlow !== AuthorizationFlow.Oauth2Redirect) {
      return {
        type: 'error',
        message:
          'Issuer requested presentation-during-issuance, which is not yet supported in this MVP.',
      };
    }

    await savePendingAuthRequest({
      credentialOffer,
      issuerMetadata,
      credentialConfigurationId,
      pkceCodeVerifier: authorization.pkce?.codeVerifier,
      redirectUri: INTEGRATION_CONFIG.app.issuanceRedirectUri,
    });

    return {
      type: 'redirect',
      url: authorization.authorizationRequestUrl,
    };
  }

  private async handleAuthorizationCodeCallback(
    uri: string,
    ctx: ProtocolContext
  ): Promise<ProtocolResult> {
    const pending = await loadPendingAuthRequest();
    if (!pending) {
      return {
        type: 'error',
        message: 'No pending authorization request found for OID4VCI callback.',
      };
    }

    const authorizationResponse =
      oid4vciClient.parseAndVerifyAuthorizationResponseRedirectUrl({
        url: uri,
        authorizationServerMetadata: pending.issuerMetadata.authorizationServers[0],
      });

    if (!('code' in authorizationResponse) || !authorizationResponse.code) {
      const errorMessage =
        'error_description' in authorizationResponse &&
        typeof authorizationResponse.error_description === 'string'
          ? authorizationResponse.error_description
          : 'error' in authorizationResponse &&
              typeof authorizationResponse.error === 'string'
            ? authorizationResponse.error
            : 'Authorization callback did not contain a code.';
      return {
        type: 'error',
        message: errorMessage,
      };
    }

    const tokenResult =
      await oid4vciClient.retrieveAuthorizationCodeAccessTokenFromOffer({
        issuerMetadata: pending.issuerMetadata,
        credentialOffer: pending.credentialOffer,
        authorizationCode: authorizationResponse.code,
        pkceCodeVerifier: pending.pkceCodeVerifier,
        redirectUri: pending.redirectUri,
      });

    const nonceResult = await oid4vciClient.requestNonce({
      issuerMetadata: pending.issuerMetadata,
    });
    const proofSigner = await resolveProofSigner(pending.credentialConfigurationId);
    const proof = await oid4vciClient.createCredentialRequestJwtProof({
      issuerMetadata: pending.issuerMetadata,
      credentialConfigurationId: pending.credentialConfigurationId,
      nonce: nonceResult.c_nonce,
      clientId: proofSigner.clientId,
      signer: {
        method: 'did',
        didUrl: proofSigner.didUrl,
        alg: proofSigner.alg,
      },
    });

    const credentialResponse = await requestCredentialWithIssuerCompat({
      accessToken: tokenResult.accessTokenResponse.access_token,
      credentialIssuer: pending.credentialOffer.credential_issuer,
      credentialConfigurationId: pending.credentialConfigurationId,
      proofJwt: proof.jwt,
    });

    await clearPendingAuthRequest();
    return this.toCredentialReceivedResult(
      ctx,
      pending.credentialConfigurationId,
      credentialResponse
    );
  }

  private async toCredentialReceivedResult(
    ctx: ProtocolContext,
    credentialConfigurationId: string,
    credentialResponse: {
      credential?: unknown;
      credentials?: ({ credential?: unknown } | unknown)[];
    }
  ): Promise<ProtocolResult> {
    const rawCredential = extractRawCredential(credentialResponse);
    const configuredFormat =
      credentialConfigurationId ===
      INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId
        ? 'dc+sd-jwt'
        : undefined;

    const formatName = toFormatName(configuredFormat);
    const handler = ctx.registry.getCredentialFormat(formatName);
    const parsedCredential = await handler.parse(rawCredential);
    const displayModel = handler.toDisplayModel(parsedCredential);
    displayModel._raw = rawCredential;
    displayModel._format = parsedCredential.format;

    return { type: 'credential_received', credentials: [displayModel] };
  }
}

export const oid4vciHandler = new Oid4vciHandler();
