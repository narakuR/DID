## ADDED Requirements

### Requirement: Wallet home grouped credential list
The system SHALL display credentials grouped by issuer type with collapsible group headers, supporting search and category filter.

#### Scenario: Search filters across all fields
- **WHEN** user types in the search bar
- **THEN** only credentials matching the query in title, description, or issuer name SHALL be shown in a flat (ungrouped) list

#### Scenario: Category filter applies
- **WHEN** user selects a category chip (e.g., GOVERNMENT)
- **THEN** only credentials with matching `issuer.type` SHALL be shown

#### Scenario: Group collapse/expand
- **WHEN** user taps a group header
- **THEN** the group's credential cards SHALL animate in/out with LayoutAnimation

#### Scenario: Notification badge count
- **WHEN** credentials have expired, near-expiry, or revoked items
- **THEN** the bell icon SHALL show a red badge with the count of such credentials

### Requirement: Wallet home floating action button
The system SHALL display a FAB button in the bottom-right corner that navigates to IssuanceScreen.

#### Scenario: FAB navigation
- **WHEN** user taps the FAB (Plus icon)
- **THEN** navigation SHALL push IssuanceScreen

### Requirement: Alpha index navigation
The system SHALL display a vertical alphabetical index on the right side of the wallet list for quick scrolling.

#### Scenario: Alpha press scrolls and highlights
- **WHEN** user taps a letter in the AlphaIndex
- **THEN** the list SHALL scroll to the first credential starting with that letter AND that credential SHALL be highlighted for 1.5 seconds

### Requirement: Credential detail — data view
The system SHALL display full W3C credential data in 4 ISO/IEC 23220 sections: Metadata, Issuer, Subject, Claims.

#### Scenario: Claims renders nested data
- **WHEN** a credentialSubject field value is a nested object
- **THEN** each key-value pair SHALL be shown as a separate DataRow

#### Scenario: Copiable credential ID
- **WHEN** user taps the copy icon next to the credential ID
- **THEN** the full credential ID SHALL be copied to clipboard via expo-clipboard

### Requirement: Credential detail — AI explanation
The system SHALL provide an on-demand AI explanation of credential content via Gemini API.

#### Scenario: AI explain button triggers API call
- **WHEN** user taps the AI explanation button
- **THEN** a loading spinner SHALL show AND `geminiService.explainCredential(credential)` SHALL be called

#### Scenario: AI result displays with fade-in
- **WHEN** geminiService returns a text response
- **THEN** the text SHALL appear with a fade-in animation replacing the spinner

#### Scenario: No API key graceful degradation
- **WHEN** `EXPO_PUBLIC_GEMINI_API_KEY` is not configured
- **THEN** a placeholder message SHALL be shown and the app SHALL NOT crash

### Requirement: Credential presentation (Present button)
The system SHALL require biometric verification before displaying a QR code for credential presentation.

#### Scenario: Present button disabled when revoked or expired
- **WHEN** credential status is 'revoked' OR isExpired is true
- **THEN** the Present button SHALL be disabled (grey, non-interactive)

#### Scenario: Present triggers biometric then QR
- **WHEN** user taps Present on an active credential
- **THEN** biometric verification animation SHALL show for 1.5 seconds THEN a QR overlay SHALL appear

### Requirement: Credential issuance flow
The system SHALL provide a 9-category grid screen for adding credentials, simulating the OpenID4VCI protocol with a 4-step animation flow.

#### Scenario: Category tap starts issuance
- **WHEN** user taps any category card on IssuanceScreen
- **THEN** a full-screen overlay SHALL appear with 4 sequential steps: connecting (1.5s), authenticating (1.5s), issuing (2s), success (1.5s)

#### Scenario: Success adds credential and returns
- **WHEN** issuance flow reaches success step
- **THEN** a new credential SHALL be added to `walletStore` AND navigation SHALL return to WalletHome after 1.5 seconds

### Requirement: Credential renewal
The system SHALL allow renewing a near-expiry or expired credential by extending its expirationDate by 5 years.

#### Scenario: Renewal flow completes
- **WHEN** user taps "Renew Now" on RenewalScreen
- **THEN** a processing animation SHALL play for ~2.5 seconds THEN success screen SHALL show the new expiry year (current year + 5)

#### Scenario: Renewal updates store
- **WHEN** renewal succeeds
- **THEN** `walletStore.updateCredential(id, { expirationDate: newDate, status: 'active' })` SHALL be called

### Requirement: Credential revocation confirmation
The system SHALL require user confirmation plus biometric/PIN verification before revoking a credential.

#### Scenario: Revoke requires bio verification
- **WHEN** user confirms revocation on RevokeConfirmationScreen
- **THEN** biometric verification SHALL be triggered AND revocation SHALL only proceed on success

#### Scenario: Revoke updates store
- **WHEN** revocation succeeds
- **THEN** `walletStore.revokeCredential(id)` SHALL be called AND success screen SHALL show

#### Scenario: Revoke cancellation
- **WHEN** user taps Cancel on the confirm step
- **THEN** navigation SHALL return to CredentialDetail with no data changes
