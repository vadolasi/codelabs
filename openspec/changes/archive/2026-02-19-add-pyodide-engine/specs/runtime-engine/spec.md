# Spec Delta: Pyodide Support

## ADDED Requirements

### Requirement: Support Pyodide engine
The system MUST provide Pyodide as a runtime engine option for Python files.

#### Scenario: Running a Python script with Pyodide
1. **Given** the user has a `.py` file open.
2. **And** the user selects "Pyodide" as the runtime engine.
3. **When** the user clicks "Run".
4. **Then** the system MUST load Pyodide using the `pyodide` npm package.
5. **And** the system MUST execute the code using Pyodide.
6. **And** the output MUST be displayed in the terminal.

### Requirement: Engine Dependency Management Capability
The `EngineCapabilities` interface MUST include a `dependencyManagement` field to indicate if an engine supports external package installation.

#### Scenario: Checking for dependency management support
1. **Given** an engine instance.
2. **When** checking its `capabilities`.
3. **Then** it MUST have a `dependencyManagement` boolean field.

### Requirement: Pyodide Package Management
The Pyodide engine SHALL support installing packages via `micropip` when the `dependencyManagement` capability is enabled.

#### Scenario: Importing a standard package
1. **Given** a Python script that imports `numpy`.
2. **When** the script is run with Pyodide.
3. **Then** Pyodide SHALL automatically attempt to load the package using `micropip` if it is not already present.
