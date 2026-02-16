# hosting Specification

## Purpose
TBD - created by archiving change migrate-cloudflare-workers. Update Purpose after archive.
## Requirements
### Requirement: Bun server deployment
The system SHALL deploy as a Bun server instead of Cloudflare Workers.

#### Scenario: Production deployment on a server
- **WHEN** a production build is created
- **THEN** the app runs as a Bun server process
- **AND** no Cloudflare Workers-specific artifacts are required

### Requirement: Runtime configuration
The system SHALL load runtime configuration from server-managed environment variables.

#### Scenario: Server-provided environment variables
- **WHEN** the server starts
- **THEN** the runtime reads configuration from the host environment

