import type { BmadHelpRow, AgentManifestRow, SetupStep, SetupProgress } from '../types/bmadScan'
import { getFs } from '../services/fsRouter'

/**
 * Parse a single CSV line, handling quoted fields with embedded commas.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

function parseCsv(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  return lines.slice(1).map(parseCsvLine)
}

/**
 * Parse bmad-help.csv into typed rows.
 * CSV columns: module, phase, name, code, sequence, workflow-file, command, required,
 *   agent-name, agent-command, agent-display-name, agent-title, options, description, output-location, outputs
 */
export function parseBmadHelpCsv(csvText: string): BmadHelpRow[] {
  const rows = parseCsv(csvText)
  return rows.map(fields => ({
    module: (fields[0] || '').trim(),
    phase: (fields[1] || '').trim(),
    name: (fields[2] || '').trim(),
    code: (fields[3] || '').trim(),
    sequence: (fields[4] || '').trim(),
    workflowFile: (fields[5] || '').trim(),
    command: (fields[6] || '').trim(),
    // Index 7 header says "required" but data shows "false" for all rows.
    // The actual required flag is at index 12 (header says "options").
    required: (fields[12] || '').trim().toLowerCase() === 'true',
    agentName: (fields[8] || '').trim(),
    agentCommand: (fields[9] || '').trim(),
    agentDisplayName: (fields[10] || '').trim(),
    agentTitle: (fields[11] || '').trim(),
    options: (fields[7] || '').trim(),
    // Index 13 header says "description" but data shows output-location values.
    // The actual description is in the "sequence" field at index 4.
    description: (fields[4] || '').trim(),
    // Index 14 header says "output-location" but data shows output names.
    // The actual output-location is at index 13.
    outputLocation: (fields[13] || '').trim(),
    // Index 15 header says "outputs" but data is empty.
    // The actual outputs are at index 14.
    outputs: (fields[14] || '').trim(),
  }))
}

/**
 * Parse agent-manifest.csv into typed rows.
 * CSV columns: name, displayName, title, icon, capabilities, role, identity, communicationStyle, principles, module, path, canonicalId
 */
export function parseAgentManifestCsv(csvText: string): AgentManifestRow[] {
  const rows = parseCsv(csvText)
  return rows.map(fields => ({
    name: (fields[0] || '').trim(),
    displayName: (fields[1] || '').trim(),
    title: (fields[2] || '').trim(),
    icon: (fields[3] || '').trim(),
    capabilities: (fields[4] || '').trim(),
    role: (fields[5] || '').trim(),
    identity: (fields[6] || '').trim(),
    communicationStyle: (fields[7] || '').trim(),
    principles: (fields[8] || '').trim(),
    module: (fields[9] || '').trim(),
    path: (fields[10] || '').trim(),
    canonicalId: (fields[11] || '').trim(),
  }))
}

/**
 * Compute setup progress by checking which artifacts exist.
 */
