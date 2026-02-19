# file-viewers Specification

## Purpose
TBD - created by archiving change improve-file-management. Update Purpose after archive.
## Requirements
### Requirement: File Viewer Registry
The system MUST implement a registry of file viewers to render files based on their type.

#### Scenario: Opening a Markdown file
1. **Given** a file with a `.md` extension.
2. **When** the file is opened in the editor area.
3. **Then** the `MarkdownViewer` component MUST be rendered.

#### Scenario: Opening a SVG file
1. **Given** a file with a `.svg` extension.
2. **When** the file is opened in the editor area.
3. **Then** the `ImageViewer` component MUST be rendered.

### Requirement: Binary File Detection
The system MUST detect binary files and prevent them from being edited in the `CodeViewer`.

#### Scenario: Detecting a binary file
1. **Given** a file with binary content.
2. **When** the system analyzes the file.
3. **Then** it MUST identify it as binary.
4. **And** it MUST show a `BinaryViewer` or a warning message instead of the editor.

