# Capability: Workspace Invitations

## MODIFIED Requirements

### Requirement: Create Invitation
Owners or admins SHALL be able to generate shareable invitation links with specific roles.

#### Scenario: Generate generic invitation link
- **Given** I am an owner of workspace "Project Alpha"
- **When** I request an invitation link with role "Editor"
- **Then** a unique token is generated and stored in `workspace_invites`
- **And** the link can be shared with anyone.

#### Scenario: Restrict invitation to specific emails
- **Given** I am an admin of workspace "Project Alpha"
- **When** I request an invitation link for "user@example.com"
- **Then** the invitation record stores the allowed email
- **And** only a user logged in with "user@example.com" can use it.

### Requirement: Join via Invitation
Users SHALL be able to join a workspace using a valid invitation token.

#### Scenario: Successfully join workspace
- **Given** I have a valid invitation token for "Project Alpha"
- **When** I access `/invite/[token]` while logged in
- **Then** I am added as a member of "Project Alpha"
- **And** I am redirected to the workspace development environment.
