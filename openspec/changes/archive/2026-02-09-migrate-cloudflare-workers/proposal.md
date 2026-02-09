# Change: Migrate hosting from Vercel to Cloudflare Workers

## Why
The project is currently configured for Vercel hosting. Moving to Cloudflare Workers will align hosting with the requested platform and enable deployment via Workers tooling.

## What Changes
- Switch the SvelteKit adapter and deployment target from Vercel to Cloudflare Workers.
- Add Workers configuration and deployment workflow based on the Cloudflare migration guidance.
- Update project build/deploy documentation and remove Vercel-specific hosting configuration.
- **BREAKING**: Hosting/runtime changes may require updates to environment variables, edge runtime compatibility, and any Vercel-specific integrations.

## Impact
- Affected specs: hosting (new)
- Affected code: web/svelte.config.js, web/package.json, web/vercel.json, web/src/routes/+layout.svelte, web/src/backend/modules/workspaces/workspaces.controller.ts, CI/CD configuration (if present)
