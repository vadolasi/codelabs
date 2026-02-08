# Change: add bundled filesystem watcher process

## Why
WebContainer’s default filesystem watcher provides limited event detail, making it hard to reliably detect creates, deletes, renames, and moves. A bundled watcher process can emit richer events with predictable performance and without relying on undocumented APIs.

## What Changes
- Add a bundled fs-watcher script (built via esbuild) that runs inside the WebContainer and emits file events on stdout.
- Inject the watcher script as a hidden file during container initialization and launch it as a long-lived process for each workspace.
- Define a minimal, performance-focused stdout event format for downstream parsing.

## Impact
- Affected specs: fs-watcher (new)
- Affected code: webcontainer initialization flow, workspace lifecycle, editor file tree event ingestion
