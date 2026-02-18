# Change: Add engine capabilities and generic engine abstraction

## Why
The current runtime integration is tightly coupled to WebContainer APIs, which makes it hard to add other runtime engines. Some engines will not be able to provide a full interactive terminal or live preview URLs, so the UI and supporting services need an explicit way to detect what is available.

## What Changes
- Introduce a generic runtime engine API and implement engine "capabilities" (e.g. `terminal`, `preview`, `fsWatcher`).
- Refactor the existing WebContainer engine implementation to conform to the generic engine API.
- Update runtime-dependent UI paths to gracefully degrade when a capability is missing (hide/disable terminal and/or preview, avoid registering engine-only listeners).
- Keep `fs-watcher` as a WebContainer-specific implementation for ingesting filesystem changes back into Loro; other engines MAY implement filesystem ingestion in different ways.

## Impact
- Affected specs: `fs-watcher` (and a new `runtime-engine` capability)
- Affected code: `src/lib/engine/**`, `src/components/Editor/**`, `src/routes/**`
