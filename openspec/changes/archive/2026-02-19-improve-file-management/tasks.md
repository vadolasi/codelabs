# Tasks: Improved File Management and Multi-Viewer Support

- [x] Add `fflate` to `package.json` dependencies <!-- id: 0 -->
- [x] Update `Item` type in `src/components/Editor/FileTree/types.d.ts` to include `binary` type <!-- id: 13 -->
- [x] Create `src/backend/modules/files/index.ts` for binary file storage <!-- id: 14 -->
- [x] Register `filesController` in `src/backend/index.ts` <!-- id: 15 -->
- [x] Implement centralized file operations in `EditorState` (`createFile`, `createFolder`, `renameItem`, `deleteItem`, `duplicateItem`, `uploadFile`) <!-- id: 1 -->
- [x] Refactor `FileTree/index.svelte` and `TreeItem.svelte` to use the new `EditorState` methods <!-- id: 2 -->
- [x] Implement inline renaming logic in `TreeItem.svelte` with `ESC` and `Enter` support <!-- id: 3 -->
- [x] Implement inline creation logic (temporary item mode) in `FileTree` <!-- id: 4 -->
- [x] Implement Drag & Drop upload in `FileTree` with folder hover auto-open and binary detection <!-- id: 5 -->
- [x] Implement ZIP download functionality for folders and workspace using `fflate` <!-- id: 6 -->
- [x] Create `ViewerHost.svelte` and implement the viewer routing logic <!-- id: 7 -->
- [x] Implement `MarkdownViewer.svelte` <!-- id: 8 -->
- [x] Implement `ImageViewer.svelte` (supporting SVGs and binary images) <!-- id: 9 -->
- [x] Implement `BinaryViewer.svelte` for non-renderable binary files <!-- id: 16 -->
- [x] Implement binary file detection and hashing logic <!-- id: 10 -->
- [x] Verify file management actions (create, rename, delete, upload, download) <!-- id: 11 -->
- [x] Verify multi-viewer routing for different file extensions <!-- id: 12 -->
