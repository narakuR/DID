## ADDED Requirements

### Requirement: Credential persistence
The system SHALL persist the credentials list in AsyncStorage and load it on app startup, falling back to the 20-item mock dataset when no stored data exists.

#### Scenario: First launch loads mock data
- **WHEN** no credentials are stored in AsyncStorage
- **THEN** `walletStore.credentials` SHALL contain exactly 20 mock VerifiableCredential objects

#### Scenario: Stored credentials survive restart
- **WHEN** credentials are stored and the app restarts
- **THEN** `walletStore.credentials` SHALL contain the previously stored credentials

### Requirement: Credential status computation
The system SHALL compute credential status (Active/Expired/Revoked) as a derived value from the credential data without storing it.

#### Scenario: Active credential
- **WHEN** `getCredentialStatus` is called on a credential with future expirationDate and `status !== 'revoked'`
- **THEN** it SHALL return `{ label: 'Active', isExpired: false, isRevoked: false }`

#### Scenario: Expired credential
- **WHEN** `getCredentialStatus` is called on a credential whose expirationDate is in the past
- **THEN** it SHALL return `{ label: 'Expired', isExpired: true, isRevoked: false, daysUntilExpiry: <negative number> }`

#### Scenario: Revoked credential
- **WHEN** `getCredentialStatus` is called on a credential with `status: 'revoked'`
- **THEN** it SHALL return `{ label: 'Revoked', isRevoked: true, isExpired: false }`

### Requirement: Credential revocation
The system SHALL allow revoking a credential by updating its status to `'revoked'` and persisting the change.

#### Scenario: Revoke updates status
- **WHEN** `walletStore.revokeCredential(id)` is called
- **THEN** the credential with that ID SHALL have `status: 'revoked'` in the store AND in AsyncStorage

### Requirement: Credential renewal
The system SHALL allow renewing an expired or near-expiry credential by extending its expirationDate by 5 years and resetting status to 'active'.

#### Scenario: Renewal extends expiry
- **WHEN** `walletStore.updateCredential(id, { expirationDate: newDate, status: 'active' })` is called
- **THEN** the credential SHALL have the updated expirationDate and `status: 'active'`

### Requirement: Credential addition
The system SHALL allow adding new credentials to the wallet and persisting them.

#### Scenario: Add credential
- **WHEN** `walletStore.addCredential(credential)` is called
- **THEN** `walletStore.credentials.length` SHALL increase by 1 AND the new credential SHALL be persisted

### Requirement: Wallet clear and restore
The system SHALL support clearing all credentials (logout) and restoring from a backup set.

#### Scenario: Clear wallet
- **WHEN** `walletStore.clearWallet()` is called
- **THEN** `walletStore.credentials` SHALL be an empty array AND AsyncStorage SHALL be updated

#### Scenario: Restore wallet
- **WHEN** `walletStore.restoreWallet(credentials)` is called with an array of credentials
- **THEN** `walletStore.credentials` SHALL equal the provided array AND be persisted
