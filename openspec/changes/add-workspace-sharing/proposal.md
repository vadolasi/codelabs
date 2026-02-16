# Proposal: Workspace Sharing and Collaboration

This proposal aims to fully implement workspace sharing through invitations and controlled access. Currently, the system has real-time collaboration via Loro CRDTs, but lacks proper access control and a discovery mechanism for shared workspaces.

## Goals
- **Controlled Access**: Only authorized users (members) can view or edit a workspace.
- **Invitations**: Allow owners/admins to invite others via shareable links.
- **Workspace Discovery**: Users should see all workspaces they are members of on their dashboard.
- **Recent Access**: The home screen should highlight recently accessed workspaces.

## Scope
- Backend: Update workspace controllers to handle permission checks and invitation lifecycle.
- Backend: Implement email sending logic for direct invitations using Resend.
- Frontend: Add "Share" dialog to the workspace editor with two tabs (Link and Email).
- Frontend: Improve the dashboard to list shared workspaces and "recently accessed" ones.
- Database: Leverage existing `workspace_users` and `workspace_invites` tables.

## Relationships
- Relies on `auth-security` for user identification.
- Enhances `workspace-collaboration` by adding access control.
