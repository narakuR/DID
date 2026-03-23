import type { IProtocolHandler, ProtocolContext, ProtocolResult } from '../types';
import type { CredentialFormatName } from '../types';

function toFormatName(format: string | undefined): CredentialFormatName {
  if (!format) return 'jwt_vc_json';
  if (format === 'vc+sd-jwt' || format === 'dc+sd-jwt') return 'sd-jwt-vc';
  if (format === 'jwt_vc_json' || format === 'jwt_vc') return 'jwt_vc_json';
  return format as CredentialFormatName;
}

type CredentialOffer = {
  credential_issuer: string;
  credential_configuration_ids?: string[];
  grants?: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code'?: {
      'pre-authorized_code'?: string;
    };
  };
};

async function resolveCredentialOffer(uri: string): Promise<CredentialOffer> {
  const normalized = uri.startsWith('openid-credential-offer://')
    ? uri.replace('openid-credential-offer://', 'https://dummy.local')
    : uri.startsWith('openid4vci://')
      ? uri.replace('openid4vci://', 'https://dummy.local')
      : uri;

  const url = new URL(normalized);
  const inlineOffer = url.searchParams.get('credential_offer');
  const offerUri = url.searchParams.get('credential_offer_uri');

  if (inlineOffer) {
    return JSON.parse(decodeURIComponent(inlineOffer)) as CredentialOffer;
  }

  if (offerUri) {
    const res = await fetch(decodeURIComponent(offerUri));
    if (!res.ok) {
      throw new Error(`Failed to fetch credential_offer_uri (${res.status})`);
    }
    return (await res.json()) as CredentialOffer;
  }

  throw new Error('No credential_offer or credential_offer_uri found in URI');
}

export class Oid4vciHandler implements IProtocolHandler {
  readonly scheme = 'openid-credential-offer';

  canHandle(uri: string): boolean {
    return (
      uri.startsWith('openid-credential-offer://') ||
      uri.startsWith('openid4vci://') ||
      uri.includes('credential_offer') ||
      uri.includes('credential_offer_uri')
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    try {
      const offer = await resolveCredentialOffer(uri);
      const preAuthorizedCode =
        offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.[
          'pre-authorized_code'
        ];

      if (!preAuthorizedCode) {
        return { type: 'error', message: 'Only pre-authorized code flow is supported in this build.' };
      }

      const tokenEndpoint = `${offer.credential_issuer}/token`;
      const credentialEndpoint = `${offer.credential_issuer}/credential`;

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthorizedCode,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Token exchange failed (${tokenRes.status})`);
      }

      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      const accessToken = tokenJson.access_token;
      if (!accessToken) throw new Error('Missing access_token in token response');

      const configId = offer.credential_configuration_ids?.[0] ?? 'GenericCredential';
      const credentialRes = await fetch(credentialEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ credential_configuration_id: configId }),
      });

      if (!credentialRes.ok) {
        throw new Error(`Credential retrieval failed (${credentialRes.status})`);
      }

      const credentialJson = (await credentialRes.json()) as {
        credential?: string;
        format?: string;
      };

      if (!credentialJson.credential) {
        throw new Error('Issuer response does not contain `credential`');
      }

      const formatName = toFormatName(credentialJson.format);
      const formatHandler = ctx.registry.getCredentialFormat(formatName);
      const parsedCredential = await formatHandler.parse(credentialJson.credential);
      const displayModel = formatHandler.toDisplayModel(parsedCredential);
      displayModel._raw = credentialJson.credential;
      displayModel._format = parsedCredential.format;

      return { type: 'credential_received', credentials: [displayModel] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VCI error: ${message}` };
    }
  }
}

export const oid4vciHandler = new Oid4vciHandler();
