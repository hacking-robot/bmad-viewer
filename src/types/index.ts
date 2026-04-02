// Canonical statuses used in the UI
export type StoryStatus = 'backlog' | 'ready-for-dev' | 'in-progress' | 'review' | 'human-review' | 'done' | 'optional'

// Extended type that includes legacy/alternate status values that may appear in sprint-status.yaml
export type StoryStatusExtended = StoryStatus | 'ready-for-review' | 'complete'

export const VALID_STATUSES: Set<StoryStatus> = new Set([
  'backlog', 'ready-for-dev', 'in-progress', 'review', 'human-review', 'done', 'optional'
])

// Synonym map: normalized key → canonical StoryStatus
const STATUS_SYNONYMS: Record<string, StoryStatus> = {
  // done synonyms
  'completed': 'done',
  'complete': 'done',
  'finished': 'done',
  // in-progress synonyms
  'wip': 'in-progress',
  'working': 'in-progress',
  'in-dev': 'in-progress',
  'development': 'in-progress',
  // review synonyms
  'ready-for-review': 'review',
  'needs-review': 'review',
  'pending-review': 'review',
  // backlog synonyms
  'todo': 'backlog',
  'new': 'backlog',
  'not-started': 'backlog',
  'pending': 'backlog',
  // ready-for-dev synonyms
  'ready': 'ready-for-dev',
  'ready-to-dev': 'ready-for-dev',
  'ready-to-develop': 'ready-for-dev',
  'ready-for-development': 'ready-for-dev',
}

// Normalize any status string to a canonical StoryStatus.
// Returns null if the value cannot be recognized.
export function normalizeStatus(status: string): StoryStatus | null {
  const key = status.trim().toLowerCase().replace(/[_\s]+/g, '-')
  if (VALID_STATUSES.has(key as StoryStatus)) return key as StoryStatus
  return STATUS_SYNONYMS[key] ?? null
}

export interface Epic {
  id: number
  name: string
  goal: string
  status: StoryStatus
  stories: Story[]
  frsCovered?: string[]    // Epic-level FRs covered (from **FRs Covered:** line)
  nfrsCovered?: string[]   // Epic-level NFRs covered
  archCovered?: string[]   // Epic-level ARCH requirements covered
  arCovered?: string[]     // Epic-level AR (Additional Requirements) covered
}

export interface Story {
  id: string // e.g., "1-1-place-nand-gates"
  epicId: number
  storyNumber: number | string
  title: string
  slug: string
  status: StoryStatus
  filePath?: string
  // User story description from epics.md (for stories without story files)
  epicDescription?: string
  // Parsed content (loaded on demand from story file)
  content?: StoryContent
  // Sprint metadata (from sprint-status.yaml)
  assignee?: string | null
  jiraKey?: string | null
  // Additional metadata from epics.md (for stories without story files)
  acceptanceCriteriaPreview?: string[]  // First 3 AC items from epics.md
  technicalNotes?: string               // Technical Notes section
  frsAddressed?: string[]               // FRs addressed list
  nfrsAddressed?: string[]              // NFRs addressed list
  archAddressed?: string[]              // Architecture requirements addressed list
  arAddressed?: string[]                // AR (Additional Requirements) addressed list
  // Story estimation
  points?: number                       // Story points (optional)
}

export interface StoryContent {
  rawMarkdown: string
  description: string // The "As a... I want... so that..." part
  acceptanceCriteria: AcceptanceCriterion[]
  acceptanceCriteriaRaw?: string // Raw markdown fallback when structured AC parsing fails
  tasks: Task[]
  devNotes: string
  fileChanges?: FileChanges
  developmentRecord?: string
}

export interface AcceptanceCriterion {
  id: string
  title: string
  description: string
}

