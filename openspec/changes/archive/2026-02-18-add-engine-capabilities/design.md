## Context
Today the app consumes WebContainer directly in multiple places (boot/mount, spawn for terminal, port events for preview, and a watcher process for filesystem events). We want to support multiple runtime engines, some of which may only provide a filesystem and non-interactive command execution.

The Loro CRDT file tree is the source of truth for workspace contents. Engines will have access to that data structure and are responsible for keeping their runtime environment consistent with it. Some engines also need a way to ingest external filesystem changes (e.g. changes made by commands executed inside an environment).

## Goals / Non-Goals
- Goals:
  - Provide an explicit capability model so callers can branch safely.
  - Keep the engine API minimal and stable; avoid leaking engine-specific types outside `src/lib/engine/**`.
  - Allow partial implementations (filesystem-only engines) without breaking the UI.
- Non-Goals:
  - Unify all engines behind identical semantics (e.g. exact PTY behavior) on day one.
  - Require every engine to implement preview or terminal.

## Decisions
- Decision: Add `capabilities` to the engine instance.
  - `capabilities` is a readonly object of booleans describing support.
  - Callers MUST guard usage of optional features with `capabilities`.
- Decision: Model preview as engine events rather than WebContainer-specific hooks.
  - Engines that support preview MUST emit open/close events with `{ port, url }`.
- Decision: Model terminal as an optional API returning a bidirectional stream/process abstraction.
  - Engines without interactive processes set `capabilities.terminal = false`.
- Decision: Treat filesystem ingestion as engine-defined.
  - Engines MUST be able to apply the CRDT file tree into their runtime filesystem.
  - Engines MAY additionally support ingesting external filesystem changes back into Loro.
  - The existing `fs-watcher` remains a WebContainer-only ingestion mechanism; other engines can implement ingestion differently.

## Risks / Trade-offs
- Capability checks can proliferate; mitigate via small helper functions/components.
- Some engines may only support a "limited terminal" (non-PTY). Mitigate by supporting `terminalMode` later if needed.

## Migration Plan
1. Introduce generic engine types and capabilities (no behavior changes).
2. Port WebContainer engine and fs-watcher to generic API.
3. Update Editor and route bootstrapping to consume the generic engine instead of WebContainer directly.
4. Add another engine implementation (future) to validate the abstraction.

## Open Questions
- What is the exact generic engine interface we are aligning to (existing code snippet or package)?
- Do we need more granular terminal capability (e.g. `terminal: 'pty' | 'exec' | false`) instead of a boolean?
