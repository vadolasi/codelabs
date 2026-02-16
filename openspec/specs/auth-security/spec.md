# auth-security Specification

## Purpose
TBD - created by archiving change migrate-to-bun-server. Update Purpose after archive.
## Requirements
### Requirement: Argon2 password hashing
The system SHALL use Argon2 for password hashing.

#### Scenario: User password update
- **WHEN** a user registers or updates a password
- **THEN** the password is hashed with Argon2 before storage

### Requirement: SQLite-backed sessions
The system SHALL store session data in the primary SQLite database.

#### Scenario: Session persistence
- **WHEN** a session is created or refreshed
- **THEN** it is stored and queried from SQLite