export async function computeSetupProgress(outputFolder: string): Promise<SetupProgress> {
  const fileOps = getFs()

  // Read bmad-help.csv
  let helpRows: BmadHelpRow[] = []
  const helpResult = await fileOps.readFile('_bmad/_config/bmad-help.csv')
  if (helpResult.content) {
    helpRows = parseBmadHelpCsv(helpResult.content)
  }

  // Read agent-manifest.csv
  let agentRows: AgentManifestRow[] = []
  const agentResult = await fileOps.readFile('_bmad/_config/agent-manifest.csv')
  if (agentResult.content) {
    agentRows = parseAgentManifestCsv(agentResult.content)
  }

  // List files in artifact directories
  const planningFiles: string[] = []
  const planningResult = await fileOps.listDirectory(`${outputFolder}/planning-artifacts`)
  if (planningResult.files) planningFiles.push(...planningResult.files)

  const implFiles: string[] = []
  const implResult = await fileOps.listDirectory(`${outputFolder}/implementation-artifacts`)
  if (implResult.files) implFiles.push(...implResult.files)

  // Also check sprints directory
  const sprintsResult = await fileOps.listDirectory(`${outputFolder}/implementation-artifacts/sprints`)

  // Check output root too
  const rootResult = await fileOps.listDirectory(outputFolder)
  const rootFiles: string[] = rootResult.files || []

  const lowerPlanning = planningFiles.map(f => f.toLowerCase())
  const lowerImpl = implFiles.map(f => f.toLowerCase())
  const lowerRoot = rootFiles.map(f => f.toLowerCase())

  // Check for specific artifacts
  const hasPrd = lowerPlanning.some(f =>
    f.includes('prd') || f.includes('product-requirements')
  ) || lowerRoot.some(f =>
    f.includes('prd') || f.includes('product-requirements')
  )
  const hasArchitecture = lowerPlanning.some(f =>
    f.includes('arch') || f.includes('architecture') || f.includes('tech-spec')
  ) || lowerRoot.some(f =>
    f.includes('arch') || f.includes('architecture') || f.includes('tech-spec')
  )
  const hasEpics = lowerPlanning.includes('epics.md') ||
    lowerPlanning.some(f => /^epic-\d+\.md$/.test(f)) ||
    lowerRoot.includes('epics.md')
  const hasStories = lowerPlanning.some(f =>
    f.startsWith('story-') || f.includes('stories')
  ) || lowerImpl.some(f =>
    f.startsWith('story-') || f.includes('stories')
  )
  const hasSprintStatus = lowerImpl.includes('sprint-status.yaml') ||
    ((sprintsResult.files || []).some(f => /^sprint-\d+\.yaml$/.test(f)))

  // Build artifact checks map keyed by output names
  const artifactChecks: Record<string, boolean> = {
    prd: hasPrd,
    'product brief': lowerPlanning.some(f => f.includes('product-brief') || f.includes('brief')),
    architecture: hasArchitecture,
    epics: hasEpics,
    'epics and stories': hasEpics && hasStories,
    stories: hasStories,
    'readiness report': hasEpics, // can't specifically detect readiness report
    'sprint status': hasSprintStatus,
    'sprint planning': hasSprintStatus,
  }

  // Build steps from CSV data
  if (helpRows.length > 0) {
    // The "phase" in data is actually the workflow name (fields[1]).
    // The real phase is in the "command" field (fields[6]) e.g. "2-planning", "anytime".
    // Some commands have arguments like "[path]" — filter those out.
    const isRealPhase = (cmd: string) =>
      cmd && cmd !== 'anytime' && !cmd.startsWith('[') && !cmd.startsWith('{')

    // Sort by phase number (e.g. "2-planning" → 2), then by dependency chain
    // within each phase. The "options" field (idx 7) holds the prerequisite
    // workflow name; "false" or empty means no dependency.
    const phaseNum = (phase: string): number => {
      const m = phase.match(/^(\d+)/)
      return m ? parseInt(m[1]) : 99
    }
    const hasDep = (opt: string) => opt !== '' && opt.toLowerCase() !== 'false'
    const sortByPhase = (rows: BmadHelpRow[]): BmadHelpRow[] =>
      [...rows].sort((a, b) => {
        const pa = phaseNum(a.command), pb = phaseNum(b.command)
        if (pa !== pb) return pa - pb
        // Same phase: b depends on a → a comes first
        if (hasDep(b.options) && b.options === a.phase) return -1
        if (hasDep(a.options) && a.options === b.phase) return 1
        // No direct dep between them: no-dep first
        if (!hasDep(a.options) && hasDep(b.options)) return -1
        if (hasDep(a.options) && !hasDep(b.options)) return 1
        return 0
      })

    const requiredRows = sortByPhase(helpRows.filter(r => r.required && isRealPhase(r.command)))
    const optionalRows = sortByPhase(helpRows.filter(r => !r.required && isRealPhase(r.command)))

    const buildStep = (row: BmadHelpRow): SetupStep => {
      const outputKeys = row.outputs
        .split('|')
        .flatMap(o => o.split(','))
        .map(o => o.trim().toLowerCase())
        .filter(Boolean)
      const completed = outputKeys.length > 0 && outputKeys.every(key => artifactChecks[key] === true)

      return {
        id: row.phase, // phase field holds workflow name like "bmad-create-prd"
        name: row.phase,
        label: row.code ? `${row.code} - ${row.name}` : row.name,
        description: row.description,
        phase: row.command, // command field holds the actual phase like "2-planning"
        required: row.required,
        completed,
        outputs: row.outputs,
        outputLocation: row.outputLocation,
        agentName: row.agentDisplayName || row.agentName,
        agentCommand: row.agentCommand,
        moduleName: row.module,
      }
    }

    const steps: SetupStep[] = [
      ...requiredRows.map(buildStep),
      ...optionalRows.map(buildStep),
    ]

    const requiredSteps = steps.filter(s => s.required)
    const requiredTotal = requiredSteps.length
    const requiredCompleted = requiredSteps.filter(s => s.completed).length
    const percentComplete = requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0

    return {
      steps,
      requiredTotal,
      requiredCompleted,
      percentComplete,
      boardReady: hasSprintStatus,
      agents: agentRows,
    }
  }

  // Fallback: hardcoded steps when no CSV available
  const fallbackSteps: SetupStep[] = [
    {
      id: 'create-prd',
      name: 'bmad-create-prd',
      label: 'CP - Create PRD',
      description: 'Expert led facilitation to produce your Product Requirements Document.',
      phase: '2-planning',
      required: true,
      completed: hasPrd,
      outputs: 'prd',
      outputLocation: 'planning_artifacts',
      agentName: '',
      agentCommand: '',
      moduleName: '',
    },
    {
      id: 'create-architecture',
      name: 'bmad-create-architecture',
      label: 'CA - Create Architecture',
      description: 'Guided workflow to document technical decisions.',
      phase: '3-solutioning',
      required: true,
      completed: hasArchitecture,
      outputs: 'architecture',
      outputLocation: 'planning_artifacts',
      agentName: '',
      agentCommand: '',
      moduleName: '',
    },
    {
      id: 'create-epics-and-stories',
      name: 'bmad-create-epics-and-stories',
      label: 'CE - Create Epics & Stories',
      description: 'Create epics and user stories for the project.',
      phase: '3-solutioning',
      required: true,
      completed: hasEpics,
      outputs: 'epics, stories',
      outputLocation: 'planning_artifacts',
      agentName: '',
      agentCommand: '',
      moduleName: '',
    },
    {
      id: 'check-implementation-readiness',
      name: 'bmad-check-implementation-readiness',
      label: 'IR - Check Implementation Readiness',
      description: 'Ensure PRD, Architecture, and Epics/Stories are aligned.',
      phase: '3-solutioning',
      required: true,
      completed: hasEpics,
      outputs: 'readiness report',
      outputLocation: 'planning_artifacts',
      agentName: '',
      agentCommand: '',
      moduleName: '',
    },
    {
      id: 'sprint-planning',
      name: 'bmad-sprint-planning',
      label: 'SP - Sprint Planning',
      description: 'Kicks off implementation by producing a plan for every story.',
      phase: '4-implementation',
      required: true,
      completed: hasSprintStatus,
      outputs: 'sprint status',
      outputLocation: 'implementation_artifacts',
      agentName: '',
      agentCommand: '',
      moduleName: '',
    },
  ]

  const requiredTotal = fallbackSteps.filter(s => s.required).length
  const requiredCompleted = fallbackSteps.filter(s => s.required && s.completed).length
  const percentComplete = requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0

  return {
    steps: fallbackSteps,
    requiredTotal,
    requiredCompleted,
    percentComplete,
    boardReady: hasSprintStatus,
    agents: agentRows,
  }
}
