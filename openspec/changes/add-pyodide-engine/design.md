# Design: Pyodide Engine Integration

## Architecture
The `PyodideEngine` will reside in `src/lib/engine/pyodide/index.svelte.ts`. It will follow the same pattern as `SkulptEngine`, extending `BaseEngine`.

### Loading Strategy
Pyodide will be installed as a project dependency (`pyodide` npm package). We will use `loadPyodide` from the package. This ensures better version control and offline support (if bundled correctly).

### Dependency Management
A new capability `dependencyManagement` will be added to `EngineCapabilities`. This will allow engines to signal if they support installing external packages. For Pyodide, this will be implemented using `micropip`.

### File System Sync
Pyodide provides a virtual file system (MEMFS). We will sync our project files from `editorState.filesMap` to Pyodide's FS before execution.

### Worker vs Main Thread
Initially, Pyodide will run on the main thread for simplicity, matching the current Skulpt implementation.

## Alternatives Considered
- **CDN**: Rejected in favor of npm package for better reliability and integration.
- **Web Worker**: Future optimization.
