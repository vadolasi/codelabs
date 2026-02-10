# Change: Migrate to Bun server runtime

## Why
Cloudflare Workers constraints now limit the build, and the project can benefit from a single Bun server with local persistence, lower latency, and simpler ops.

## What Changes
- Replace Cloudflare Workers hosting with a Bun server runtime.
- Consolidate web + realtime into a single Bun app and remove the monorepo structure.
- Switch package management from pnpm to Bun.
- Replace external Redis/S3/Postgres usage with `bun:sqlite` and `Bun.file` for local persistence.
- Use bunqueue for queues and rate limiting.
- Use Argon2 for password hashing.

## Impact
- Affected specs: hosting (modified), new capabilities for local storage, project structure, and auth security.
- Affected code: deployment pipeline, storage/data access, auth hashing, realtime integration, repo layout.
