# Design: Improved File Management and Multi-Viewer Support

## Architecture

### Centralized File Operations (`EditorState`)
We will move the core logic for file/folder operations from `FileTree` components to the `EditorState` class. This includes:
- `createFile(parentPath, name)`
- `createFolder(parentPath, name)`
- `renameItem(oldPath, newName)`
- `deleteItem(path)`
- `duplicateItem(path)`
- `uploadFiles(files, targetPath)`
- `downloadItem(path)` (Individual or ZIP)

This centralizes the Loro CRDT operations and engine synchronization, making it easier to maintain and test.

### Inline Creation and Renaming
We will leverage `@headless-tree/core`'s `renamingFeature`.
- When creating a new item, we will add a temporary "shadow" item to the tree or trigger a specialized "create mode" in `TreeItem.svelte`.
- The `TreeItem` will render an `<input>` for renaming/creation.
- `ESC` will cancel the operation, and `Enter` will commit it.

### File Upload (Drag & Drop)
The `FileTree` container will implement `ondragover` and `ondrop` handlers.
- On `ondragover`, we will detect if the mouse is over a directory and expand it after a short delay (similar to VS Code).
- On `ondrop`, we will read the dropped files. If they are directories, we will recursively traverse and upload them.

### Multi-Viewer System
A new `ViewerHost.svelte` component will replace the direct `Editor.svelte` usage in `+page.svelte`.

```typescript
// Viewer Registry
const viewers = [
  { id: 'markdown', component: MarkdownViewer, match: (path, item) => path.endsWith('.md') && item.type === 'file' },
  { id: 'image', component: ImageViewer, match: (path, item) => item.type === 'binary' && /\.(svg|png|jpg|jpeg|gif)$/i.test(path) },
  { id: 'code', component: CodeViewer, match: (path, item) => item.type === 'file' },
  { id: 'binary', component: BinaryViewer, match: (path, item) => item.type === 'binary' }
]
```

#### Binary Detection and Storage
We will implement a binary detection strategy during file upload.
- **Frontend**: Detect binary files (e.g., via extension or content sniffing).
- **Frontend**: Calculate SHA-256 hash.
- **Frontend**: Upload to `POST /api/files`.
- **CRDT**: Create an item with `type: "binary"`, `hash`, `size`, and `mimeType`.
- **Backend**: Store files in `data/files/[hash]` to allow deduplication.
- **Database**: Use the `workspace_files` table to track hashes (deduplication/garbage collection).

### ZIP Support
We will integrate `fflate` to handle the generation of ZIP files on the client side. `fflate` is preferred for its smaller footprint and high performance compared to `jszip`.

## Alternatives Considered
- **Server-side ZIP**: Rejected as it adds unnecessary load to the server and requires temporary storage for ZIP files.
- **Custom Tree Implementation**: Rejected as `@headless-tree/core` is already integrated and flexible enough for our needs.
