# Capability: Home Recent Workspaces

## MODIFIED Requirements

### Requirement: Home Screen Listing
The home screen SHALL display the workspaces the user has accessed most recently.

#### Scenario: Display recent workspaces
- **Given** I am a user with multiple workspaces
- **When** I visit the home screen
- **Then** I see a list of the 5 most recently updated/accessed workspaces.

### Requirement: Track Workspace Access
Accessing a workspace SHALL update the user's last access timestamp.

#### Scenario: Access workspace updates timestamp
- **Given** I am a member of "Project Alpha"
- **When** I open "Project Alpha" in the editor
- **Then** the `workspace_users` record for my user and that workspace is updated with the current timestamp.
