# Implementation Plan: Multi-Sprint Support

## Overview

Add multi-sprint awareness to BMad Studio. Projects using `bmad-true-agile` organize work into individual sprint YAML files in a `sprints/` subfolder. The implementation adds sprint detection, parsing, a sprint switcher UI, sprint info panel, combined filtering with epics, and sprint state persistence.

## Tasks

- [x] 1. Add sprint types and project types helper
  - [x] 1.1 Add sprint-related type definitions to `src/types/index.ts`
    - Add `SprintData`, `SprintTeamMember`, `SprintStory`, `SprintMetrics` interfaces
    - Add `VelocityLog`, `VelocityEntry` interfaces
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 1.2 Add `getSprintsFullPath` helper to `src/utils/projectTypes.ts`
    - Return `{projectPath}/{outputFolder}/implementation-artifacts/sprints/`
    - _Requirements: 1.1_

- [x] 2. Implement sprint file parser (`src/utils/parseSprint.ts`)
  - [x] 2.1 Implement `parseSprint(yamlContent: string): SprintData`
    - Handle nested date format (`dates.start`, `dates.target_end`, `dates.actual_end`)
    - Handle legacy flat date format (`start_date`, `target_end`, `actual_end`)
    - Extract sprint_number, status, team, planned_stories, metrics, carryover
    - Normalize story statuses via existing `normalizeStatus`
    - Skip files with missing required fields (sprint_number, planned_stories) with warning
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 2.2 Implement `parseVelocityLog(yamlContent: string): VelocityLog`
    - Parse per-sprint velocity entries, rolling averages, trend, and recommendations
    - Return null-safe defaults for missing sections
    - _Requirements: 2.5_

  - [x] 2.3 Implement `buildDevelopmentStatusFromSprints(sprints: SprintData[]): Record<string, StoryStatus>`
    - Build the same status map format that `parseSprintStatus` returns
    - For stories in multiple sprints (carryover), use the status from the highest-numbered sprint
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.4 Implement `getDefaultSprintNumber(sprints: SprintData[]): number | null`
    - Return active sprint's number if one exists
    - Fall back to highest sprint number if no active sprint
    - Return null if sprints array is empty
    - _Requirements: 3.7, 3.8_

  - [x] 2.5 Write property test: Sprint file round-trip parsing (Property 2)
    - **Property 2: Sprint file round-trip parsing**
    - Generate random SprintData, serialize to YAML (both nested and flat date formats), parse with `parseSprint`, assert equivalence
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.7**

  - [x] 2.6 Write property test: Velocity log round-trip parsing (Property 3)
    - **Property 3: Velocity log round-trip parsing**
    - Generate random VelocityLog, serialize to YAML, parse with `parseVelocityLog`, assert equivalence
    - **Validates: Requirements 2.5**

  - [x] 2.7 Write property test: Sprint story status normalization (Property 4)
    - **Property 4: Sprint story status normalization**
    - Generate random status strings, verify parsed status is always a valid canonical StoryStatus
    - **Validates: Requirements 2.4, 5.4**

  - [x] 2.8 Write property test: Story status resolution from sprints (Property 11)
    - **Property 11: Story status resolution from sprints**
    - Generate random multi-sprint scenarios with carryover, verify most-recent-sprint resolution
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 2.9 Write property test: Default sprint selection (Property 7)
    - **Property 7: Default sprint selection**
    - Generate random sprint arrays, verify active sprint or max number is selected
    - **Validates: Requirements 3.7, 3.8**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend the Zustand store with sprint state
  - [x] 4.1 Add sprint state fields and setters to `src/store.ts`
    - Add `sprints: SprintData[]`, `velocityLog: VelocityLog | null`, `selectedSprintNumber: number | null`, `isMultiSprint: boolean`
    - Add `selectedSprintByProject: Record<string, number | null>` (persisted per-project)
    - Add setters: `setSprints`, `setVelocityLog`, `setSelectedSprintNumber`, `setIsMultiSprint`
    - `setSelectedSprintNumber` should also update `selectedSprintByProject` for the current project
    - Add sprint fields to persistence whitelist in `electronStorage.setItem`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Write property test: Sprint selection persistence round-trip (Property 14)
    - **Property 14: Sprint selection persistence round-trip**
    - Generate random project paths and sprint numbers, verify round-trip through `selectedSprintByProject`
    - **Validates: Requirements 7.1, 7.3, 7.4**

