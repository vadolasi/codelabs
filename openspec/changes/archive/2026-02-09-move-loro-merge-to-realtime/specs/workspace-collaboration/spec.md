## ADDED Requirements

### Requirement: Realtime-owned persistence merge
The system SHALL perform snapshot + update merging in the realtime service instead of the web backend.

#### Scenario: Snapshot refresh in realtime
- **WHEN** realtime loads a workspace with a stored snapshot and pending updates
- **THEN** it imports the snapshot and updates
- **AND** it exports a refreshed snapshot for storage

### Requirement: Update queue pruning after merge
The system SHALL prune only updates that have been successfully applied to a refreshed snapshot.

#### Scenario: Safe trimming
- **WHEN** realtime persists a refreshed snapshot
- **THEN** it trims the corresponding applied updates from the queue
- **AND** it leaves unapplied updates intact

### Requirement: Client bootstrap from raw persistence data
The system SHALL allow clients to bootstrap by importing the stored snapshot and pending updates without requiring server-side merging.

#### Scenario: Client bootstrap with snapshot + updates
- **WHEN** the client receives snapshot data and pending updates
- **THEN** it imports the snapshot first
- **AND** it imports all pending updates
- **AND** the document state matches the latest known version

### Requirement: Active-only snapshot scheduling
The system SHALL run periodic snapshot refresh only when a workspace is active.

#### Scenario: Periodic snapshot while active
- **WHEN** a workspace is active
- **AND** the snapshot interval (1 minute) elapses
- **THEN** realtime refreshes the snapshot from stored updates

### Requirement: Stop scheduling on inactivity
The system SHALL stop periodic snapshot refresh when a workspace becomes inactive.

#### Scenario: Transition to inactive
- **WHEN** a workspace transitions from active to inactive
- **THEN** realtime removes any scheduled trigger for that workspace

### Requirement: bunqueue scheduling
The system SHALL use bunqueue to manage periodic snapshot jobs.

#### Scenario: Job execution
- **WHEN** a periodic snapshot job is due
- **THEN** bunqueue triggers the realtime merge routine

### Requirement: Workspace activity status
The system SHALL track workspace activity to determine active vs inactive status.

#### Scenario: Activity tracking
- **WHEN** a client connects or disconnects
- **THEN** the workspace activity status is updated
