# local-storage Specification

## Purpose
TBD - created by archiving change migrate-to-bun-server. Update Purpose after archive.
## Requirements
### Requirement: SQLite primary datastore
The system SHALL store application data in a local `bun:sqlite` database.

#### Scenario: Persisting core data
- **WHEN** the app writes user, workspace, or session data
- **THEN** the data is stored in SQLite

### Requirement: Filesystem persistence
The system SHALL store snapshots and binary assets using `Bun.file` on local disk.

#### Scenario: Snapshot storage
- **WHEN** a workspace snapshot is persisted
- **THEN** it is written to the local filesystem via `Bun.file`

### Requirement: Remove external data services
The system SHALL NOT require external Postgres, Redis, or S3 services for primary operation.

#### Scenario: Startup without external services
- **WHEN** the app starts
- **THEN** it operates with local SQLite and filesystem persistence only

### Requirement: bunqueue for queues and rate limiting
The system SHALL use bunqueue for queue processing and rate limiting.

#### Scenario: Rate-limit check
- **WHEN** a request is rate-limited
- **THEN** the decision is enforced via bunqueue data

