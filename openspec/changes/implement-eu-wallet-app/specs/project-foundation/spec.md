## ADDED Requirements

### Requirement: Expo Development Build configuration
The project SHALL be configured as an Expo Development Build (not Expo Go) with all required native plugins, targeting iOS 15+ and Android API 30+. The build system SHALL NOT use EAS cloud services.

#### Scenario: Local prebuild succeeds
- **WHEN** developer runs `npx expo prebuild --clean`
- **THEN** native iOS and Android projects are generated without errors

#### Scenario: Path aliases resolve correctly
- **WHEN** TypeScript imports use `@/`, `@components/`, `@store/` etc. aliases
- **THEN** both tsc and Metro bundler resolve them correctly

### Requirement: TypeScript domain types
The project SHALL define all domain types in `src/types/index.ts` covering W3C Verifiable Credentials, ActivityLog, UserProfile, and auxiliary types.

#### Scenario: VerifiableCredential structure
- **WHEN** a credential object is created
- **THEN** it SHALL contain `@context`, `id` (urn:uuid format), `type[]`, `issuer` (with DID), `issuanceDate` (ISO 8601), `credentialSubject`, and `visual` (UI-only) fields

#### Scenario: IssuerType enum coverage
- **WHEN** issuer type is set
- **THEN** it SHALL be one of: GOVERNMENT, UNIVERSITY, HEALTH, BANK, TRANSPORT, CORPORATE, ENTERTAINMENT, UTILITY

### Requirement: Mock dataset initialization
The system SHALL provide 20 mock VerifiableCredential objects and 6 ActivityLog entries as the default dataset when no stored data exists.

#### Scenario: Near-expiry credentials trigger warnings
- **WHEN** the mock dataset is loaded
- **THEN** credential #9 (PilotLicense) SHALL have expirationDate within 25-35 days from now AND credential #10 (PublicTransportPass) SHALL have expirationDate within 3-7 days from now

#### Scenario: Revoked credential present
- **WHEN** the mock dataset is loaded
- **THEN** credential #15 (LibraryCard) SHALL have `status: 'revoked'`

#### Scenario: Expired credential present
- **WHEN** the mock dataset is loaded
- **THEN** credential #14 (SecurityClearance) SHALL have an expirationDate in the past

### Requirement: Credential gradient color mapping
The system SHALL map all 20 Tailwind gradient class strings to `[startColor, endColor]` RN LinearGradient color pairs via a `GRADIENT_MAP` constant.

#### Scenario: Gradient lookup
- **WHEN** `getGradientColors('bg-gradient-to-br from-blue-800 to-blue-600')` is called
- **THEN** it returns `['#1e40af', '#2563eb']`

#### Scenario: Unknown gradient fallback
- **WHEN** an unrecognized color string is passed to `getGradientColors`
- **THEN** it returns the default blue gradient `['#1e40af', '#2563eb']`
