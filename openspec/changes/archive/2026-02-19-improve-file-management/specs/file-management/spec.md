# Spec Delta: File Management Improvements

## ADDED Requirements

### Requirement: Centralized File Operations API
The system MUST provide a centralized API in `EditorState` to perform file and folder operations, ensuring consistency between the CRDT state and the runtime engine.

#### Scenario: Creating a file via centralized API
1. **Given** a parent directory path.
2. **When** the `createFile` method is called with a name.
3. **Then** the file MUST be added to the Loro CRDT `filesMap`.
4. **And** the file MUST be added to the parent's children list.
5. **And** the change MUST be synchronized with the active runtime engine.

### Requirement: Inline File Creation and Renaming
The file tree MUST support inline renaming and item creation without using modal dialogs or `prompt()`.

#### Scenario: Creating a new file inline
1. **Given** the user triggers "New File" from the context menu.
2. **When** an empty input field appears in the file tree.
3. **And** the user types a name and presses `Enter`.
4. **Then** the file created with the given name.

#### Scenario: Canceling creation/renaming
1. **Given** the user is in an inline input field.
2. **When** the user presses `ESC`.
3. **Then** the operation MUST be canceled and the input MUST disappear.

### Requirement: File Upload Support
The file tree MUST support uploading files and directories via drag-and-drop.

#### Scenario: Dropping files onto the tree
1. **Given** the user drags files from the host system.
2. **When** the files are dropped onto the file tree.
3. **Then** the system MUST upload the files to the target directory.
4. **And** it SHOULD recursively upload directory contents.

### Requirement: ZIP Download Support
The system MUST allow downloading folders or the entire workspace as a ZIP file using `fflate`.

#### Scenario: Downloading workspace as ZIP
1. **Given** the user selects "Download as ZIP" for the workspace.
2. **When** the request is processed.
3. **Then** the system MUST generate a ZIP file containing all project files.
4. **And** trigger a browser download.

### Requirement: Binary File Support
The system MUST support binary files by storing only their hash and metadata in the CRDT and the actual content on the backend.

#### Scenario: Uploading a binary file
1. **Given** the user drops a binary file (e.g., `image.png`).
2. **When** the system detects it as binary.
3. **Then** the system MUST calculate the SHA-256 hash.
4. **And** the system MUST upload the content to the backend.
5. **And** the system MUST add an item of type `binary` with the hash to the CRDT `filesMap`.
