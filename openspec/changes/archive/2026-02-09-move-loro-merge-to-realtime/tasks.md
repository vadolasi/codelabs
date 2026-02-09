## 1. Proposal Confirmation
- [ ] Confirm snapshot cadence interval for active workspaces (1 minute).
- [ ] Confirm bunqueue is the scheduler for periodic jobs.
- [ ] Confirm whether client-triggered snapshot persistence is required.

## 2. Realtime Persistence Ownership
- [ ] Add realtime merge routine: load snapshot + updates, import, export snapshot, and trim applied updates.
- [ ] Track workspace activity (active sessions + last-seen) and mark inactive state.
- [ ] Schedule periodic snapshot jobs for active workspaces only.
- [ ] Remove the periodic trigger when a workspace becomes inactive.
- [ ] Add guards for concurrent merges (single-flight per workspace).
- [ ] Validate that updates are not lost during snapshot refresh.

## 3. Web Backend Adjustments
- [ ] Remove server-side `LoroDoc` usage in the workspace endpoint.
- [ ] Return raw snapshot and pending updates for client bootstrap.

## 4. Client Bootstrap
- [ ] Apply snapshot + updates in the editor bootstrap.
- [ ] Emit `persist-snapshot` after bootstrap (if confirmed).

## 5. Validation
- [ ] Verify Worker bundle size is below 3 MiB gzip.
- [ ] Validate snapshot/updates convergence with multi-client tests.
- [ ] Ensure updates queue is trimmed after snapshot refresh.