export interface Task {
  id: string
  title: string
  completed: boolean
  subtasks: Subtask[]
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface FileChanges {
  created: string[]
  modified: string[]
  verified: string[]
}

// Column configuration for the board
export const STATUS_COLUMNS: { status: StoryStatus; label: string; color: string }[] = [
  { status: 'backlog', label: 'Backlog', color: '#9e9e9e' },
  { status: 'ready-for-dev', label: 'Ready for Dev', color: '#2196f3' },
  { status: 'in-progress', label: 'In Progress', color: '#ff9800' },
  { status: 'review', label: 'Review', color: '#9c27b0' },
  { status: 'human-review', label: 'Human Review', color: '#e91e63' },
  { status: 'done', label: 'Done', color: '#4caf50' }
]

// Human Review checklist types
export interface HumanReviewChecklistItem {
  id: string
  label: string
  description?: string
}

export interface StoryReviewState {
  storyId: string
  checkedItems: string[]
  lastUpdated: number
}

// Epic colors for badges
export const EPIC_COLORS: string[] = [
  '#1976d2', // Blue
  '#388e3c', // Green
  '#f57c00', // Orange
  '#7b1fa2', // Purple
  '#c62828', // Red
  '#00838f', // Cyan
  '#5d4037', // Brown
  '#455a64', // Blue Grey
  '#ad1457'  // Pink
]

// Agent types
export type AgentStatus = 'running' | 'completed' | 'error' | 'interrupted'
export type ProjectType = 'bmm' | 'gds' | 'dashboard'
export type BmadVersion = 'stable'

// AI Tool types - determines command syntax
// BMAD v6.2.0 supports 20 tools/IDEs (KiloCoder suspended)
export type AITool =
  | 'claude-code'
  | 'cursor'
  | 'windsurf'
  | 'roo'
  | 'antigravity'
  | 'auggie'
  | 'cline'
  | 'codex'
  | 'codebuddy'
  | 'crush'
  | 'gemini'
  | 'github-copilot'
  | 'iflow'
  | 'kiro'
  | 'opencode'
  | 'pi'
  | 'qwen'
  | 'rovo-dev'
  | 'trae'

// Claude model aliases for --model flag
export type ClaudeModel = 'sonnet' | 'opus'

// Tool category - CLI tools have command-line interfaces, IDEs are integrated
export type ToolCategory = 'cli' | 'ide'

// AI Tool configuration interface
export type CommandFormat = 'slash' | 'name-only'

export interface AIToolConfig {
  id: AITool
  name: string
  category: ToolCategory
  description: string
  skillsDir: string          // Tool-specific skills directory (e.g., '.claude/skills')
  cli: CLIToolInfo
  preferred: boolean         // Marked as preferred tool in BMAD
  suspended?: boolean | string // If true/string, tool is suspended (reason as string)
  commandFormat: CommandFormat  // 'slash' for /command, 'name-only' for commands without prefix
}

export const CLAUDE_MODELS: { id: ClaudeModel; name: string; description: string }[] = [
  { id: 'opus', name: 'Opus', description: 'Most intelligent, best for complex tasks' },
  { id: 'sonnet', name: 'Sonnet', description: 'Fast and capable' }
]

// CLI Tool capabilities
export interface CLIToolInfo {
  cliCommand: string | null  // null means IDE-only (no CLI support)
  hasStreamJson: boolean     // Supports --output-format stream-json
  hasResume: boolean         // Supports --resume <sessionId>
  supportsHeadless: boolean  // Can run without UI/IDE
}

// CLI detection result from backend
export interface CLIDetectionResult {
  available: boolean
  path: string | null
  version: string | null
  error: string | null
}

// BMAD v6.2.0 AI Tools configuration
// Platform codes from BMAD platform-codes.yaml
export const AI_TOOLS: AIToolConfig[] = [
  // === CLI Tools (Preferred) ===
  {
    id: 'claude-code',
    name: 'Claude Code',
    category: 'cli',
    description: 'Anthropic CLI - uses /command slash syntax',
    skillsDir: '.claude/skills',
    cli: { cliCommand: 'claude', hasStreamJson: true, hasResume: true, supportsHeadless: true },
    preferred: true,
    commandFormat: 'slash'
  },
  {
    id: 'auggie',
    name: 'Auggie',
    category: 'cli',
    description: 'CLI-based AI coding assistant',
    skillsDir: '.augment/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: true },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    category: 'cli',
    description: 'OpenAI CLI for code generation',
    skillsDir: '.codex/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: true },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    category: 'cli',
    description: 'Google Gemini CLI',
    skillsDir: '.gemini/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: true },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'pi',
    name: 'Pi',
    category: 'cli',
    description: 'Personal Intelligence CLI',
    skillsDir: '.pi/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: true },
    preferred: false,
    commandFormat: 'slash'
  },

  // === IDEs (Preferred) ===
  {
    id: 'cursor',
    name: 'Cursor',
    category: 'ide',
    description: 'Cursor IDE - uses /command syntax for skills',
    skillsDir: '.cursor/skills',
    cli: { cliCommand: 'cursor', hasStreamJson: false, hasResume: false, supportsHeadless: true },
    preferred: true,
    commandFormat: 'slash'
  },

  // === Other IDEs ===
  {
    id: 'windsurf',
    name: 'Windsurf',
    category: 'ide',
    description: 'Codeium IDE - uses /workflow syntax',
    skillsDir: '.windsurf/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'roo',
    name: 'Roo Code',
    category: 'ide',
    description: 'VS Code extension - uses /command syntax',
    skillsDir: '.roo/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    category: 'ide',
    description: 'Google AI IDE integration',
    skillsDir: '.agent/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'name-only'
  },
  {
    id: 'cline',
    name: 'Cline',
    category: 'ide',
    description: 'VS Code extension for AI development',
    skillsDir: '.cline/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'codebuddy',
    name: 'CodeBuddy',
    category: 'ide',
    description: 'AI code assistant IDE',
    skillsDir: '.codebuddy/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'crush',
    name: 'Crush',
    category: 'ide',
    description: 'AI-powered IDE extension',
    skillsDir: '.crush/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'ide',
    description: 'GitHub Copilot integration (MCP-based)',
    skillsDir: '.github/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'name-only'
  },
  {
    id: 'iflow',
    name: 'iFlow',
    category: 'ide',
    description: 'iFlow IDE assistant',
    skillsDir: '.iflow/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'kiro',
    name: 'Kiro',
    category: 'ide',
    description: 'Kiro AI IDE - uses /command slash syntax like Claude Code',
    skillsDir: '.kiro/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    category: 'ide',
    description: 'OpenCode AI assistant',
    skillsDir: '.opencode/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'name-only'
  },
  {
    id: 'qwen',
    name: 'QwenCoder',
    category: 'ide',
    description: 'Alibaba Qwen IDE integration',
    skillsDir: '.qwen/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'slash'
  },
  {
    id: 'rovo-dev',
    name: 'Rovo Dev',
    category: 'ide',
    description: 'Atlassian Rovo Dev integration',
    skillsDir: '.rovodev/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'name-only'
  },
  {
    id: 'trae',
    name: 'Trae',
    category: 'ide',
    description: 'Trae AI IDE extension',
    skillsDir: '.trae/skills',
    cli: { cliCommand: null, hasStreamJson: false, hasResume: false, supportsHeadless: false },
    preferred: false,
    commandFormat: 'name-only'
  }
]

export interface Agent {
  id: string
  storyId: string
  storyTitle: string
  command: string
  status: AgentStatus
  output: string[]
  startTime: number
  pid?: number
}

// Agent history for persistence across app restarts
export interface AgentHistoryEntry {
  id: string
  storyId: string
  storyTitle: string
  command: string
  status: AgentStatus
  output: string[] // Last N lines of output
  startTime: number
  endTime?: number
  exitCode?: number
}

// NOTE: Agent actions are now defined in src/data/flow.json
// Use the useWorkflow hook to access workflow data

// LLM response statistics (from claude CLI --output-format stream-json)
export interface LLMStats {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  totalCostUsd?: number
  durationMs?: number
  apiDurationMs?: number
}

// Per-project LLM cost tracking
export interface ProjectCostEntry {
  id: string
  timestamp: number
  agentId: string
  storyId?: string
  messageId: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  totalCostUsd: number
  durationMs?: number
}

// Tool call tracking for verbose chat mode
export interface ToolCall {
  name: string                      // "Read", "Edit", "Bash", etc.
  summary: string                   // From getToolActivity(): "Reading store.ts"
  input?: Record<string, unknown>   // Raw input for expanded detail
}

// Chat interface types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status: 'pending' | 'streaming' | 'complete' | 'error'
  stats?: LLMStats // LLM usage stats for assistant messages
  toolCalls?: ToolCall[] // Tool calls made during this message (always captured, displayed in verbose mode)
}

