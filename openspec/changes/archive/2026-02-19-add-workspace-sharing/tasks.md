# Tasks: Workspace Sharing and Access Control

## 1. Backend: Access Control and Permissions
- [x] 1.1 Add `lastAccessedAt` field to `workspaces__users` table in `src/backend/database/schema.ts`.
- [x] 1.2 Update `GET /workspaces/:slug` to ensure the user is a member and update `lastAccessedAt`.
- [x] 1.3 Update the WebSocket connection logic in `src/backend/realtime.ts` to validate workspace membership.
- [x] 1.4 Implement role-based restrictions for WebSockets (Viewer role cannot broadcast updates).

## 2. Backend: Invitations Improvements
- [x] 2.1 Refine `POST /workspaces/invite` to support optional email restrictions (supported via `users` field).
- [x] 2.2 Verify `POST /workspaces/join/:token` handles the `users` (emails) list check correctly.
- [x] 2.3 Implement direct email invitation logic in `POST /workspaces/invite` using Resend.

## 3. Frontend: Workspace Sharing UI
- [x] 3.1 Create a `ShareModal` component with tabs for Link and Email invitations.
- [x] 3.2 Add a "Share" button to the workspace editor header (`src/components/Editor/index.svelte`).
- [ ] 3.3 Add a "Members" management view (list members, change roles, remove members).

## 4. Frontend: Dashboard and Home
- [x] 4.1 Update `src/routes/(authed)/(app)/+page.svelte` to fetch and display recently accessed workspaces.
- [x] 4.2 Update `src/routes/(authed)/(app)/workspaces/+page.svelte` to distinguish between "My Workspaces" (Owner) and "Shared with Me" (Role column).

## 5. Validation
- [ ] 5.1 Test invitation flow with and without email restrictions.
- [ ] 5.2 Verify that a "Viewer" cannot modify files (server-side rejection).
- [ ] 5.3 Verify that the Home screen correctly updates the list based on recent access.
