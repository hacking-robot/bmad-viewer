import { parse } from 'yaml'
import {
  SprintData,
  SprintStory,
  SprintTeamMember,
  SprintMetrics,
  VelocityLog,
  VelocityEntry,
  StoryStatus,
} from '../types'
import { normalizeStatus } from '../types'

/**
 * Parse a single sprint YAML file into SprintData.
 * Handles both nested date format (dates.start, dates.target_end, dates.actual_end)
 * and legacy flat date format (start_date, target_end, actual_end).
 *
 * Returns null and logs a warning if required fields are missing.
 */
export function parseSprint(yamlContent: string): SprintData | null {
  const raw = parse(yamlContent)

  if (!raw || typeof raw !== 'object') {
    console.warn('[parseSprint] Invalid YAML content: not an object')
    return null
  }

  // Required fields check
  if (raw.sprint_number == null || !raw.planned_stories) {
    console.warn(
      `[parseSprint] Skipping sprint file: missing required fields (sprint_number: ${raw.sprint_number}, planned_stories: ${!!raw.planned_stories})`
    )
    return null
  }

  // Parse dates — nested format takes priority over legacy flat format
  let start = ''
  let targetEnd = ''
  let actualEnd: string | null = null

  if (raw.dates && typeof raw.dates === 'object') {
    start = String(raw.dates.start ?? '')
    targetEnd = String(raw.dates.target_end ?? '')
    actualEnd = raw.dates.actual_end != null ? String(raw.dates.actual_end) : null
  } else {
    start = String(raw.start_date ?? '')
    targetEnd = String(raw.target_end ?? '')
    actualEnd = raw.actual_end != null ? String(raw.actual_end) : null
  }

  // Parse status
  const statusRaw = String(raw.status ?? 'planned').toLowerCase()
  const status: SprintData['status'] =
    statusRaw === 'active' ? 'active' :
    statusRaw === 'completed' ? 'completed' :
    'planned'

  // Parse team
  const team: SprintTeamMember[] = Array.isArray(raw.team)
    ? raw.team.map((t: unknown) => {
        if (typeof t === 'string') return { name: t }
        if (t && typeof t === 'object' && 'name' in t) return { name: String((t as Record<string, unknown>).name) }
        return { name: String(t) }
      })
    : []

  // Parse planned stories
  const plannedStories = parseStories(raw.planned_stories)

  // Parse carryover stories
  const carryover = Array.isArray(raw.carryover) ? parseStories(raw.carryover) : []

  // Parse metrics
  const metrics = parseMetrics(raw.metrics)

  // Retro completed
  const retroCompleted = raw.retro_completed === true

  return {
    sprintNumber: Number(raw.sprint_number),
    status,
    dates: { start, targetEnd, actualEnd },
    team,
    plannedStories,
    metrics,
    carryover,
    retroCompleted,
  }
}

function parseStories(rawStories: unknown): SprintStory[] {
  if (!Array.isArray(rawStories)) return []

  return rawStories.map((s: unknown) => {
    const story = s as Record<string, unknown>
    const rawStatus = String(story.status ?? 'backlog')
    const normalized = normalizeStatus(rawStatus)

    return {
      key: String(story.key ?? ''),
      epic: Number(story.epic ?? 0),
      epicTitle: story.epic_title != null ? String(story.epic_title) : undefined,
      title: String(story.title ?? ''),
      points: Number(story.points ?? 0),
      status: normalized ?? 'backlog',
      assignee: story.assignee != null ? String(story.assignee) : null,
      jiraKey: story.jira_key != null ? String(story.jira_key) : null,
      sourceFile: story.source_file != null ? String(story.source_file) : undefined,
    }
  })
}

function parseMetrics(raw: unknown): SprintMetrics {
  if (!raw || typeof raw !== 'object') {
    return { totalPoints: 0, completedPoints: 0 }
  }
  const m = raw as Record<string, unknown>
  return {
    totalPoints: Number(m.total_points ?? 0),
    completedPoints: Number(m.completed_points ?? 0),
    storyCount: m.story_count != null ? Number(m.story_count) : undefined,
    storiesCompleted: m.stories_completed != null ? Number(m.stories_completed) : undefined,
    storiesCarried: m.stories_carried != null ? Number(m.stories_carried) : undefined,
    storiesByEpic: m.stories_by_epic != null && typeof m.stories_by_epic === 'object'
      ? Object.fromEntries(
          Object.entries(m.stories_by_epic as Record<string, unknown>).map(([k, v]) => [k, Number(v)])
        )
      : undefined,
  }
}

