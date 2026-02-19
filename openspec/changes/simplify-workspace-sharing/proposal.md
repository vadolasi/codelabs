# Proposal: Simplified Sharing, Workspace Forking, and Templates

## Why
The current sharing system is overly complex, relying on individual email invitations which creates friction for classroom and rapid collaboration scenarios. Additionally, there is no way to clone existing projects or create reusable boilerplate "templates" that preserve the final state while discarding the development history.

## What Changes
- **Simplified Roles**: Consolidate workspace roles into Owner, Editor, and Viewer.
- **Role-based Share Links**: Replace complex individual invitations with shareable, reusable links for "Editor" and "Viewer" roles.
- **Workspace Forking**: 
    - Implement the ability to create a copy of any workspace the user has access to.
    - When forking, the system MUST prompt the user for a new name, defaulting to "<original name> (fork)".
- **Template System**:
    - Allow Owners to generate "Templates" from workspaces.
    - Template generation will "clean" the Loro-CRDT history, storing only the current snapshot state.
    - Accessing a template will mandate a "Fork" operation before editing.
- **Unified Sharing UI**: Redesign the Share Modal to manage active members, share links, and template generation in one place.

## User Value
- **Lower Friction**: Quickly share a project with a whole class via a single link.
- **Reusability**: Teachers can create starter templates for assignments that students can fork with a fresh history.
- **Collaboration Control**: Easily manage who is in the project and revoke access by resetting links or removing members.
