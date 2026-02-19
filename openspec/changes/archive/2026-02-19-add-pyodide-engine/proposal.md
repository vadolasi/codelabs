# Proposal: Add Pyodide (Python) Engine

## Overview
Add support for the Pyodide engine as a runtime option for executing Python code. Pyodide provides a more complete CPython environment compared to Skulpt, supporting standard library and third-party packages.

## User Value
- Full CPython 3.11+ compatibility.
- Ability to use packages like `numpy`, `pandas`, `matplotlib` (via Pyodide's package manager).
- Improved execution speed and reliability for complex Python scripts.

## Scope
- Implementation of `PyodideEngine` extending `BaseEngine`.
- Integration with the project's file system (`editorState.filesMap`).
- Dynamic loading of Pyodide from CDN.
- Basic terminal integration for stdout/stderr and input.
- Package management support (micropip).
