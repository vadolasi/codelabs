## 1. Implementation
- [x] 1.1 Define `EngineCapabilities` and the generic engine API surface (types + minimal runtime events)
- [x] 1.2 Refactor `src/lib/engine/webcontainer/index.ts` to implement the generic engine API
- [x] 1.3 Make fs-watcher start/stop conditional on engine capabilities
- [x] 1.4 Update the Editor UI to hide/disable terminal and preview when unsupported
- [x] 1.5 Add/adjust tests or lightweight runtime checks for capability-driven behavior
- [x] 1.6 Add `engine` property to `workspaces` table in schema

## 2. Verification
- [x] 2.1 Typecheck/build succeeds
- [x] 2.2 Manual smoke: workspace loads; files mount; fs-watcher sync still works (when supported)
- [x] 2.3 Manual smoke: terminal works on WebContainer engine; terminal UI degrades on non-terminal engines
- [x] 2.4 Manual smoke: preview panel updates on WebContainer engine; preview UI degrades on non-preview engines
