# Requirements Document

## Introduction

BMad Studio's Project Wizard guides users through project setup via a sequence of steps defined in `wizardSteps.ts`. These steps are currently hardcoded for three module types: BMM, GDS, and Dashboard. When a user creates a project with a custom BMM module (e.g., the `bmad-true-agile` multi-sprint module) that replaces the built-in BMM module, the wizard still uses the standard `BMM_WIZARD_STEPS`. This causes problems because:

1. The "Create Epics & Stories" step references the standard `create-epics-and-stories` workflow command and expects a single `epics.md` output, but the custom module may use a different workflow command and produce different artifacts.
2. The "Sprint Planning" step expects `sprint-status.yaml` as its output, but multi-sprint modules produce individual sprint files (`sprint-N.yaml`) in a `sprints/` folder instead.
3. The finish validation in `handleFinishSetup` and `handleCancel` checks for `epics.md` and `sprint-status.yaml`, which may not exist in multi-sprint projects.

This feature makes the wizard steps adaptive when a custom module replaces the primary module, so that step commands, output expectations, and finish validation align with the custom module's actual workflow.

## Glossary

- **Project_Wizard**: The multi-step wizard component (`ProjectWizard.tsx`) that guides users through BMAD installation and project setup after a project is created.
- **Wizard_Steps**: The ordered array of `WizardStep` objects that define the phases and actions of the Project_Wizard, currently sourced from `wizardSteps.ts`.
- **Custom_Module**: A user-provided module loaded from a local directory or GitHub repository whose `module.yaml` declares a `code` field (e.g., `bmm`).
- **Primary_Module**: The main project type module selected via the toggle buttons (`bmm`, `gds`, or `tools`) in the New Project Dialog.
- **Multi_Sprint_Module**: A Custom_Module with code `bmm` that replaces the built-in BMM module and uses a multi-sprint workflow producing individual sprint files instead of `sprint-status.yaml`.
- **Standard_BMM_Module**: The built-in BMM module that uses `create-epics-and-stories` and `sprint-planning` workflows and produces `epics.md` and `sprint-status.yaml`.
- **Wizard_Step_Definition**: A single `WizardStep` object containing `id`, `commandRef`, `commandModule`, `outputFile`, and other fields that define what a wizard step does and how completion is detected.
- **Finish_Validation**: The logic in `handleFinishSetup` and `handleCancel` that checks for required artifacts (`epics.md`, `sprint-status.yaml`) before allowing the wizard to complete.
- **BMAD_Scan**: The scan performed after BMAD installation (`scanBmad`) that discovers installed agents, workflows, and modules, producing a `BmadScanResult`.
- **Sprints_Folder**: The `{outputFolder}/implementation-artifacts/sprints/` directory containing individual sprint YAML files in multi-sprint projects.
- **Custom_Content_Path**: A filesystem path to a Custom_Module directory, stored in `customContentPaths` on the project configuration.

## Requirements

### Requirement 1: Detect Custom Module Replacement in Wizard

**User Story:** As a developer using a custom BMM module, I want the Project Wizard to detect that a custom module replaces the primary module, so that the wizard can adapt its steps accordingly.

#### Acceptance Criteria

1. WHEN the Project_Wizard is initialized with `customContentPaths` containing at least one path, THE Project_Wizard SHALL identify that a custom module replaces the Primary_Module.
2. WHEN the BMAD_Scan completes after installation, THE Project_Wizard SHALL inspect the scan result to determine whether the installed module provides different workflow commands or output artifacts than the Standard_BMM_Module.
3. WHEN the Project_Wizard is resumed from saved state for a project with a Custom_Module replacement, THE Project_Wizard SHALL restore the custom module context and continue using adapted wizard steps.

### Requirement 2: Adapt Epic Creation Step for Custom Modules

**User Story:** As a developer using a multi-sprint custom BMM module, I want the epic creation wizard step to use the correct workflow command and detect the correct output artifacts, so that the step completes properly with my custom module's workflow.

#### Acceptance Criteria