export interface AgentThread {
  agentId: string
  messages: ChatMessage[]
  lastActivity: number
  unreadCount: number
  isTyping: boolean
  isInitialized: boolean // Whether the BMAD agent has been loaded in the session
  sessionId?: string // Claude conversation session ID for --resume
  thinkingActivity?: string // What Claude is currently doing (e.g., "Reading file...", "Searching...")
  storyId?: string // The story this thread is working on
  branchName?: string // The branch this thread is working on
}

// Background project state — preserved when switching away from a project with active work
export interface BackgroundProjectState {
  projectPath: string
  projectType: ProjectType
  outputFolder: string
  stories: Story[]
  epics: Epic[]
  baseBranch: string
  enableEpicBranches: boolean
  disableGitBranching: boolean
  jiraDomain: string
  aiTool: AITool
  claudeModel: ClaudeModel
  scannedWorkflowConfig: import('./flow').WorkflowConfig | null
  bmadScanResult: import('./bmadScan').BmadScanResult | null
  // Sprint state (multi-sprint projects)
  sprints?: SprintData[]
  velocityLog?: VelocityLog | null
  selectedSprintNumber?: number | null
  isMultiSprint?: boolean
}

// NOTE: BMAD agent definitions are now in src/data/flow-bmm.json and src/data/flow-gds.json
// Use the useWorkflow hook to access agent data


