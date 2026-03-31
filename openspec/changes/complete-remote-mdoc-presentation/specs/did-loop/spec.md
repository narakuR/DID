## MODIFIED Requirements

### Requirement: End-to-end DID loop with mock crypto and real network interactions
System MUST support a runnable loop: issuance offer scan -> credential retrieval -> wallet storage -> verification request scan -> user-confirmed presentation -> verifier result echo. The wallet MUST support both `sd-jwt-vc` and `mso_mdoc` presentation paths according to each credential's presentation model and declared capability.

#### Scenario: Successful issuance and verification
- **Given** backend is running and exposes OID4VCI-like and OID4VP-like endpoints
- **And** wallet has at least one DID and can scan protocol URIs
- **When** wallet scans an `openid-credential-offer://` URI with valid pre-authorized code
- **Then** wallet MUST call token endpoint and credential endpoint over HTTP
- **And** wallet MUST store credential locally
- **When** wallet scans an `openid4vp://?request_uri=...` URI
- **Then** wallet MUST fetch request object from `request_uri`
- **And** wallet MUST present matched credential only after user confirmation
- **And** wallet MUST submit `vp_token` to verifier `response_uri`
- **And** wallet MUST show verifier returned validation result to user

#### Scenario: Successful mdoc remote presentation
- **When** wallet scans an `openid4vp://?request_uri=...` URI that requests an `mso_mdoc` credential with a supported `doctype_value`
- **Then** wallet MUST fetch the request object and match a local `mso_mdoc` document
- **And** wallet MUST generate a `DeviceResponse` using that document's bound device key
- **And** wallet MUST submit the `DeviceResponse` as the `vp_token`
- **And** wallet MUST show verifier returned validation result to user

### Requirement: Error handling
System MUST return actionable errors for invalid states. The wallet MUST distinguish credential absence, capability mismatch, and document-not-presentable states in user-visible feedback.

#### Scenario: Invalid pre-authorized code
- **Given** token endpoint receives unknown pre-authorized code
- **Then** backend MUST return unauthorized error

#### Scenario: Missing vp_token
- **Given** verifier submit endpoint is called without `vp_token`
- **Then** backend MUST return bad request error

#### Scenario: No credential match in wallet
- **Given** wallet receives request object whose required type does not match local credentials
- **Then** wallet MUST fail fast with user-visible error

#### Scenario: Requested mdoc document is not presentable
- **Given** wallet matches a local `mso_mdoc` document for the request
- **And** that document is stored but its presentation state is not ready
- **When** the user attempts to continue the presentation flow
- **Then** wallet MUST block submission before verifier upload
- **And** wallet MUST show a user-visible explanation that the document cannot currently be presented
