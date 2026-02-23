# Change: Refactor state management to use `loro-mirror`

## Why
Currently, `EditorState` manually manages the synchronization between Svelte 5 runes and Loro CRDT containers. This "glue code" is repetitive, complex, and difficult to maintain. `loro-mirror` provides a declarative schema-based approach to keep a typed, immutable app-state view in sync with a Loro CRDT document, which significantly simplifies the implementation while retaining all CRDT benefits (collaboration, offline-first, history).

## What Changes
- **Dependency**: Add `loro-mirror` to `package.json`.
- **Schema**: Define a declarative `workspaceSchema` in `EditorState`.
- **Refactoring**: Replace manual `LoroMap`/`LoroList` manipulations in `EditorState` with `Mirror`'s `setState` and `subscribe`.
- **Integration**: Update components (FileTree, CodeViewer) to use the mirrored state.
- **Consistency**: Ensure `UndoManager` and `EphemeralStore` continue to work with the new setup.

## Impact
- Affected specs: `file-management`, `workspace-collaboration`.
- Affected code: `src/components/Editor/editorState.svelte.ts`, `src/components/Editor/CodeViewer.svelte`, `src/components/Editor/FileTree/index.svelte`.