// Sprint-related types for multi-sprint support

export interface SprintData {
  sprintNumber: number
  status: 'active' | 'completed' | 'planned'
  dates: {
    start: string       // ISO date string
    targetEnd: string
    actualEnd: string | null
  }
  team: SprintTeamMember[]
  plannedStories: SprintStory[]
  metrics: SprintMetrics
  carryover: SprintStory[]
  retroCompleted: boolean
}

export interface SprintTeamMember {
  name: string
}

export interface SprintStory {
  key: string           // e.g., "2-12-itokencache-abstraction"
  epic: number
  epicTitle?: string
  title: string
  points: number
  status: string        // raw status from file, normalized later
  assignee: string | null
  jiraKey: string | null
  sourceFile?: string
}

export interface SprintMetrics {
  totalPoints: number
  completedPoints: number
  storyCount?: number
  storiesCompleted?: number
  storiesCarried?: number
  storiesByEpic?: Record<string, number>
}

export interface VelocityLog {
  sprints: VelocityEntry[]
  averages: {
    last3Sprints: number
    last5Sprints: number
    allTime: number
    trend: string       // "stable", "increasing", "decreasing"
  }
  recommendations: {
    conservative: number
    standard: number
    aggressive: number
  }
}

export interface VelocityEntry {
  sprintNumber: number
  plannedPoints: number
  completedPoints: number
  velocity: number
  storiesCompleted: number
  storiesCarried: number
  dateCompleted: string
  notes?: string
}
