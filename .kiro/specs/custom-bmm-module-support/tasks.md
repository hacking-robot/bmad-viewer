# Tasks

## Task 1: Update conflict validation logic in NewProjectForm

- [x] 1.1 Modify `checkCodeConflict` in `NewProjectForm.tsx` to return `string | null` instead of `boolean`, allowing custom modules whose code matches the primary type when no other custom module already replaces it
- [x] 1.2 Update `handleBrowseLocalModule` and `handleAddGithubModule` to use the new `checkCodeConflict` return value (error message string) instead of boolean
- [x] 1.3 Update the `useEffect` that removes conflicting custom modules on primary type change to retain custom modules whose code matches the new primary type (remove only add-on/reserved conflicts)

## Task 2: Update module list assembly in handleCreate

- [x] 2.1 Modify `handleCreate` in `NewProjectForm.tsx` to detect when a custom module replaces the primary type and exclude the primary code from `selectedModules`
- [x] 2.2 Ensure the replacing custom module's path is included in `customContentPaths` even if its code is in the `officialCodes` set

## Task 3: Add UI indicator for primary module replacement

- [x] 3.1 Add a "Replaces primary" chip or label next to custom modules in the list whose code matches the current primary type

## Task 4: Update InstallStep module chip display

- [x] 4.1 Update `InstallStep.tsx` chip display to show "Custom BMM" (or appropriate label) when the primary module has been replaced by a custom module

## Task 5: Write unit tests

- [x] 5.1 Write unit tests for the updated `checkCodeConflict` logic covering: primary match accepted, duplicate custom rejected, add-on conflict rejected, tools mode behavior
- [x] 5.2 Write unit tests for module list assembly: primary excluded when replaced, custom path included, no-replacement case unchanged
- [x] 5.3 Write unit tests for install command generation with and without primary replacement
- [x] 5.4 Write unit tests for primary type change cleanup: custom modules retained when matching new primary, removed when conflicting with add-ons

## Task 6: Write property-based tests

- [x] 6.1 [PBT] Property 1: Primary code match accepted by conflict validator — generate random primary types and custom module codes, verify acceptance when code matches primary
- [x] 6.2 [PBT] Property 2: Duplicate custom module rejection — generate random existing custom modules and new modules with overlapping identifiers, verify rejection
- [x] 6.3 [PBT] Property 3: Module list excludes replaced primary — generate random configs with replacement, verify primary excluded and custom path included
- [x] 6.4 [PBT] Property 4: Install command includes primary iff not replaced — generate random module configs, verify command correctness
- [x] 6.5 [PBT] Property 5: Module config round-trip — generate random configs, save/restore, verify command equality
- [x] 6.6 [PBT] Property 6: Primary type change retains matching custom modules — generate random custom lists and type transitions, verify retention
