# Requirements Document

## Introduction

BMad Studio currently supports standard BMAD projects that track story statuses via a single flat `sprint-status.yaml` file. Projects using the `bmad-true-agile` module organize work into multiple sprints, each with its own YAML file (`sprint-N.yaml`) and a `velocity-log.yaml` for tracking velocity across sprints. This feature adds multi-sprint awareness to BMad Studio so users can view, filter, and analyze sprint data alongside the existing epic-based board.

## Glossary

- **App**: The BMad Studio Electron application
- **Board**: The Kanban board view displaying story cards organized by status columns
- **Sprint_File**: An individual sprint YAML file (`sprint-N.yaml`) located in `{outputFolder}/implementation-artifacts/sprints/`
- **Velocity_Log**: The `velocity-log.yaml` file in the sprints folder containing per-sprint velocity data and rolling averages
- **Sprints_Folder**: The `{outputFolder}/implementation-artifacts/sprints/` directory containing Sprint_Files and the Velocity_Log
- **Standard_Project**: A BMAD project without a Sprints_Folder, using a single `sprint-status.yaml` for all story statuses
- **Multi_Sprint_Project**: A BMAD project with a Sprints_Folder, using individual Sprint_Files for story statuses per sprint
- **Sprint_Switcher**: A dropdown UI control that allows the user to select which sprint's stories to display on the Board
- **Epic_Filter**: The existing dropdown UI control that filters Board stories by epic
- **Sprint_Parser**: The module responsible for reading and parsing Sprint_Files and the Velocity_Log
- **Sprint_Info_Panel**: A UI panel displaying sprint metadata, metrics, and velocity information
- **Store**: The Zustand state management store used by the App

## Requirements

### Requirement 1: Multi-Sprint Project Detection

**User Story:** As a user, I want the App to automatically detect whether my project uses multi-sprint structure, so that the appropriate UI and data loading logic is activated without manual configuration.

#### Acceptance Criteria

1. WHEN a project is opened, THE App SHALL check for the existence of the Sprints_Folder at `{outputFolder}/implementation-artifacts/sprints/`
2. WHEN the Sprints_Folder exists and contains at least one Sprint_File, THE App SHALL classify the project as a Multi_Sprint_Project
3. WHEN the Sprints_Folder does not exist, THE App SHALL classify the project as a Standard_Project
4. WHEN a project is classified as a Standard_Project, THE App SHALL load story statuses from `sprint-status.yaml` using the existing parser
5. WHEN a project is classified as a Multi_Sprint_Project, THE App SHALL load story statuses from the Sprint_Files using the Sprint_Parser

### Requirement 2: Sprint File Parsing

**User Story:** As a user, I want the App to correctly parse sprint YAML files in both legacy and current formats, so that all sprint data is available regardless of file format variations.

#### Acceptance Criteria

1. THE Sprint_Parser SHALL parse Sprint_Files containing nested date fields (`dates.start`, `dates.target_end`, `dates.actual_end`)
2. THE Sprint_Parser SHALL parse Sprint_Files containing flat date fields (`start_date`, `target_end`, `actual_end`)
3. THE Sprint_Parser SHALL extract `sprint_number`, `status`, team members, `planned_stories`, `metrics`, and `carryover` from each Sprint_File
4. THE Sprint_Parser SHALL normalize story statuses from Sprint_Files using the existing `normalizeStatus` function
5. THE Sprint_Parser SHALL parse the Velocity_Log extracting per-sprint velocity entries, rolling averages, trend, and recommendations
6. IF a Sprint_File contains malformed YAML, THEN THE Sprint_Parser SHALL return a descriptive error identifying the file
7. FOR ALL valid Sprint_File objects, parsing then serializing then parsing SHALL produce an equivalent object (round-trip property)

### Requirement 3: Sprint Switcher UI

**User Story:** As a user, I want a sprint switcher dropdown in the board toolbar, so that I can select which sprint's stories to view on the Board.

#### Acceptance Criteria

1. WHEN a Multi_Sprint_Project is loaded, THE App SHALL display the Sprint_Switcher in the Board toolbar alongside the Epic_Filter
2. WHEN a Standard_Project is loaded, THE App SHALL hide the Sprint_Switcher
3. THE Sprint_Switcher SHALL list all available sprints ordered by sprint number descending (most recent first)
4. THE Sprint_Switcher SHALL display each sprint's number, status (active/completed), and date range
5. THE Sprint_Switcher SHALL include an "All Sprints" option that shows stories from all sprints combined
6. WHEN the user selects a sprint, THE Board SHALL display only stories belonging to the selected sprint
7. WHEN a Multi_Sprint_Project is first loaded, THE Sprint_Switcher SHALL default to the active sprint (status = "active")
8. IF no active sprint exists, THEN THE Sprint_Switcher SHALL default to the sprint with the highest sprint number

