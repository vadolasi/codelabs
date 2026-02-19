# Spec Delta: Workspace Management (Fork & Templates)

## ADDED Requirements

### Requirement: Workspace Forking
The system MUST allow users to fork a workspace they have access to, creating a new personal copy with the exact same file state.

#### Scenario: Forking a workspace
1. **Given** a user has "Viewer" or "Editor" access to "Project Alpha".
2. **When** the user clicks "Fork".
3. **And** the user provides the name "My Custom Fork".
4. **Then** a new workspace "My Custom Fork" is created.
5. **And** the user becomes the "Owner" of the new workspace.
6. **And** all files and directories are copied to the new workspace.

#### Scenario: Forking with default name
1. **Given** a user clicks "Fork" for "Project Alpha".
2. **When** the user confirms the default name prompt.
3. **Then** a new workspace "Project Alpha (fork)" is created.

### Requirement: Template Generation
The system MUST allow workspace Owners to generate templates that store a "clean" snapshot of the current state.

#### Scenario: Generating a template
1. **Given** I am the Owner of a workspace.
2. **When** I trigger "Generate Template".
3. **Then** the system MUST export the current file state into a new CRDT snapshot with zero history.
4. **And** store it in the templates registry.

### Requirement: Mandatory Fork for Templates
Accessing a template MUST mandate a fork operation before any editing can occur.

#### Scenario: Using a template
1. **Given** a public template link.
2. **When** a user accesses the link.
3. **Then** the system MUST prompt the user to "Fork" the template.
4. **And** after forking, the user is redirected to their new workspace.