/**
 * Parse velocity-log.yaml into VelocityLog.
 * Returns null-safe defaults for missing sections.
 */
export function parseVelocityLog(yamlContent: string): VelocityLog {
  const raw = parse(yamlContent)

  const defaultAverages = {
    last3Sprints: 0,
    last5Sprints: 0,
    allTime: 0,
    trend: 'stable',
  }

  const defaultRecommendations = {
    conservative: 0,
    standard: 0,
    aggressive: 0,
  }

  if (!raw || typeof raw !== 'object') {
    return { sprints: [], averages: defaultAverages, recommendations: defaultRecommendations }
  }

  // Parse sprint velocity entries
  const sprints: VelocityEntry[] = Array.isArray(raw.sprints)
    ? raw.sprints.map((s: unknown) => {
        const entry = s as Record<string, unknown>
        return {
          sprintNumber: Number(entry.sprint_number ?? 0),
          plannedPoints: Number(entry.planned_points ?? 0),
          completedPoints: Number(entry.completed_points ?? 0),
          velocity: Number(entry.velocity ?? 0),
          storiesCompleted: Number(entry.stories_completed ?? 0),
          storiesCarried: Number(entry.stories_carried ?? 0),
          dateCompleted: String(entry.date_completed ?? ''),
          notes: entry.notes != null ? String(entry.notes) : undefined,
        }
      })
    : []

  // Parse averages
  const rawAvg = raw.averages && typeof raw.averages === 'object'
    ? raw.averages as Record<string, unknown>
    : {}
  const averages = {
    last3Sprints: Number(rawAvg.last_3_sprints ?? rawAvg.last3Sprints ?? 0),
    last5Sprints: Number(rawAvg.last_5_sprints ?? rawAvg.last5Sprints ?? 0),
    allTime: Number(rawAvg.all_time ?? rawAvg.allTime ?? 0),
    trend: String(rawAvg.trend ?? 'stable'),
  }

  // Parse recommendations
  const rawRec = raw.recommendations && typeof raw.recommendations === 'object'
    ? raw.recommendations as Record<string, unknown>
    : {}
  const recommendations = {
    conservative: Number(rawRec.conservative ?? 0),
    standard: Number(rawRec.standard ?? 0),
    aggressive: Number(rawRec.aggressive ?? 0),
  }

  return { sprints, averages, recommendations }
}

/**
 * Build a development status map from sprint data, matching the format
 * that parseSprintStatus returns (Record<string, StoryStatus>).
 *
 * For stories appearing in multiple sprints (carryover), uses the status
 * from the highest-numbered sprint.
 */
export function buildDevelopmentStatusFromSprints(
  sprints: SprintData[]
): Record<string, StoryStatus> {
  const statusMap: Record<string, StoryStatus> = {}

  // Sort sprints by sprintNumber ascending so higher-numbered sprints overwrite
  const sorted = [...sprints].sort((a, b) => a.sprintNumber - b.sprintNumber)

  for (const sprint of sorted) {
    const allStories = [...sprint.plannedStories, ...sprint.carryover]
    for (const story of allStories) {
      const normalized = normalizeStatus(story.status) ?? 'backlog'
      statusMap[story.key] = normalized
    }
  }

  return statusMap
}

/**
 * Get the default sprint number to select.
 * - Returns the active sprint's number if one exists
 * - Falls back to the highest sprint number if no active sprint
 * - Returns null if the sprints array is empty
 */
export function getDefaultSprintNumber(sprints: SprintData[]): number | null {
  if (sprints.length === 0) return null

  const active = sprints.find(s => s.status === 'active')
  if (active) return active.sprintNumber

  return Math.max(...sprints.map(s => s.sprintNumber))
}

/**
 * Determine if a directory listing represents a multi-sprint project.
 * Returns true if the files array contains at least one file matching `sprint-*.yaml`
 * (e.g., sprint-1.yaml, sprint-2.yaml). Does not match non-sprint files like
 * velocity-log.yaml or sprint-status.yaml.
 */
export function isMultiSprintFolder(files: string[]): boolean {
  return files.some(f => /^sprint-\d+\.yaml$/.test(f))
}
