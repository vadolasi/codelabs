# Capability: Workspace Access Control

## ADDED Requirements

### Requirement: Restricted Access
Only members of a workspace SHALL be able to view or interact with it.

#### Scenario: Unauthorized access attempt
- **Given** I am not a member of workspace "Private Project"
- **When** I try to access `/workspaces/private-project`
- **Then** I receive a 404 or 403 error.

### Requirement: Role-based Permissions
Permissions SHALL be enforced based on the user's role in the workspace.

#### Scenario: Viewer cannot send updates
- **Given** I have a "Viewer" role in "Project Alpha"
- **When** I try to send a Loro update via WebSocket
- **Then** the server rejects the update
- **And** my local changes are not broadcasted.

#### Scenario: Editor can send updates
- **Given** I have an "Editor" role in "Project Alpha"
- **When** I modify a file
- **Then** the Loro update is accepted and broadcasted to other members.

### Requirement: Track Last Access
The system SHALL track when a user last accessed a workspace to provide a "Recently Accessed" list.

#### Scenario: Timestamp update
- **Given** I am a member of "Project Alpha"
- **When** I successfully fetch the workspace data via API
- **Then** the `lastAccessedAt` timestamp for my membership record is updated to the current time.
