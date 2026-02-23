# Design: `loro-mirror` State Management

## Context
The project uses `loro-crdt` for real-time collaboration. The current `EditorState` class manually synchronizes Loro containers (`LoroMap`, `LoroList`, `LoroText`) with Svelte 5 runes (`$state`, `$derived`). This leads to complex and error-prone code for operations like renaming, moving, and deleting items.

## Goals
- Simplify state management using `loro-mirror`.
- Provide a type-safe and declarative way to define the workspace structure.
- Reduce boilerplate code in `EditorState`.
- Maintain full compatibility with `UndoManager` and `EphemeralStore`.

## Decisions

### 1. Workspace Schema
We will define a `workspaceSchema` that represents the entire file system structure.

```typescript
import { schema } from "loro-mirror";

export type WorkspaceItemData = {
  type: "file" | "directory" | "binary";
  path: string;
  content?: string;
  hash?: string;
  size?: number;
  mimeType?: string;
};

const itemSchema = schema.LoroMap({
  data: schema.Map<WorkspaceItemData>(),
  children: schema.LoroMovableList(schema.String()),
  editableContent: schema.LoroText(),
});

export const workspaceSchema = schema({
  files: schema.LoroMap(itemSchema),
});
```

### 2. Integration with Svelte 5
`loro-mirror` produces an immutable state on each update. We will keep this state in a Svelte `$state` rune and update it via `store.subscribe`.

```typescript
class EditorState {
  private mirror: Mirror<typeof workspaceSchema>;
  public state = $state<MirrorState<typeof workspaceSchema>>(null);

  constructor() {
    this.mirror = new Mirror({
      doc: this.loroDoc,
      schema: workspaceSchema,
      initialState: { files: {} },
    });

    this.mirror.subscribe((state) => {
      this.state = state;
    });
  }
}
```

### 3. File Operations
Instead of manual Loro calls, we will use `mirror.setState`, which allows using a draft-style mutation (via `immer` internally) or returning a new state.

### 4. CodeMirror Integration
`loro-codemirror` requires a `LoroText` container. `loro-mirror` provides access to the underlying Loro containers. We can retrieve the `LoroText` instance from the `Mirror` instance using its path.

## Risks / Trade-offs
- **Performance**: `loro-mirror` uses diffing to translate `setState` to CRDT operations. For very large state trees, this might have a cost, but it's comparable to React's rendering and should be fine for our file system tree (usually <1000 items).
- **Migration**: Existing data in the `LoroDoc` must be compatible with the new schema. Since we are matching the existing Loro structure, it should be seamless.

## Open Questions
- Does `loro-mirror` handle `LoroMovableList` with stable IDs as expected for our file tree?
- How to best handle `UndoManager` when `Mirror` is also performing operations? (According to the blog post, they work well together).
