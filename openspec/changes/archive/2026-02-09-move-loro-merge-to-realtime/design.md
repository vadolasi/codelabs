# Design: Realtime-owned Loro persistence

## Goals
- Remove `loro-crdt` from the web Worker bundle.
- Keep snapshot and updates persistence aligned with Loro best practices.
- Preserve consistency and avoid lost updates during snapshot refresh.

## Non-Goals
- Changing the collaboration protocol or data model.
- Replacing Redis or S3-compatible storage.

## References
- Loro persistence best practices: https://loro.dev/docs/tutorial/persistence

## Current Flow (Summary)
- Web backend imports snapshot + updates using `LoroDoc` to produce a merged snapshot.
- This server-side import pulls in `loro-crdt` WASM into the Worker bundle.

## Proposed Flow
### Storage Model
- **Snapshot**: stored in S3-compatible storage (`workspace/<id>/snapshot.bin`).
- **Updates**: appended to Redis list (`workspace:<id>:doc`).

### Realtime Merge Ownership
- Realtime periodically loads snapshot + updates, imports into `LoroDoc`, exports a new snapshot, and trims the Redis list of applied updates.
- Snapshot refresh runs only for **active** workspaces. When a workspace becomes inactive, realtime removes the periodic trigger.
- Realtime is responsible for ensuring snapshot refresh is consistent and safe to repeat.

### Workspace Activity Tracking
- Maintain an activity signal per workspace (e.g., last-seen timestamp or active session count) updated on socket connect/disconnect.
- A workspace is **active** when there is at least one live session or recent activity within a short TTL.
- A workspace is **inactive** when no sessions are connected and the TTL has elapsed.

### Scheduling
- Preferred approach: time-based snapshot cadence (every 1 minute).
- bunqueue will own periodic jobs for reliability and observability.
- Jobs run only for active workspaces and are removed when the workspace becomes inactive.

### Client Bootstrap
- Web backend returns raw `snapshot` (if any) and `updates` list.
- Client imports snapshot then imports updates to reach the latest state.
- Client optionally triggers a `persist-snapshot` event to realtime after bootstrap to accelerate compaction.

## Consistency and Synchronization
- **Idempotent merge**: Importing the same updates multiple times should be safe; the CRDT converges.
- **Atomic trim**: Realtime trims only the updates it successfully applied before writing the new snapshot.
- **Version alignment**: Use an update count or timestamp (or Loro frontiers when available) to avoid trimming updates that were not applied.

## Snapshot Strategy (Based on Loro Docs)
- Use **Snapshot Encoding** for periodic full snapshots.
- Use **Updates Encoding** for frequent incremental updates.
- On load: import snapshot + updates; after import: export a new snapshot and remove imported updates.
- Consider **shallow snapshots** if history grows too large (optional).

## Version Marker Notes (Loro Docs)
- Loro supports **Version Vectors** and **Frontiers** to represent document versions.
- These can be used to derive safe trim boundaries, but are not required for the initial implementation.
- Default to update-count or timestamp trimming unless a stronger marker becomes necessary.

## Open Questions
N/A (decided: 1-minute cadence, BullMQ scheduling).
