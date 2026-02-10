## 1. Runtime and Hosting
- [ ] Remove Cloudflare Workers deployment and adapter.
- [ ] Add Bun server entrypoint for HTTP + realtime in one process.
- [ ] Update deployment docs and scripts for Bun server hosting.

## 2. Project Structure
- [ ] Collapse monorepo into a single app package.
- [ ] Replace pnpm with Bun as the package manager.
- [ ] Update scripts and tooling references to Bun.

## 3. Persistence Layer
- [ ] Replace Postgres/Drizzle config with `bun:sqlite` storage.
- [ ] Move sessions, workspace state, and app data into SQLite.
- [ ] Replace S3 usage with local filesystem persistence via `Bun.file`.

## 4. Queue and Rate Limiting
- [ ] Keep bunqueue for queues and rate limiting.
- [ ] Update queue storage/config for local embedded mode.

## 5. Auth Security
- [ ] Switch password hashing to Argon2.
- [ ] Update authentication flows to use the new hash algorithm.

## 6. Validation
- [ ] Verify web + realtime operate together under Bun.
- [ ] Validate local persistence for sessions, workspaces, and snapshots.
- [ ] Confirm worker-free build and deploy pipeline.
