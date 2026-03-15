# Project Context

## Purpose
Codelabs is a collaborative online IDE focused on programming education.

The product is designed to help teachers and students during the programming learning process by providing shareable workspaces, in-browser code execution, real-time collaboration, and an environment suited for classroom activities, guided practice, and experimentation.

The OpenSpec capabilities currently implemented cover:
- authentication and baseline security
- local storage and Bun server hosting
- single-package repository structure
- a multi-runtime execution engine
- real-time workspace collaboration
- membership-based workspace access control
- workspace invitations and sharing
- recent workspaces on the home screen
- file management, viewers, and filesystem watching

## Tech Stack
- TypeScript end-to-end
- Bun as the primary runtime, package manager, and production server base
- SvelteKit 2 + Svelte 5 + Vite for frontend and SSR
- Tailwind CSS 4 + DaisyUI for UI
- TanStack Query and TanStack Form on the frontend
- Elysia for the typed HTTP API under `/api`
- Socket.IO + `@socket.io/bun-engine` for real-time communication
- Loro CRDT + `loro-mirror` for collaborative state synchronization and mirroring
- Drizzle ORM + SQLite (`bun:sqlite`) for primary persistence
- Playwright for end-to-end testing
- Biome for formatting and linting
- WebContainers, Pyodide, and Skulpt as in-browser execution runtimes

## Project Conventions

### Code Style
- The project is TypeScript-first. Avoid adding new JavaScript logic unless there is a strong reason.
- Formatting and linting are managed through Biome.
- In JS/TS files, the current convention uses 2-space indentation, double quotes, and semicolons only when needed.
- The repository-wide configuration defaults to tabs, so preserve the existing style of the file you are editing.
- Svelte components use PascalCase names, for example `Editor.svelte` and `BinaryViewer.svelte`.
- Backend modules are organized by feature under `src/backend/modules/<feature>/index.ts`.
- Prefer typed APIs and explicit input validation. The current codebase uses Elysia `t.*` schemas in endpoints and Zod for configuration and targeted validations.
- Follow the product language already used in the interface and user-facing messages, which is currently mostly Brazilian Portuguese.

### Architecture Patterns
- The project is a single-package application, not a monorepo. Frontend, HTTP backend, realtime service, and database code live in the same repository and package.
- `src/hooks.server.ts` is the main entry point for request routing: `/api` requests are handled by the Elysia app and `/socket.io` connections are handled by the Bun realtime engine.
- The HTTP backend is modular and domain-oriented, with separate Elysia plugins for auth, users, workspaces, files, templates, and admin features.
- The workspace file tree uses Loro as the source of truth. The frontend mirrors that state through `loro-mirror`, and engines apply the CRDT tree to their runtime environments.
- Collaborative persistence is based on snapshots plus queued updates. The realtime service is responsible for merging updates, regenerating snapshots, and scheduling periodic refreshes with bunqueue.
- Runtimes follow a common abstraction based on `BaseEngine`, with explicit capabilities for terminal support, preview support, execution, external filesystem ingestion, and dependency management.
- Binary files are not stored inline in the CRDT. Only metadata and hashes are stored in collaborative state, while the actual content is persisted in backend local storage.
- The primary infrastructure is local-first: SQLite plus the local filesystem. The system does not require Postgres, Redis, or S3 for normal operation.

### Testing Strategy
- The main validation workflow currently combines `bun run check` for type and Svelte validation with `bun run format` through Biome.
- The project has Playwright end-to-end tests, but automated coverage is still limited and currently focused on smoke tests.
- When changing critical authentication, workspace access, collaboration, or file-management flows, prefer adding or expanding E2E coverage.
- The files under `openspec/specs/` act as the behavioral source of truth for implemented capabilities.

### Git Workflow
- The commit convention is Conventional Commits, enforced through Commitizen and commitlint.
- `lefthook` runs Biome on staged files before commits.
- There is no formally documented branching strategy in the repository, so keep changes small, focused, and easy to review.
- For meaningful capability, architecture, or behavior changes, follow the OpenSpec workflow before implementation: review existing specs, register a proposal under `openspec/changes/`, and only then change the code.

## Domain Context
- The product is built for classrooms, labs, workshops, and guided individual study.
- The main actors are teachers, students, and platform administrators.
- Core domain entities include users, sessions, workspaces, memberships with roles (`owner`, `admin`, `editor`, `viewer`), invitations, workspace templates, courses, classes, and conferences.
- Workspaces can be private or public, and real-time collaboration must respect workspace membership and user role.
- The core product experience revolves around opening a workspace, synchronizing project state in real time, running code in the browser, and sharing that environment with other people.
- Runtime selection is an important part of the teaching experience. WebContainers provide a fuller system and terminal experience for Node.js projects, Pyodide is the preferred Python runtime when package support is needed, and Skulpt is useful for simpler educational Python scenarios, especially when `turtle` support is required.
- The system already includes sharing and classroom-oriented recurrence features such as invitation links, email invitations, and recently accessed workspaces.

## Important Constraints
- The product must work primarily in the browser, so the runtimes have inherent and different limitations.
- Known runtime constraints include heavier browser requirements for WebContainers, weak `turtle` support in Pyodide, and partial language and standard-library coverage in Skulpt.
- The current target deployment is a Bun server. The project should not assume Cloudflare Workers as the primary runtime environment.
- Primary persistence must remain local, using SQLite and the filesystem without requiring external services for normal operation.
- In production, `DOMAIN`, `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are required.
- The application depends on isolation headers (`Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy`) to support parts of the in-browser execution environment correctly.
- Workspace access rules are restrictive by default. Only members may access private workspaces, and viewers must not be allowed to publish CRDT updates.
- Binary files must remain outside the main textual snapshot and be persisted by hash.

## External Dependencies
- Resend for transactional email delivery and some production contact and broadcast integrations.
- The StackBlitz WebContainers API for the in-browser POSIX-like runtime.
- Pyodide loaded from the jsDelivr CDN for in-browser Python execution.
- Skulpt distributed as local static assets for the simplified Python runtime.
- Socket.IO as the realtime transport layer between client and server.
- Local SQLite and the local filesystem as the primary data infrastructure.
- Umami, loaded in `src/app.html`, for frontend analytics.
