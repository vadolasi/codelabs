# project-structure Specification

## Purpose
TBD - created by archiving change migrate-to-bun-server. Update Purpose after archive.
## Requirements
### Requirement: Single-package repository
The system SHALL operate as a single application package rather than a monorepo.

#### Scenario: Repository layout
- **WHEN** the project is set up
- **THEN** web and realtime code live in a single package

### Requirement: Bun package management
The system SHALL use Bun as the package manager.

#### Scenario: Dependency installation
- **WHEN** dependencies are installed
- **THEN** `bun install` is used as the primary workflow

