# Tasks: Add Pyodide Engine

- [x] Install `pyodide` npm package <!-- id: 0 -->
- [x] Update `EngineCapabilities` in `src/lib/engine/base.svelte.ts` to include `dependencyManagement` <!-- id: 1 -->
- [x] Update existing engines (`SkulptEngine`, `WebContainerEngine`) to include the new capability <!-- id: 2 -->
- [x] Create `src/lib/engine/pyodide/index.svelte.ts` structure <!-- id: 3 -->
- [x] Implement `prepare` method using `loadPyodide` from npm package <!-- id: 4 -->
- [x] Implement `initialize` method to set up the Pyodide instance and `micropip` <!-- id: 5 -->
- [x] Implement file system sync logic between `editorState` and Pyodide FS <!-- id: 6 -->
- [x] Implement `run` method with automatic package loading <!-- id: 7 -->
- [x] Implement `spawnTerminal` for output handling <!-- id: 8 -->
- [x] Integrate Pyodide engine into the engine selection UI/registry <!-- id: 9 -->
- [ ] Verify execution with a script importing `numpy` <!-- id: 10 -->