1. WHEN a Custom_Module replaces the Primary_Module and the BMAD_Scan reveals a different workflow command for epic creation, THE Project_Wizard SHALL use the scanned workflow command instead of the hardcoded `create-epics-and-stories` command reference.
2. WHEN a Custom_Module produces sharded epic files (e.g., `epic-1.md`, `epic-2.md`) instead of a single `epics.md`, THE Project_Wizard SHALL detect step completion by checking for files matching the `epic-` prefix in addition to checking for `epics.md`.
3. WHEN the epic creation step output is detected via either `epics.md` or sharded `epic-*.md` files, THE Project_Wizard SHALL mark the step as completed.

### Requirement 3: Adapt Sprint Planning Step for Multi-Sprint Modules

**User Story:** As a developer using a multi-sprint custom BMM module, I want the sprint planning wizard step to recognize sprint files in the `sprints/` folder as valid output, so that the step completes without requiring `sprint-status.yaml`.

#### Acceptance Criteria

1. WHEN a Custom_Module replaces the Primary_Module, THE Project_Wizard SHALL check for sprint output in both the standard location (`sprint-status.yaml`) and the Sprints_Folder (`{outputFolder}/implementation-artifacts/sprints/sprint-*.yaml`).
2. WHEN the Sprints_Folder contains at least one file matching `sprint-*.yaml`, THE Project_Wizard SHALL treat the sprint planning step as having valid output.
3. WHEN the BMAD_Scan reveals a different workflow command for sprint planning, THE Project_Wizard SHALL use the scanned workflow command instead of the hardcoded `sprint-planning` command reference.

### Requirement 4: Adapt Finish Validation for Multi-Sprint Projects

**User Story:** As a developer using a multi-sprint custom BMM module, I want the wizard finish validation to accept sprint files in the `sprints/` folder as a valid alternative to `sprint-status.yaml`, so that I can complete the wizard setup.

#### Acceptance Criteria

1. WHEN the user clicks "Finish Setup", THE Finish_Validation SHALL check for sprint output in both the standard location (`sprint-status.yaml`) and the Sprints_Folder.
2. WHEN the Sprints_Folder contains at least one file matching `sprint-*.yaml`, THE Finish_Validation SHALL consider the sprint planning artifact requirement satisfied.
3. WHEN the user cancels the wizard, THE Finish_Validation SHALL use the same expanded artifact checks (including Sprints_Folder) to determine whether the project is set up.
4. WHEN the Finish_Validation checks for epics, THE Finish_Validation SHALL accept both a single `epics.md` file and sharded `epic-*.md` files as valid epic artifacts.

### Requirement 5: Dynamic Step Resolution from BMAD Scan

**User Story:** As a developer, I want the wizard to dynamically resolve step commands and output expectations from the BMAD scan data, so that custom modules with different workflow names or output structures work without hardcoded overrides.

#### Acceptance Criteria

1. WHEN the BMAD_Scan completes, THE Project_Wizard SHALL use the `resolveCommand` function to resolve each agent step's command from the scan data, matching by `commandRef`, `commandModule`, and `commandType`.
2. WHEN a resolved command differs from the hardcoded default for a step, THE Project_Wizard SHALL use the resolved command for that step.
3. WHEN the BMAD_Scan reveals workflow metadata indicating multi-sprint output (e.g., the sprint planning workflow produces files in a `sprints/` directory), THE Project_Wizard SHALL update the sprint planning step's output detection to check the Sprints_Folder.

### Requirement 6: Preserve Custom Module Information Across Wizard Lifecycle

**User Story:** As a developer, I want my custom module configuration to persist throughout the wizard lifecycle (start, resume, finish), so that the wizard consistently uses the correct adapted steps.

#### Acceptance Criteria

1. WHEN a project is created with a Custom_Module, THE Project_Wizard SHALL store the `customContentPaths` in both the wizard state and the recent project entry.
2. WHEN the Project_Wizard state is saved to disk, THE Project_Wizard SHALL include the `customContentPaths` in the persisted state.
3. WHEN the Project_Wizard is resumed from saved state, THE Project_Wizard SHALL restore `customContentPaths` and use the custom module context to determine adapted wizard steps.
4. WHEN the Project_Wizard finishes setup, THE Project_Wizard SHALL preserve the `customContentPaths` in the recent project entry so that subsequent project loads can detect the custom module.
