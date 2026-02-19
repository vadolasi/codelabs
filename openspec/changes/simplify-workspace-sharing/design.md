# Design: Simplified Sharing, Forking, and Templates

## Architecture

### Simplified Sharing Model
We will transition from "one token per email" to "one reusable token per role".
- **Database**: The `workspace_invites` table will be simplified. The `users` (allowed emails) column will be optional. If null, anyone with the link can join.
- **Roles**: Strict enforcement of `owner`, `editor`, and `viewer`.
    - `Owner`: Full access + member management.
    - `Editor`: Read/Write access to files + Terminal access.
    - `Viewer`: Read-only access to files + Terminal output only.

### Workspace Forking
Forking a workspace creates a deep copy of its current state.
1. **API**: `POST /api/workspaces/:id/fork`
    - Accepts an optional `name` parameter in the body.
2. **Process**:
    - Retrieve the latest snapshot and pending updates of the source workspace.
    - Merge them into a single coherent snapshot.
    - Create a new workspace record with the provided `name` (or default to "<original> (fork)"), a new ID, and a new slug.
    - Save the merged snapshot as the initial state of the new workspace.
    - Assign the current user as the `owner`.

### Template System
Templates act as read-only blueprints.
1. **Generation**: `POST /api/workspaces/:id/template`
    - The server creates a *fresh* LoroDoc.
    - It iterates over the source workspace's `filesMap`.
    - It reconstructs the entire file tree in the fresh LoroDoc.
    - It exports this new Doc as a snapshot (clearing all previous edit history).
    - Stores the result in `workspace_templates`.
2. **Consumption**: `GET /templates/:id`
    - UI shows a preview or a "Use this Template" button.
    - Clicking the button triggers a "Fork" from the template into a new workspace.

### Frontend Integration
The `ShareModal.svelte` will be completely overhauled:
- **Members List**: Fetches and displays `workspace_users` with roles.
- **Invite Links**: Displays persistent "Copy Editor Link" and "Copy Viewer Link" buttons.
- **Template Section**: A section for Owners to "Publish as Template".

## Security Considerations
- **Permissions**: Ensure only Owners can generate templates or manage members.
- **Revocation**: Resetting a share link will generate a new token and invalidate the old one in `workspace_invites`.
