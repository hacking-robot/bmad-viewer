# Implementation Plan: Multi-Sprint Wizard Steps

## Overview

Extend the Project Wizard to support custom BMM modules that produce alternative output artifacts (sharded epic files, sprint folder with individual sprint YAML files). The implementation adds alternative output fields to `WizardStep`, a pure `adaptWizardSteps` function, extended `checkStepOutput` logic, and a shared `checkRequiredArtifacts` function to replace duplicated validation in `handleFinishSetup` and `handleCancel`.

## Tasks

- [x] 1. Extend WizardStep type with alternative output fields
  - [x] 1.1 Add `altOutputFile`, `altOutputFilePrefix`, `altOutputDir`, and `altOutputDirPrefix` optional fields to the `WizardStep` interface in `src/types/projectWizard.ts`
    - These fields specify fallback output locations checked when the primary `outputFile`/`outputFilePrefix`/`outputDir`+`outputDirPrefix` is not found
    - _Requirements: 2.2, 3.1_

- [x] 2. Create `adaptWizardSteps` function
  - [x] 2.1 Implement `adaptWizardSteps(steps, scanResult, customContentPaths)` in `src/data/wizardSteps.ts`
    - Pure function that returns steps unchanged when `customContentPaths` is empty/undefined
    - When `customContentPaths` is non-empty: adds `altOutputFilePrefix: 'epic-'` to the `create-epics-and-stories` step, and adds `altOutputDir: 'sprints'` + `altOutputDirPrefix: 'sprint-'` to the `sprint-planning` step
    - Does not modify steps that aren't epic or sprint steps
    - Export the function for use in `ProjectWizard.tsx` and tests
    - _Requirements: 1.1, 2.2, 3.1, 5.3_

  - [x] 2.2 Write unit tests for `adaptWizardSteps` in `src/data/adaptWizardSteps.test.ts`
    - Test: returns steps unchanged when `customContentPaths` is empty or undefined
    - Test: adds `altOutputFilePrefix` to epic step when custom paths present
    - Test: adds `altOutputDir` and `altOutputDirPrefix` to sprint step when custom paths present
    - Test: does not modify non-epic/non-sprint steps
    - _Requirements: 1.1, 2.2, 3.1_

  - [x] 2.3 Write property test for `adaptWizardSteps` idempotency in `src/data/adaptWizardSteps.pbt.test.ts`
    - **Property 8: Step adaptation is idempotent**
    - Generate random wizard step arrays, scan results, and custom content path arrays. Verify `adaptWizardSteps(adaptWizardSteps(steps, scan, paths), scan, paths)` equals `adaptWizardSteps(steps, scan, paths)`
    - **Validates: Requirements 5.3**

  - [x] 2.4 Write property test for custom module detection in `src/data/adaptWizardSteps.pbt.test.ts`
    - **Property 1: Custom module detection from customContentPaths**
    - Generate random arrays of file paths (including empty). Verify `adaptWizardSteps` adds alt fields to epic/sprint steps iff the array is non-empty
    - **Validates: Requirements 1.1**

