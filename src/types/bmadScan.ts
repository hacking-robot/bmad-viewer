import type { StoryStatus } from './index'

export interface StatusDefinition {
  id: StoryStatus
  label: string
  color: string
  description: string
  displayOrder: number
  visible: boolean
}

export interface StatusTransition {
  from: StoryStatus
  to: StoryStatus
}

export interface NextStepAction {
  label: string
  agentId: string
  command: string
  description: string
  primary?: boolean
  tooltip?: string
}

export interface StatusActions {
  nextSteps: NextStepAction[]
}

export interface AgentDefinition {
  id: string
  name: string
  role: string
  avatar: string
  description: string
  whenToUse: string
  color: string
  commands: string[]
  examplePrompts: string[]
}

export interface ProjectWorkflowPhase {
  label: string
  icon: string
  description?: string
  workflows: NextStepAction[]
}

export interface WorkflowConfig {
  version: string
  statuses: StatusDefinition[]
  transitions: StatusTransition[]
  statusActions: Record<StoryStatus, StatusActions>
  agents: AgentDefinition[]
  projectWorkflows?: Record<string, ProjectWorkflowPhase>
}

export interface ScannedCommand {
  name: string
  module: string
  type: 'workflows' | 'agents'
  label: string
}

export interface ScannedAgent {
  id: string
  name: string
  title: string
  icon: string
  role: string
  identity: string
  communicationStyle: string
  principles: string
  module: string
  commands: ScannedCommand[]
}

export interface ScannedWorkflow {
  name: string
  description: string
  module: string
  stepCount: number
  maxStepNumber: number
  stepNames: string[]
}

export interface BmadScanResult {
  version: string | null
  modules: string[]
  agents: ScannedAgent[]
  workflows: ScannedWorkflow[]
  detectedDeveloperMode: 'ai' | 'human' | null
  installedIdes: string[]
  missingClaudeCommands: boolean
  outputFolder?: string
  scannedAt: string
}

/** Raw row from bmad-help.csv */
export interface BmadHelpRow {
  module: string
  phase: string
  name: string
  code: string
  sequence: string
  workflowFile: string
  command: string
  required: boolean
  agentName: string
  agentCommand: string
  agentDisplayName: string
  agentTitle: string
  options: string
  description: string
  outputLocation: string
  outputs: string
}

/** Raw row from agent-manifest.csv */
export interface AgentManifestRow {
  name: string
  displayName: string
  title: string
  icon: string
  capabilities: string
  role: string
  identity: string
  communicationStyle: string
  principles: string
  module: string
  path: string
  canonicalId: string
}

/** Single setup step with completion status */
export interface SetupStep {
  id: string
  name: string
  label: string
  description: string
  phase: string
  required: boolean
  completed: boolean
  outputs: string
  outputLocation: string
  agentName: string
  agentCommand: string
  moduleName: string
}

/** Overall setup progress */
export interface SetupProgress {
  steps: SetupStep[]
  requiredTotal: number
  requiredCompleted: number
  percentComplete: number
  boardReady: boolean
  agents: AgentManifestRow[]
}
