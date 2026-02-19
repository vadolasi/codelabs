# Proposal: Improved File Management and Multi-Viewer Support

## Overview
This change aims to significantly enhance the file management capabilities of the Codelabs IDE. It includes standardizing file operations, implementing inline renaming/creation (similar to VS Code), adding support for file uploads/downloads (including ZIP exports), and introducing a multi-viewer system for different file types (Markdown, Images, etc.).

## User Value
- **Standardized UX**: A consistent way to manage files and folders across the IDE.
- **Improved Efficiency**: Inline renaming and creation reduce the friction of managing the project structure.
- **Better Interoperability**: Easy upload via drag-and-drop and the ability to download files/folders or the entire workspace as ZIP.
- **Rich File Support**: Users can view Markdown and SVGs directly, and binary files are handled gracefully without breaking the editor.

## Scope
- **Standardization**: Centralize file operations logic in `EditorState`.
- **Inline Editing**: Replace `prompt()` calls with inline input fields in the file tree for both renaming and creating new items.
- **Enhanced Actions**:
    - Support for file upload (drag & drop) with folder auto-open on hover.
    - Support for downloading individual files.
    - Support for downloading folders or the entire workspace as ZIP (using `fflate`).
    - Standardized delete/rename/duplicate actions.
- **Multi-Viewer System**:
    - Implementation of a `ViewerManager` to route file types to appropriate viewers.
    - `CodeViewer`: The existing CodeMirror editor for text files.
    - `ImageViewer`: Renders SVG and common image formats.
    - `MarkdownViewer`: Renders Markdown files with a preview.
    - Binary detection: Identify files that cannot be edited as text.
- **Binary File Handling**:
    - Introduce a third type of item in the CRDT: `binary`.
    - The CRDT will only store the hash, size, and mime type of the binary file.
    - Actual binary content will be stored on the backend, indexed by hash.
    - Implement a backend storage system in the `data` folder and a corresponding DB table.

## Out of Scope
- Moving files between directories (explicitly excluded by the user for now).
