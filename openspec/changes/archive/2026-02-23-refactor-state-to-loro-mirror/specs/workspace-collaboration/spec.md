## ADDED Requirements

### Requirement: Declarative State Mirroring
The system MUST use `loro-mirror` to provide a typed, immutable view of the workspace state that is automatically synchronized with the underlying Loro CRDT document.

#### Scenario: State update from CRDT event
- **GIVEN** a `Mirror` store with a `workspaceSchema`.
- **WHEN** a Loro update is imported into the document.
- **THEN** the mirrored state MUST be updated to reflect the new CRDT state.
- **AND** Svelte components subscribed to the mirrored state MUST re-render.

#### Scenario: CRDT update from state mutation
- **GIVEN** a `Mirror` store with a `workspaceSchema`.
- **WHEN** `setState` is called to modify the file tree.
- **THEN** the `Mirror` MUST translate the change into granular Loro CRDT operations.
- **AND** the Loro document MUST be committed.
