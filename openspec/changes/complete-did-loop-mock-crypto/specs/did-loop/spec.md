# did-loop Spec

## Requirement: End-to-end DID loop with mock crypto and real network interactions
System MUST support a runnable loop: issuance offer scan -> credential retrieval -> wallet storage -> verification request scan -> user-confirmed presentation -> verifier result echo.

### Scenario: Successful issuance and verification
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

## Requirement: Status tracking and observability
Backend MUST log key state transitions and expose health.

### Scenario: Runtime observability
- **Given** backend handles issuance and verification requests
- **When** offer/token/credential and verification request/submit occur
- **Then** backend logs MUST contain correlation-friendly events
- **And** `/health` MUST return service liveness payload

## Requirement: Error handling
System MUST return actionable errors for invalid states.

### Scenario: Invalid pre-authorized code
- **Given** token endpoint receives unknown pre-authorized code
- **Then** backend MUST return unauthorized error

### Scenario: Missing vp_token
- **Given** verifier submit endpoint is called without `vp_token`
- **Then** backend MUST return bad request error

### Scenario: No credential match in wallet
- **Given** wallet receives request object whose required type does not match local credentials
- **Then** wallet MUST fail fast with user-visible error
