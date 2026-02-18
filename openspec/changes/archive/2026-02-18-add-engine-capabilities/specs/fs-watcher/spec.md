## MODIFIED Requirements

### Requirement: Bundled filesystem watcher process
When using the WebContainer engine, the system SHALL bundle a chokidar-based watcher script and run it inside the WebContainer as a long-lived process for the workspace lifecycle.

#### Scenario: Watcher starts after filesystem initialization
- **WHEN** the WebContainer finishes populating the workspace filesystem
- **THEN** the watcher process starts and remains active until the workspace ends

### Requirement: Watcher event stream over stdout
The watcher process SHALL emit file events to stdout in a minimal, performance-focused format suitable for parsing in the client.

#### Scenario: File change emits a single event line
- **WHEN** a file is added, changed, removed, or renamed under ./codelabs
- **THEN** the watcher outputs a single event line describing the change

### Requirement: Hidden watcher file placement
The system SHALL move the bundled watcher script out of the user-visible workspace path before execution.

#### Scenario: Watcher script is not visible in the workspace tree
- **WHEN** the watcher process starts
- **THEN** the watcher script is not visible in the user’s workspace file tree

### Requirement: Root scope and ignore patterns
The watcher SHALL observe ./codelabs and ignore known noisy paths to reduce overhead.

#### Scenario: Ignored paths do not emit events
- **WHEN** files change under ignored paths (e.g., node_modules or .git)
- **THEN** no watcher events are emitted for those changes
