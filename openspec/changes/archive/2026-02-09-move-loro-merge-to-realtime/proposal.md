# Change: Move Loro merge to realtime service

## Why
The web Worker bundle now exceeds Cloudflare size limits because the backend imports `loro-crdt` (WASM). Moving merge/persistence to the realtime service keeps the Worker lightweight while preserving collaboration reliability.

## What Changes
- Realtime becomes the single place that merges snapshot + updates and produces refreshed snapshots.
- The web backend returns raw persistence data (snapshot and update list) without importing or merging with `LoroDoc`.
- The client bootstraps state by importing snapshot + updates and can request snapshot persistence after bootstrap.
- Snapshot refresh is time-based (1 minute cadence) and only runs for active workspaces with connected users; when a workspace becomes inactive, the periodic trigger is removed.

## Impact
- Affected specs: new `workspace-collaboration` capability (persistence/merge flow).
- Affected code: realtime service, web backend workspace endpoint, and editor bootstrap logic.
