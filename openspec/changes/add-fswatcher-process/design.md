## Context
We need reliable file change events beyond WebContainer’s limited watcher. The approach is to bundle a small Node watcher script (using chokidar) and run it inside the WebContainer as a background process for the workspace lifecycle. The watcher should be initialized immediately after the filesystem is populated so initial file state and subsequent changes are captured consistently.

## Goals / Non-Goals
- Goals:
  - Provide rich file event detection (add/change/unlink/rename/move) with minimal overhead.
  - Avoid reliance on undocumented WebContainer APIs.
  - Keep the watcher invisible to the user by placing it outside the visible workspace path.
- Non-Goals:
  - Replacing WebContainer entirely.
  - Persisting watcher artifacts in the user’s workspace.

## Decisions
- Decision: Use a bundled chokidar-based script executed via Node.
  - Why: Chokidar provides stable cross-platform file event semantics and is widely used.
- Decision: Bundle with esbuild into a single script and inject at container init.
  - Why: Avoid runtime install overhead and reduce filesystem churn.
- Decision: Move the watcher file out of user-visible paths before execution.
  - Why: Keep the workspace clean and reduce user confusion.

## Risks / Trade-offs
- Risk: Long-running watcher process may increase CPU/memory usage on large workspaces.
  - Mitigation: Configure ignore patterns and debounce; keep payload minimal.
- Risk: Node-based watcher might not capture events during very early FS initialization.
  - Mitigation: Start watcher after initial file population and emit an explicit ready event.

## Migration Plan
1. Add bundled watcher build step.
2. Initialize watcher during container setup and parse stdout in the client.
3. Observe performance and adjust ignore rules/format if needed.

## Open Questions
- Exact stdout event schema (JSON vs line-delimited compact strings).
- Confirm default ignore patterns and root path mapping for "./codelabs".
