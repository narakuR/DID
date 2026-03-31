## ADDED Requirements

### Requirement: Wallet can remotely present mso_mdoc credentials through OID4VP
The wallet MUST support remote OID4VP presentation for `mso_mdoc` credentials by generating a verifier-compatible `DeviceResponse` using a document-bound device key instead of the generic holder key path.

#### Scenario: Successful remote mdoc presentation
- **WHEN** the wallet receives an OID4VP request object that asks for an `mso_mdoc` credential with a supported `doctype_value`
- **THEN** the wallet MUST resolve a matching local `mso_mdoc` document
- **AND** the wallet MUST build a `DeviceResponse` for that document using its bound device key
- **AND** the wallet MUST submit the resulting `vp_token` to the verifier response endpoint

### Requirement: Wallet tracks mdoc presentation binding at document level
The wallet MUST model `mso_mdoc` presentation as a document-bound capability and MUST NOT treat it as a generic holder-key presentation flow.

#### Scenario: mdoc document exposes device-key presentation binding
- **WHEN** a local credential is identified as `mso_mdoc`
- **THEN** the wallet MUST expose that document's presentation binding as document-bound
- **AND** the wallet MUST use that binding when deciding whether the document can be remotely presented

### Requirement: Wallet exposes presentability state for mso_mdoc documents
The wallet MUST distinguish between a document being stored and a document being currently presentable.

#### Scenario: mdoc document is stored but not presentable
- **WHEN** a local `mso_mdoc` document is present in storage but its device key is unavailable or not ready
- **THEN** the wallet MUST keep the document visible in the wallet
- **AND** the wallet MUST mark the document as not currently presentable
- **AND** the wallet MUST provide a user-visible reason such as recovery required or reissuance required

### Requirement: Wallet surfaces product-safe errors for mso_mdoc presentation
The wallet MUST return user-facing presentation errors for `mso_mdoc` based on document capability and state, instead of exposing raw protocol or transport errors by default.

#### Scenario: User attempts to share a non-presentable mdoc document
- **WHEN** the user tries to remotely present an `mso_mdoc` document whose presentation state is not ready
- **THEN** the wallet MUST block the share action
- **AND** the wallet MUST show a user-visible explanation of why the document cannot be presented
