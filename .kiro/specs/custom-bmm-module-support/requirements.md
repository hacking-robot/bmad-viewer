# Requirements Document

## Introduction

BMad Studio's New Project Dialog allows users to create projects with BMAD modules. Currently, when a user adds a custom module whose `module.yaml` declares `code: bmm`, the `checkCodeConflict` function rejects it because `bmm` is already the primary project type code. This prevents users from using custom BMM modules (e.g., a multi-sprint custom BMM module) that intentionally override or extend the built-in BMM module. The feature should allow custom modules with codes that match the primary project type to be used as replacements, while still preventing true duplicates among add-on and custom modules.

## Glossary

- **New_Project_Dialog**: The dialog component (`NewProjectForm.tsx`) that collects project configuration (location, name, type, modules) and initiates project creation.
- **Project_Wizard**: The multi-step wizard (`ProjectWizard.tsx`) that guides users through BMAD installation and project setup after a project is created.
- **Install_Step**: The first step of the Project Wizard that displays the `npx bmad-method install` command with the selected modules and custom content paths.
- **Module_Code**: A short identifier string (e.g., `bmm`, `gds`, `cis`) declared in a module's `module.yaml` file under the `code` field.
- **Primary_Module**: The main project type module selected via the toggle buttons (`bmm`, `gds`, or `tools`).
- **Custom_Module**: A user-provided module loaded from a local directory or GitHub repository, validated via `validateCustomModule`.
- **Conflict_Validator**: The `checkCodeConflict` function in `NewProjectForm` that checks whether a custom module's code collides with existing module codes.
- **Module_List**: The final array of module codes passed to the `npx bmad-method install` command via `--module` flags.
- **Custom_Content_Path**: A filesystem path to a custom module directory passed to the install command via `--custom-content` flags.

## Requirements

### Requirement 1: Allow Custom Modules to Replace the Primary Module

**User Story:** As a developer, I want to add a custom module whose code matches the primary project type (e.g., a custom `bmm` module), so that I can use a customized version of the BMM workflow (such as a multi-sprint BMM module) instead of the built-in one.

#### Acceptance Criteria

1. WHEN a custom module with a Module_Code matching the Primary_Module code is added, THE Conflict_Validator SHALL accept the custom module without displaying a conflict error.
2. WHEN a custom module replaces the Primary_Module, THE New_Project_Dialog SHALL indicate to the user that the custom module will replace the built-in primary module.
3. WHEN a custom module with a Module_Code matching the Primary_Module is added, THE New_Project_Dialog SHALL remove the built-in Primary_Module code from the Module_List and include the custom module's path in the Custom_Content_Path list instead.
4. WHEN multiple custom modules with the same Module_Code are added, THE Conflict_Validator SHALL reject the second module and display a conflict error message.

### Requirement 2: Correct Install Command Generation with Custom Primary Module

**User Story:** As a developer, I want the generated install command to correctly reflect the custom primary module replacement, so that the BMAD installer receives the right arguments.

#### Acceptance Criteria

1. WHEN a custom module replaces the Primary_Module, THE Install_Step SHALL generate an install command that excludes the replaced Primary_Module code from `--module` flags and includes the custom module path in `--custom-content` flags.
2. WHEN no custom module replaces the Primary_Module, THE Install_Step SHALL generate an install command that includes the Primary_Module code in `--module` flags as before.
3. THE Install_Step SHALL display the custom module replacement in the module info chips so the user can verify the correct modules are being installed.

### Requirement 3: Preserve Custom Module Replacement Across Wizard Resume

**User Story:** As a developer, I want my custom module selection to persist when the Project Wizard is resumed or the application is restarted, so that I do not lose my configuration.

#### Acceptance Criteria

1. WHEN a project is created with a custom module replacing the Primary_Module, THE New_Project_Dialog SHALL save both the `selectedModules` and `customContentPaths` to the recent project entry.
2. WHEN the Project_Wizard is resumed for a project with a custom primary module replacement, THE Install_Step SHALL reconstruct the correct install command using the saved module and custom content path data.
3. WHEN a project with a custom primary module is reopened, THE Project_Wizard SHALL use the saved `selectedModules` to determine the correct wizard steps for the primary module type.

### Requirement 4: Prevent Duplicate Custom Module Entries

**User Story:** As a developer, I want clear feedback when I try to add a duplicate custom module, so that I avoid configuration mistakes.

#### Acceptance Criteria

1. WHEN a custom module with the same Module_Code as an already-added custom module is added, THE Conflict_Validator SHALL reject the module and display an error message stating the code conflicts with an existing custom module.
2. WHEN a custom module with the same directory path as an already-added custom module is added, THE New_Project_Dialog SHALL reject the module and display an error message stating the module directory is already added.
3. WHEN a custom module with the same GitHub repository as an already-added custom module is added, THE New_Project_Dialog SHALL reject the module and display an error message stating the repository is already added.

### Requirement 5: Auto-Remove Conflicting Custom Modules on Primary Type Change

**User Story:** As a developer, I want custom modules that conflict with a newly selected primary type to be handled gracefully, so that I do not end up with an invalid module configuration.

#### Acceptance Criteria

1. WHEN the user changes the Primary_Module type and an existing custom module's code matches the new Primary_Module code, THE New_Project_Dialog SHALL retain the custom module (since it now serves as a replacement for the new primary type) rather than removing it.
2. WHEN the user changes the Primary_Module type to "tools" (no primary module), THE New_Project_Dialog SHALL retain all custom modules regardless of their codes.
