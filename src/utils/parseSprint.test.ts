import { describe, it, expect } from 'vitest'
import {
  parseSprint,
  parseVelocityLog,
  buildDevelopmentStatusFromSprints,
  getDefaultSprintNumber,
} from './parseSprint'
import type { SprintData } from '../types'

describe('parseSprint', () => {
  it('parses nested date format', () => {
    const yaml = `
sprint_number: 3
status: active
dates:
  start: "2025-01-01"
  target_end: "2025-01-14"
  actual_end: null
team:
  - name: Alice
planned_stories:
  - key: "1-1-setup"
    epic: 1
    title: Setup
    points: 3
    status: in-progress
    assignee: Alice
    jira_key: null
metrics:
  total_points: 3
  completed_points: 0
`
    const result = parseSprint(yaml)
    expect(result).not.toBeNull()
    expect(result!.sprintNumber).toBe(3)
    expect(result!.status).toBe('active')
    expect(result!.dates.start).toBe('2025-01-01')
    expect(result!.dates.targetEnd).toBe('2025-01-14')
    expect(result!.dates.actualEnd).toBeNull()
    expect(result!.team).toEqual([{ name: 'Alice' }])
    expect(result!.plannedStories).toHaveLength(1)
    expect(result!.plannedStories[0].key).toBe('1-1-setup')
    expect(result!.plannedStories[0].status).toBe('in-progress')
  })

  it('parses legacy flat date format', () => {
    const yaml = `
sprint_number: 1
status: completed
start_date: "2024-12-01"
target_end: "2024-12-14"
actual_end: "2024-12-15"
planned_stories:
  - key: "2-1-auth"
    epic: 2
    title: Auth
    points: 5
    status: done
    assignee: null
    jira_key: null
metrics:
  total_points: 5
  completed_points: 5
`
    const result = parseSprint(yaml)
    expect(result).not.toBeNull()
    expect(result!.sprintNumber).toBe(1)
    expect(result!.status).toBe('completed')
    expect(result!.dates.start).toBe('2024-12-01')
    expect(result!.dates.targetEnd).toBe('2024-12-14')
    expect(result!.dates.actualEnd).toBe('2024-12-15')
    expect(result!.plannedStories[0].status).toBe('done')
  })

  it('returns null for missing sprint_number', () => {
    const yaml = `
planned_stories:
  - key: "1-1-x"
    epic: 1
    title: X
    points: 1
    status: backlog
`
    expect(parseSprint(yaml)).toBeNull()
  })

  it('returns null for missing planned_stories', () => {
    const yaml = `
sprint_number: 1
status: active
`
    expect(parseSprint(yaml)).toBeNull()
  })

  it('normalizes story statuses', () => {
    const yaml = `
sprint_number: 2
status: active
planned_stories:
  - key: "1-1-a"
    epic: 1
    title: A
    points: 1
    status: completed
  - key: "1-2-b"
    epic: 1
    title: B
    points: 2
    status: wip
metrics:
  total_points: 3
  completed_points: 1
`
    const result = parseSprint(yaml)!
    expect(result.plannedStories[0].status).toBe('done')
    expect(result.plannedStories[1].status).toBe('in-progress')
  })

  it('parses carryover stories', () => {
    const yaml = `
sprint_number: 4
status: active
planned_stories:
  - key: "1-1-new"
    epic: 1
    title: New
    points: 3
    status: in-progress
carryover:
  - key: "1-2-old"
    epic: 1
    title: Old
    points: 2
    status: review
metrics:
  total_points: 5
  completed_points: 0
`
    const result = parseSprint(yaml)!
    expect(result.carryover).toHaveLength(1)
    expect(result.carryover[0].key).toBe('1-2-old')
    expect(result.carryover[0].status).toBe('review')
  })

  it('handles team as string array', () => {
    const yaml = `
sprint_number: 1
status: planned
planned_stories:
  - key: "1-1-x"
    epic: 1
    title: X
    points: 1
    status: backlog
team:
  - Bob
  - Carol
`
    const result = parseSprint(yaml)!
    expect(result.team).toEqual([{ name: 'Bob' }, { name: 'Carol' }])
  })
})

describe('parseVelocityLog', () => {
  it('parses a complete velocity log', () => {
    const yaml = `
sprints:
  - sprint_number: 1
    planned_points: 20
    completed_points: 18
    velocity: 18
    stories_completed: 5
    stories_carried: 1
    date_completed: "2025-01-14"
    notes: "Good sprint"
  - sprint_number: 2
    planned_points: 22
    completed_points: 20
    velocity: 20
    stories_completed: 6
    stories_carried: 0
    date_completed: "2025-01-28"
averages:
  last_3_sprints: 19
  last_5_sprints: 18
  all_time: 19
  trend: increasing
recommendations:
  conservative: 16
  standard: 19
  aggressive: 22
`
    const result = parseVelocityLog(yaml)
    expect(result.sprints).toHaveLength(2)
    expect(result.sprints[0].sprintNumber).toBe(1)
    expect(result.sprints[0].notes).toBe('Good sprint')
    expect(result.sprints[1].notes).toBeUndefined()
    expect(result.averages.last3Sprints).toBe(19)
    expect(result.averages.last5Sprints).toBe(18)
    expect(result.averages.allTime).toBe(19)
    expect(result.averages.trend).toBe('increasing')
    expect(result.recommendations.conservative).toBe(16)
    expect(result.recommendations.standard).toBe(19)
    expect(result.recommendations.aggressive).toBe(22)
  })

  it('returns defaults for empty/invalid content', () => {
    const result = parseVelocityLog('')
    expect(result.sprints).toEqual([])
    expect(result.averages.last3Sprints).toBe(0)
    expect(result.averages.trend).toBe('stable')
    expect(result.recommendations.conservative).toBe(0)
  })

  it('returns defaults for missing sections', () => {
    const yaml = `
sprints:
  - sprint_number: 1
    planned_points: 10
    completed_points: 8
    velocity: 8
    stories_completed: 3
    stories_carried: 0
    date_completed: "2025-01-14"
`
    const result = parseVelocityLog(yaml)
    expect(result.sprints).toHaveLength(1)
    expect(result.averages.last3Sprints).toBe(0)
    expect(result.recommendations.standard).toBe(0)
  })
})

