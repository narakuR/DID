import { IssuerType, VerifiableCredential } from '@/types';

export enum WalletDocumentCategory {
  IDENTITY = 'IDENTITY',
  TRANSPORT = 'TRANSPORT',
  HEALTH = 'HEALTH',
  EDUCATION = 'EDUCATION',
  EMPLOYMENT = 'EMPLOYMENT',
  FINANCIAL = 'FINANCIAL',
  GOVERNMENT = 'GOVERNMENT',
  TRAVEL = 'TRAVEL',
  OTHER = 'OTHER',
}

export interface CredentialClassification {
  category: WalletDocumentCategory;
  canonicalType: string;
  displayType: string;
}

const TYPE_CATEGORY_RULES: Array<{
  matches: string[];
  category: WalletDocumentCategory;
  displayType: string;
}> = [
  {
    matches: ['urn:eudi:pid:1', 'pid', 'personalid', 'nationalid', 'identitycard'],
    category: WalletDocumentCategory.IDENTITY,
    displayType: 'Personal ID',
  },
  {
    matches: ['ehic', 'healthinsurance', 'insurance', 'health card', 'vaccination'],
    category: WalletDocumentCategory.HEALTH,
    displayType: 'Health Credential',
  },
  {
    matches: ['mdl', 'driving', 'driverlicense', 'driver_license', 'mobile driving license'],
    category: WalletDocumentCategory.TRANSPORT,
    displayType: "Driver's License",
  },
  {
    matches: ['passport', 'visa', 'travel'],
    category: WalletDocumentCategory.TRAVEL,
    displayType: 'Travel Credential',
  },
  {
    matches: ['learning', 'degree', 'education', 'student', 'university'],
    category: WalletDocumentCategory.EDUCATION,
    displayType: 'Education Credential',
  },
  {
    matches: ['employment', 'employee', 'work', 'professional'],
    category: WalletDocumentCategory.EMPLOYMENT,
    displayType: 'Employment Credential',
  },
  {
    matches: ['bank', 'payment', 'tax', 'socialsecurity', 'financial'],
    category: WalletDocumentCategory.FINANCIAL,
    displayType: 'Financial Credential',
  },
  {
    matches: ['residence', 'permit', 'government'],
    category: WalletDocumentCategory.GOVERNMENT,
    displayType: 'Government Credential',
  },
];

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function detectCategoryFromIssuerType(type: IssuerType): WalletDocumentCategory {
  switch (type) {
    case IssuerType.IDENTITY:
      return WalletDocumentCategory.IDENTITY;
    case IssuerType.TRANSPORT:
      return WalletDocumentCategory.TRANSPORT;
    case IssuerType.HEALTH:
      return WalletDocumentCategory.HEALTH;
    case IssuerType.EDUCATION:
      return WalletDocumentCategory.EDUCATION;
    case IssuerType.EMPLOYMENT:
      return WalletDocumentCategory.EMPLOYMENT;
    case IssuerType.FINANCIAL:
      return WalletDocumentCategory.FINANCIAL;
    case IssuerType.TRAVEL:
      return WalletDocumentCategory.TRAVEL;
    case IssuerType.GOVERNMENT:
      return WalletDocumentCategory.GOVERNMENT;
    default:
      return WalletDocumentCategory.OTHER;
  }
}

function inferDisplayType(
  category: WalletDocumentCategory,
  visualTitle?: string
): string {
  if (visualTitle?.trim()) return visualTitle;

  switch (category) {
    case WalletDocumentCategory.IDENTITY:
      return 'Identity Credential';
    case WalletDocumentCategory.TRANSPORT:
      return 'Transport Credential';
    case WalletDocumentCategory.HEALTH:
      return 'Health Credential';
    case WalletDocumentCategory.EDUCATION:
      return 'Education Credential';
    case WalletDocumentCategory.EMPLOYMENT:
      return 'Employment Credential';
    case WalletDocumentCategory.FINANCIAL:
      return 'Financial Credential';
    case WalletDocumentCategory.GOVERNMENT:
      return 'Government Credential';
    case WalletDocumentCategory.TRAVEL:
      return 'Travel Credential';
    default:
      return 'Credential';
  }
}

export function classifyCredential(
  credential: VerifiableCredential
): CredentialClassification {
  const rawTypes = [
    ...(credential.type ?? []),
    credential.visual?.title ?? '',
    credential.visual?.description ?? '',
  ];

  const normalizedTypes = rawTypes.map(normalize).filter(Boolean);

  for (const rule of TYPE_CATEGORY_RULES) {
    if (rule.matches.some((match) => normalizedTypes.some((value) => value.includes(normalize(match))))) {
      return {
        category: rule.category,
        canonicalType:
          credential.type.find((type) => type !== 'VerifiableCredential') ??
          credential.type[0] ??
          credential.id,
        displayType: credential.visual?.title ?? rule.displayType,
      };
    }
  }

  const category = detectCategoryFromIssuerType(credential.issuer.type);
  return {
    category,
    canonicalType:
      credential.type.find((type) => type !== 'VerifiableCredential') ??
      credential.type[0] ??
      credential.id,
    displayType: inferDisplayType(category, credential.visual?.title),
  };
}