- [x] 5. Update data loading for multi-sprint detection
  - [x] 5.1 Modify `loadProjectData()` in `src/hooks/useProjectData.ts`
    - After determining project type, check for sprints folder via `reader.listDirectory`
    - If sprints folder exists with `sprint-*.yaml` files: read all sprint files, parse with `parseSprint`, build status map with `buildDevelopmentStatusFromSprints`, set `isMultiSprint: true`
    - If sprints folder has `velocity-log.yaml`: parse with `parseVelocityLog`, set in store
    - If sprints folder missing or empty: use existing `sprint-status.yaml` path, set `isMultiSprint: false`
    - Restore persisted sprint selection from `selectedSprintByProject` for the current project; fall back via `getDefaultSprintNumber` if stale
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.3, 7.5_

  - [x] 5.2 Extend file watcher in `useProjectDataEffects` to cover sprints folder
    - When `isMultiSprint` is true, include the sprints folder path in the watcher
    - On sprint file changes, reload sprint data and preserve current sprint selection
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.3 Write property test: Multi-sprint detection correctness (Property 1)
    - **Property 1: Multi-sprint detection correctness**
    - Verify `isMultiSprint` is true iff sprints folder exists with at least one `sprint-*.yaml` file
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement SprintSwitcher component
  - [x] 7.1 Create `src/components/SprintSwitcher/SprintSwitcher.tsx`
    - Render a dropdown button similar to EpicFilter style
    - List sprints in descending order by sprintNumber
    - Show sprint number, status badge (active/completed/planned), and date range per entry
    - Include "All Sprints" option at top
    - On selection, call `setSelectedSprintNumber`
    - Only render when `isMultiSprint` is true
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 7.2 Create `src/components/SprintSwitcher/index.ts` barrel export
    - _Requirements: 3.1_

  - [x] 7.3 Write property test: Sprint switcher ordering (Property 5)
    - **Property 5: Sprint switcher ordering and display**
    - Generate random sprint arrays, verify descending order by sprintNumber
    - **Validates: Requirements 3.3, 3.4**

- [x] 8. Implement SprintInfoPanel component
  - [x] 8.1 Create `src/components/SprintInfoPanel/SprintInfoPanel.tsx`
    - Render as a Popover triggered from an info icon next to the sprint switcher
    - Display sprint number, status, start date, target end date, actual end date
    - Display team members
    - Display metrics: total points, completed points, story counts
    - Display stories grouped by epic with point totals
    - When `velocityLog` is available: show last-3, last-5, all-time averages, trend, and capacity recommendations
    - When `velocityLog` is null: show sprint metrics without velocity section
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 8.2 Create `src/components/SprintInfoPanel/index.ts` barrel export
    - _Requirements: 6.1_

- [x] 9. Integrate sprint filtering into Board and Header
  - [x] 9.1 Add sprint-based story filtering to `src/components/Board/Board.tsx`
    - Read `selectedSprintNumber` and `sprints` from store
    - When a sprint is selected, filter stories to only those whose keys appear in the selected sprint's `plannedStories` or `carryover`
    - Compose with existing epic and search filters (intersection)
    - When "All Sprints" is selected (null), skip sprint filtering
    - _Requirements: 3.6, 4.1, 4.2, 4.3_

  - [x] 9.2 Update `src/components/EpicFilter/EpicFilter.tsx` progress bars
    - Progress bar calculations should use stories filtered by the current sprint selection, not all stories
    - Read `selectedSprintNumber` and `sprints` from store to determine visible stories
    - _Requirements: 4.4_

  - [x] 9.3 Add SprintSwitcher to `src/components/Header/Header.tsx`
    - Import and render `SprintSwitcher` next to `EpicFilter` in the bottom toolbar
    - Render `SprintInfoPanel` alongside it
    - Only show when `isMultiSprint` is true
    - _Requirements: 3.1, 3.2, 6.1_

  - [x] 9.4 Write property test: Sprint story filtering (Property 6)
    - **Property 6: Sprint story filtering**
    - Generate random stories and sprint assignments, verify filtering correctness
    - **Validates: Requirements 3.6**

  - [x] 9.5 Write property test: Combined sprint and epic filtering is intersection (Property 8)
    - **Property 8: Combined filtering is intersection**
    - Generate random stories with sprint and epic assignments, verify intersection
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 9.6 Write property test: Epic progress respects sprint filter (Property 9)
    - **Property 9: Epic progress respects sprint filter**
    - Generate random stories across sprints/epics, verify progress calculation
    - **Validates: Requirements 4.4**

  - [x] 9.7 Write property test: Sprint selection preserves epic filter (Property 10)
    - **Property 10: Sprint selection preserves epic filter**
    - Generate random state transitions, verify epicId unchanged after sprint change
    - **Validates: Requirements 4.5**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `parseSprintStatus` and `parseEpicsUnified` pipelines remain unchanged; sprint data feeds into the same `developmentStatus` map format