describe('buildDevelopmentStatusFromSprints', () => {
  it('builds status map from single sprint', () => {
    const sprints: SprintData[] = [{
      sprintNumber: 1,
      status: 'active',
      dates: { start: '2025-01-01', targetEnd: '2025-01-14', actualEnd: null },
      team: [],
      plannedStories: [
        { key: '1-1-setup', epic: 1, title: 'Setup', points: 3, status: 'in-progress', assignee: null, jiraKey: null },
        { key: '1-2-auth', epic: 1, title: 'Auth', points: 5, status: 'done', assignee: null, jiraKey: null },
      ],
      metrics: { totalPoints: 8, completedPoints: 5 },
      carryover: [],
      retroCompleted: false,
    }]

    const result = buildDevelopmentStatusFromSprints(sprints)
    expect(result['1-1-setup']).toBe('in-progress')
    expect(result['1-2-auth']).toBe('done')
  })

  it('uses highest sprint number for carryover stories', () => {
    const sprints: SprintData[] = [
      {
        sprintNumber: 2,
        status: 'active',
        dates: { start: '2025-01-15', targetEnd: '2025-01-28', actualEnd: null },
        team: [],
        plannedStories: [
          { key: '1-1-setup', epic: 1, title: 'Setup', points: 3, status: 'done', assignee: null, jiraKey: null },
        ],
        metrics: { totalPoints: 3, completedPoints: 3 },
        carryover: [
          { key: '1-2-auth', epic: 1, title: 'Auth', points: 5, status: 'review', assignee: null, jiraKey: null },
        ],
        retroCompleted: false,
      },
      {
        sprintNumber: 1,
        status: 'completed',
        dates: { start: '2025-01-01', targetEnd: '2025-01-14', actualEnd: '2025-01-14' },
        team: [],
        plannedStories: [
          { key: '1-2-auth', epic: 1, title: 'Auth', points: 5, status: 'in-progress', assignee: null, jiraKey: null },
        ],
        metrics: { totalPoints: 5, completedPoints: 0 },
        carryover: [],
        retroCompleted: true,
      },
    ]

    const result = buildDevelopmentStatusFromSprints(sprints)
    // Sprint 2 (higher) should win for 1-2-auth
    expect(result['1-2-auth']).toBe('review')
    expect(result['1-1-setup']).toBe('done')
  })

  it('returns empty map for empty sprints', () => {
    expect(buildDevelopmentStatusFromSprints([])).toEqual({})
  })
})

describe('getDefaultSprintNumber', () => {
  it('returns null for empty array', () => {
    expect(getDefaultSprintNumber([])).toBeNull()
  })

  it('returns active sprint number', () => {
    const sprints: SprintData[] = [
      { sprintNumber: 1, status: 'completed', dates: { start: '', targetEnd: '', actualEnd: null }, team: [], plannedStories: [], metrics: { totalPoints: 0, completedPoints: 0 }, carryover: [], retroCompleted: false },
      { sprintNumber: 2, status: 'active', dates: { start: '', targetEnd: '', actualEnd: null }, team: [], plannedStories: [], metrics: { totalPoints: 0, completedPoints: 0 }, carryover: [], retroCompleted: false },
      { sprintNumber: 3, status: 'planned', dates: { start: '', targetEnd: '', actualEnd: null }, team: [], plannedStories: [], metrics: { totalPoints: 0, completedPoints: 0 }, carryover: [], retroCompleted: false },
    ]
    expect(getDefaultSprintNumber(sprints)).toBe(2)
  })

  it('falls back to highest sprint number when no active sprint', () => {
    const sprints: SprintData[] = [
      { sprintNumber: 1, status: 'completed', dates: { start: '', targetEnd: '', actualEnd: null }, team: [], plannedStories: [], metrics: { totalPoints: 0, completedPoints: 0 }, carryover: [], retroCompleted: false },
      { sprintNumber: 3, status: 'completed', dates: { start: '', targetEnd: '', actualEnd: null }, team: [], plannedStories: [], metrics: { totalPoints: 0, completedPoints: 0 }, carryover: [], retroCompleted: false },
      { sprintNumber: 2, status: 'completed', dates: { start: '', targetEnd: '', actualEnd: null }, team: [], plannedStories: [], metrics: { totalPoints: 0, completedPoints: 0 }, carryover: [], retroCompleted: false },
    ]
    expect(getDefaultSprintNumber(sprints)).toBe(3)
  })
})