- [x] 3. Extend `checkStepOutput` to check alternative output locations
  - [x] 3.1 Modify `checkStepOutput` in `src/components/ProjectWizard/ProjectWizard.tsx` to check `altOutputFilePrefix` and `altOutputDir`+`altOutputDirPrefix` when primary output is not found
    - After existing primary checks return `{ exists: false }`, check `step.altOutputFile` in search dirs
    - Then check `step.altOutputFilePrefix` via `checkDirHasPrefix` in search dirs
    - Then check `step.altOutputDir` + `step.altOutputDirPrefix` via `checkDirHasPrefix(joinPath(dir, step.altOutputDir), step.altOutputDirPrefix)` in search dirs
    - Only return `{ exists: false }` if all primary and alternative checks fail
    - _Requirements: 2.2, 2.3, 3.1, 3.2_

  - [x] 3.2 Write property test for epic artifact detection in `src/components/ProjectWizard/checkStepOutput.pbt.test.ts`
    - **Property 3: Epic artifact detection accepts both formats**
    - Generate random file system states (presence/absence of `epics.md` and `epic-*.md` files). Verify `checkStepOutput` returns `exists: true` iff at least one format is present
    - **Validates: Requirements 2.2, 2.3, 4.4**

  - [x] 3.3 Write property test for sprint artifact detection in `src/components/ProjectWizard/checkStepOutput.pbt.test.ts`
    - **Property 4: Sprint artifact detection accepts both formats**
    - Generate random file system states (presence/absence of `sprint-status.yaml` and `sprints/sprint-*.yaml` files). Verify `checkStepOutput` returns `exists: true` iff at least one format is present
    - **Validates: Requirements 3.1, 3.2, 4.1, 4.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extract shared `checkRequiredArtifacts` function and update finish/cancel handlers
  - [x] 5.1 Create `checkRequiredArtifacts` function in `src/components/ProjectWizard/ProjectWizard.tsx`
    - Accepts `projectPath`, `outputFolder`, and `steps` (adapted `WizardStep[]`)
    - Finds the epic step (`id === 'create-epics-and-stories'`) and sprint step (`id === 'sprint-planning'`) from the steps array
    - Calls `checkStepOutput` for each and collects missing artifact names
    - Returns `string[]` of missing artifact descriptions
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Replace duplicated artifact checks in `handleFinishSetup` with a call to `checkRequiredArtifacts(projectPath, outputFolder, ACTIVE_STEPS)`
    - Remove the inline epic/sprint checking block
    - Use the returned missing array to show the error or proceed
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 5.3 Replace duplicated artifact checks in `handleCancel` with a call to `checkRequiredArtifacts(projectPath, outputFolder, ACTIVE_STEPS)`
    - Remove the inline epic/sprint checking block
    - Use `missing.length === 0` to determine if project is set up
    - _Requirements: 4.3_

  - [x] 5.4 Write property test for finish validation consistency in `src/components/ProjectWizard/checkRequiredArtifacts.pbt.test.ts`
    - **Property 5: Finish validation uses same detection as step completion**
    - Generate random adapted step sets and file system states. Verify `checkRequiredArtifacts` missing list matches the set of steps where `checkStepOutput` returns `exists: false`
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 6. Update `ACTIVE_STEPS` memo to call `adaptWizardSteps`
  - [x] 6.1 Modify the `ACTIVE_STEPS` useMemo in `ProjectWizard.tsx` to call `adaptWizardSteps(base, bmadScanResult, projectWizard.customContentPaths)` after `getWizardSteps`
    - Import `adaptWizardSteps` from `../../data/wizardSteps`
    - Add `bmadScanResult` and `projectWizard.customContentPaths` to the memo dependency array
    - _Requirements: 1.1, 1.2, 5.1, 5.3, 6.3_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire state persistence and round-trip validation
  - [x] 8.1 Write property test for wizard state round-trip in `src/components/ProjectWizard/wizardStateRoundTrip.pbt.test.ts`
    - **Property 6: Wizard state round-trip preserves custom module info**
    - Generate random `ProjectWizardState` objects with varying `customContentPaths`. Serialize via JSON (matching `saveState`/`loadState` format) and deserialize, verify `customContentPaths` equality
    - **Validates: Requirements 1.3, 6.2, 6.3**

  - [x] 8.2 Write property test for recent project entry preservation in `src/components/ProjectWizard/recentProjectPaths.pbt.test.ts`
    - **Property 7: Custom content paths preserved in recent project entry**
    - Generate random project configurations with custom paths. Verify the `RecentProject` entry produced by `handleFinishSetup` contains the same `customContentPaths`
    - **Validates: Requirements 6.1, 6.4**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript/React — all code examples and tests use this stack
- Test files follow existing project conventions: `*.test.ts` for unit tests, `*.pbt.test.ts` for property-based tests using `fast-check`
