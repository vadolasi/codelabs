# Spec Delta: Simplified Collaboration

## MODIFIED Requirements

### MODIFIED Requirement: Create Invitation
Owners SHALL be able to maintain persistent shareable links for both "Editor" and "Viewer" roles.

#### Scenario: Copy persistent invitation link
1. **Given** I am an owner of workspace "Project Alpha".
2. **When** I open the Share Modal.
3. **Then** I can see a "Copy Link" button for the Editor role.
4. **And** the link contains a token that is reusable by multiple people.

#### Scenario: Revoking access via link reset
1. **Given** a share link has been distributed.
2. **When** the Owner clicks "Reset Link".
3. **Then** the old token MUST be invalidated.
4. **And** a new token MUST be generated.

## ADDED Requirements

### Requirement: Manage Active Members
The Share Modal MUST display a list of all users who have joined the workspace and allow the owner to remove them.

#### Scenario: Removing a member
1. **Given** I am an owner.
2. **And** user "Student A" is an "Editor" in my workspace.
3. **When** I click "Remove" next to their name.
4. **Then** the user MUST be removed from `workspace_users`.
5. **And** their active session SHOULD be terminated.
