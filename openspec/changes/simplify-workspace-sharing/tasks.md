# Tasks: Simplified Sharing, Forking, and Templates

- [x] Add `visibility` column to `workspaces` table in `src/backend/database/schema.ts` <!-- id: 0 -->
- [x] Implement `POST /api/workspaces/:id/fork` endpoint with optional `name` parameter <!-- id: 1 -->
- [x] Implement `POST /api/workspaces/:id/template` endpoint with CRDT history cleaning <!-- id: 2 -->
- [x] Implement `GET /api/templates/:id` and `POST /api/templates/:id/fork` <!-- id: 3 -->
- [x] Update `POST /api/workspaces/invite` to handle reusable role-based tokens <!-- id: 4 -->
- [x] Implement `GET /api/workspaces/:id/members` to list workspace users <!-- id: 5 -->
- [x] Implement `DELETE /api/workspaces/:id/members/:userId` to remove users <!-- id: 6 -->
- [x] Redesign `src/components/Editor/ShareModal.svelte` with member list and persistent links <!-- id: 7 -->
- [x] Add "Fork" button with name prompt to the Editor top bar or workspace list <!-- id: 8 -->
- [x] Create Template landing page/route for mandatory forking <!-- id: 9 -->
- [ ] Verify forking preserves file state but generates new workspace identity <!-- id: 10 -->
- [ ] Verify template generation removes Loro CRDT history <!-- id: 11 -->
- [ ] Verify removing a member revokes their access immediately <!-- id: 12 -->
