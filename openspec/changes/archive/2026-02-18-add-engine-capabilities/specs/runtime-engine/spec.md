## ADDED Requirements

### Requirement: CRDT file tree as source of truth
The system SHALL treat the Loro CRDT file tree as the source of truth for workspace contents, and engines SHALL apply it to their runtime environment.

#### Scenario: Engine applies initial CRDT tree
- **WHEN** a workspace is opened
- **THEN** the engine initializes its runtime filesystem from the CRDT file tree

### Requirement: Engine capability discovery
The system SHALL expose runtime engine capabilities so callers can detect whether optional features (e.g. interactive terminal, live preview, filesystem watcher) are supported.

#### Scenario: Terminal unsupported
- **WHEN** an engine does not support an interactive terminal
- **THEN** the engine reports `terminal` capability as unsupported
- **AND** the UI does not attempt to open an interactive terminal session

#### Scenario: Preview unsupported
- **WHEN** an engine does not support preview URLs
- **THEN** the engine reports `preview` capability as unsupported
- **AND** the UI does not render a preview panel

### Requirement: Optional external filesystem ingestion
If an engine supports ingesting external filesystem changes, it SHALL provide a mechanism to apply those changes into the CRDT file tree.

#### Scenario: External changes are ingested
- **WHEN** the engine detects filesystem changes made outside of CRDT-driven writes (e.g. via commands)
- **THEN** the engine updates the CRDT file tree to reflect those changes

### Requirement: Preview lifecycle events
If preview is supported, the engine SHALL provide lifecycle notifications for preview endpoints.

#### Scenario: Preview opens and closes
- **WHEN** a preview endpoint becomes available
- **THEN** the engine emits a preview-open event with port and URL
- **WHEN** the preview endpoint stops
- **THEN** the engine emits a preview-close event for that port
