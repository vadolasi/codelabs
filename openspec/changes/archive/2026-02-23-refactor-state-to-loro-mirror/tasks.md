## 1. Setup
- [x] 1.1 Add `loro-mirror` dependency to `package.json` (`bun add loro-mirror`) <!-- id: 1 -->

## 2. Refactor `EditorState`
- [x] 2.1 Define `workspaceSchema` in `src/components/Editor/editorState.svelte.ts` <!-- id: 2 -->
- [x] 2.2 Initialize `Mirror` in `EditorState` constructor <!-- id: 3 -->
- [x] 2.3 Refactor `reset` method to re-initialize `Mirror` <!-- id: 4 -->
- [x] 2.4 Refactor `createFile` and `createFolder` to use `mirror.setState` <!-- id: 5 -->
- [x] 2.5 Refactor `deleteItem` and `renameItem` to use `mirror.setState` <!-- id: 6 -->
- [x] 2.6 Refactor `duplicateItem` and `copyItemRecursive` <!-- id: 7 -->
- [x] 2.7 Refactor `uploadFile` <!-- id: 8 -->
- [x] 2.8 Replace `filesMap` derivation with `mirror` subscription <!-- id: 9 -->

## 3. Component Integration
- [x] 3.1 Update `FileTree` components to consume the new mirrored state <!-- id: 10 -->
- [x] 3.2 Update `CodeViewer` to get `LoroText` container from `Mirror` <!-- id: 11 -->

## 4. Validation
- [ ] 4.1 Verify real-time collaboration with multiple sessions <!-- id: 12 -->
- [ ] 4.2 Verify `UndoManager` functionality with the new state management <!-- id: 13 -->
- [ ] 4.3 Verify file operations (create, rename, delete, move) through the UI <!-- id: 14 -->
- [ ] 4.4 Verify binary file uploads and downloads <!-- id: 15 -->
