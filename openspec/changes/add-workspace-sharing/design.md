# Design: Workspace Sharing and Access Control

## Architecture

### 1. Invitation Flow
- An owner/admin generates an invitation in a workspace.
- The system creates a record in `workspace_invites` with a unique token.
- The link `/invite/[token]` redirects the user to the "join" logic.
- Upon joining, a record is created in `workspace_users` and the user is redirected to the workspace.

### 2. Access Control (Permissions)
- The backend currently checks membership in `GET /workspaces/:slug`.
- We need to ensure that the WebSocket connection also validates membership before allowing Loro updates.
- Role-based restrictions (Viewer vs Editor) should be enforced at the Loro level or by rejecting updates from Viewers.

### 3. Recent Workspaces
- We will use the `updatedAt` field in `workspace_users` to track when a user last accessed a workspace.
- The Home screen will query `workspace_users` ordered by `updatedAt` to show the most relevant ones.

## UI/UX
- **Share Button**: Placed in the Workspace Header.
- **Share Modal**: Allows generating a link and choosing a role (Editor/Viewer).
- **Dashboard**: Tabbed or unified list showing "My Workspaces" and "Shared with Me".
