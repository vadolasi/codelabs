## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Cloudflare Workers Deployment
**Reason**: The app no longer targets Workers.
**Migration**: Replace with Bun server deployment.

### Requirement: SvelteKit Workers Adapter
**Reason**: The runtime is no longer Workers-based.
**Migration**: Replace with Bun server adapter/entrypoint.

### Requirement: Environment and Binding Configuration
**Reason**: Workers bindings are no longer used.
**Migration**: Use server environment variables.
