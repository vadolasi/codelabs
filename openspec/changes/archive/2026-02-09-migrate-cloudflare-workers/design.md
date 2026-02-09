## Context
- The web app is a SvelteKit project using the Vercel adapter and Vercel-specific services (analytics, blob storage).
- The goal is to host on Cloudflare Workers. Cloudflare guidance recommends configuring a wrangler file and using the appropriate SvelteKit adapter for Workers.

## Goals / Non-Goals
- Goals:
  - Deploy the existing SvelteKit app to Cloudflare Workers using Workers Assets.
  - Provide a clear local dev and CI/CD flow aligned with Workers tooling.
  - Retain functional parity with current production behavior.
- Non-Goals:
  - Re-architecting the app or backend runtime beyond what is required for Workers compatibility.
  - Changing the product feature set.

## Decisions
- Use Cloudflare Workers as the hosting target (not Pages), following the Vercel-to-Workers migration guidance.
- Configure a wrangler file in the web project root to define build output and assets directory.
- Replace the SvelteKit Vercel adapter with the Cloudflare adapter and align build scripts accordingly.
- Remove Vercel Analytics from the web app.
- Retain Vercel Blob usage for now to avoid a storage migration during hosting changes.

## Risks / Trade-offs
- Vercel-specific integrations (analytics and blob storage) may require replacement or continued external usage. This affects vendor lock-in and runtime compatibility.
- Workers runtime limitations may require code adjustments if Node.js-only APIs are used.

## Compatibility Audit Findings
- Uses the node Redis client over TCP, which is not supported in Workers without a compatible gateway.
- Reads a local Lua script via `node:fs/promises` in the rate limit module.
- Uses `@vercel/blob` for workspace snapshots.
- Uses `node:crypto` (now via `scrypt`) and `Buffer` in backend logic; this relies on `nodejs_compat`.

## Migration Plan
1. Capture current build command and output directory.
2. Add Workers configuration (wrangler) and set compatibility date.
3. Switch SvelteKit adapter to Cloudflare and update build/deploy scripts.
4. Validate local dev and production deploy on Workers.
5. Update documentation and clean Vercel-only configuration.

## Open Questions
- Should Vercel Blob be replaced with Cloudflare R2 (or another Workers-compatible object store) in a follow-up change?
- Are there any Node.js-only APIs that must be preserved, or should they be refactored for Workers compatibility?
