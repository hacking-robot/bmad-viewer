import { parse } from 'yaml'
import { StoryStatus, normalizeStatus } from '../types'

export interface SprintStatusData {
  generated: string
  project: string
  projectKey: string
  trackingSystem: string
  storyLocation: string
  developmentStatus: Record<string, StoryStatus>
}

export function parseSprintStatus(yamlContent: string): SprintStatusData {
  const parsed = parse(yamlContent)

  const developmentStatus: Record<string, StoryStatus> = {}

  if (parsed.development_status) {
    for (const [key, value] of Object.entries(parsed.development_status)) {
      // Normalize statuses - unrecognized values default to 'backlog'
      developmentStatus[key] = normalizeStatus(value as string) ?? 'backlog'
    }
  }

  return {
    generated: parsed.generated || '',
    project: parsed.project || '',
    projectKey: parsed.project_key || '',
    trackingSystem: parsed.tracking_system || '',
    storyLocation: parsed.story_location || '',
    developmentStatus
  }
}

export function getStoryStatus(
  sprintStatus: SprintStatusData,
  storyKey: string
): StoryStatus {
  // First try exact match
  if (sprintStatus.developmentStatus[storyKey]) {
    return sprintStatus.developmentStatus[storyKey]
  }

  // If no exact match, try prefix matching (epic-storyNumber-*)
  // This handles cases where the slug in sprint-status.yaml differs from auto-generated slug
  // Extract prefix like "1-f1-" from "1-f1-update-libtypests-for-schema-first-pattern"
  const prefixMatch = storyKey.match(/^(\d+-[a-z\d]+-)/)
  if (prefixMatch) {
    const prefix = prefixMatch[1]
    const matchingKey = Object.keys(sprintStatus.developmentStatus).find(key =>
      key.startsWith(prefix) && !key.startsWith('epic-')
    )
    if (matchingKey) {
      return sprintStatus.developmentStatus[matchingKey]
    }
  }

  return 'backlog'
}

export function getEpicStatus(
  sprintStatus: SprintStatusData,
  epicNumber: number
): StoryStatus {
  return sprintStatus.developmentStatus[`epic-${epicNumber}`] || 'backlog'
}