### Requirement 4: Combined Sprint and Epic Filtering

**User Story:** As a user, I want to filter stories by both sprint and epic simultaneously, so that I can focus on a specific subset of work.

#### Acceptance Criteria

1. WHEN both a sprint and an epic are selected, THE Board SHALL display only stories that belong to both the selected sprint and the selected epic
2. WHEN a sprint is selected and no epic filter is active, THE Board SHALL display all stories from the selected sprint
3. WHEN an epic is selected and "All Sprints" is active, THE Board SHALL display all stories from the selected epic across all sprints
4. THE Epic_Filter SHALL update its progress bars to reflect only the stories visible under the current sprint selection
5. WHEN the sprint selection changes, THE Board SHALL preserve the current epic filter selection

### Requirement 5: Sprint Story Status Resolution

**User Story:** As a user, I want story statuses on the Board to reflect the status recorded in the sprint file, so that the Board accurately represents sprint progress.

#### Acceptance Criteria

1. WHEN a Multi_Sprint_Project is loaded, THE App SHALL derive each story's status from the `planned_stories` entries in the Sprint_Files
2. WHEN a story appears in multiple Sprint_Files (carryover), THE App SHALL use the status from the most recent sprint containing the story
3. WHEN a story exists in epics but not in any Sprint_File, THE App SHALL assign the story a status of "backlog"
4. THE App SHALL map Sprint_File story statuses (`planned`, `in-progress`, `done`) to canonical Board statuses using the existing `normalizeStatus` function

### Requirement 6: Sprint Info Panel

**User Story:** As a user, I want to view detailed sprint information including metrics and velocity data, so that I can track sprint progress and team performance.

#### Acceptance Criteria

1. WHEN a sprint is selected in the Sprint_Switcher, THE App SHALL provide access to the Sprint_Info_Panel for that sprint
2. THE Sprint_Info_Panel SHALL display the sprint number, status, start date, target end date, and actual end date
3. THE Sprint_Info_Panel SHALL display team members assigned to the sprint
4. THE Sprint_Info_Panel SHALL display sprint metrics: total points, completed points, and story counts
5. THE Sprint_Info_Panel SHALL display stories grouped by epic with point totals per epic
6. WHEN the Velocity_Log is available, THE Sprint_Info_Panel SHALL display velocity data: last 3 sprint average, last 5 sprint average, all-time average, and trend direction
7. WHEN the Velocity_Log is available, THE Sprint_Info_Panel SHALL display capacity recommendations (conservative, standard, aggressive)
8. IF the Velocity_Log is missing or malformed, THEN THE Sprint_Info_Panel SHALL display sprint-level metrics without velocity data

### Requirement 7: Sprint State Management

**User Story:** As a user, I want my sprint selection to be remembered when switching between views and projects, so that I do not lose context.

#### Acceptance Criteria

1. THE Store SHALL persist the selected sprint number for each project
2. WHEN the user switches from Board view to Dashboard view and back, THE App SHALL restore the previously selected sprint
3. WHEN the user switches to a different project and returns, THE App SHALL restore the previously selected sprint for that project
4. WHEN sprint data is reloaded (file watcher trigger or manual refresh), THE App SHALL preserve the current sprint selection
5. IF the previously selected sprint no longer exists after reload, THEN THE App SHALL fall back to the active sprint or the highest-numbered sprint

### Requirement 8: File Watcher Integration

**User Story:** As a user, I want the Board to update automatically when sprint files change on disk, so that I see the latest sprint data without manual refresh.

#### Acceptance Criteria

1. WHEN a Multi_Sprint_Project is loaded, THE App SHALL watch the Sprints_Folder for file changes
2. WHEN a Sprint_File is created, modified, or deleted, THE App SHALL reload sprint data and update the Board
3. WHEN the Velocity_Log is modified, THE App SHALL reload velocity data and update the Sprint_Info_Panel
4. THE App SHALL debounce file change events to avoid excessive reloads during rapid file updates

### Requirement 9: Backward Compatibility

**User Story:** As a user of a Standard_Project, I want the App to continue working exactly as before, so that the multi-sprint feature does not disrupt my existing workflow.

#### Acceptance Criteria

1. WHEN a Standard_Project is loaded, THE App SHALL load data using the existing `sprint-status.yaml` parser
2. WHEN a Standard_Project is loaded, THE App SHALL not display any sprint-related UI elements (Sprint_Switcher, Sprint_Info_Panel)
3. THE App SHALL not require any changes to Standard_Project file structures
4. WHEN a project transitions from Standard_Project to Multi_Sprint_Project (Sprints_Folder is added), THE App SHALL detect the change on next load and activate multi-sprint features
