## 1. Implementation
- [x] 1.1 Add an esbuild build step to bundle the chokidar-based watcher script.
- [x] 1.2 Inject the bundled .fswatcher.js during WebContainer initialization.
- [x] 1.3 Launch the watcher process and stream stdout to the client.
- [x] 1.4 Parse watcher stdout and integrate with the file tree refresh logic.
- [x] 1.5 Add ignore patterns and root path mapping for ./codelabs.
- [x] 1.6 Add lifecycle cleanup (stop watcher when workspace ends).
- [x] 1.7 Add basic validation: create/edit/delete/rename files and confirm events.
