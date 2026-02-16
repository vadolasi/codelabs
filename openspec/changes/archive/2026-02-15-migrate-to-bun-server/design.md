# Design: Bun server migration and local persistence

## Goals
- Remove Cloudflare Workers deployment and run the app on a single Bun server.
- Collapse web + realtime into one runtime process.
- Remove external Redis/S3/Postgres dependencies in favor of local `bun:sqlite` and `Bun.file`.
- Keep queueing and rate limiting with bunqueue.
- Upgrade password hashing to Argon2.

## Non-Goals
- Data migration from production (there is no existing production database).
- Multi-node clustering or high-availability changes.

## Architecture Overview
### Runtime
- Bun serves both HTTP (web) and Socket.IO (realtime) within the same process.
- The app runs as a traditional server, with environment variables managed by the host.

### Persistence
- Primary data storage: `bun:sqlite` database file.
- Workspace snapshots and binary assets: local filesystem using `Bun.file`.
- Queue and rate-limit storage: bunqueue (embedded mode, SQLite-backed).

### Auth and Sessions
- Password hashing uses Argon2.
- Session storage moves into the primary SQLite database (no Redis).

### Deployment and Tooling
- Package manager becomes Bun (e.g., `bun install`, `bun run`).
- pnpm workspace is removed; repo is simplified to a single app package.
- Docker/compose and deployment docs are updated for Bun server execution.

## Key Trade-offs
- Single-node local persistence simplifies ops but reduces horizontal scalability.
- Filesystem storage is fast but requires backup strategy at the host level.
- Collapsing realtime into web reduces network overhead but couples runtime concerns.

## Open Questions
- None (requirements were provided).
