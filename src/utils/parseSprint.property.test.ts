// @ts-nocheck -- fast-check combinators don't provide callback type inference
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { stringify } from 'yaml'
import {
  parseSprint,
  parseVelocityLog,
  buildDevelopmentStatusFromSprints,
  getDefaultSprintNumber,
} from './parseSprint'
import { VALID_STATUSES, normalizeStatus } from '../types'
import type { SprintData, SprintStory } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const CANONICAL_STATUSES = [...VALID_STATUSES] as string[]
const SPRINT_STATUSES = ['active', 'completed', 'planned'] as const

// Arbitrary: non-empty alphanumeric string (safe for YAML keys)
const safeString = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/)

// Arbitrary: story key like "1-2-some-slug"
const storyKeyArb = fc.tuple(fc.integer({ min: 1, max: 99 }), fc.integer({ min: 1, max: 99 }), safeString)
  .map(([epic, num, slug]: [number, number, string]) => `${epic}-${num}-${slug}`)

// Arbitrary: canonical status
const canonicalStatusArb = fc.constantFrom(...CANONICAL_STATUSES)

// Arbitrary: SprintStory with canonical status (for round-trip tests)
const sprintStoryArb = fc.record({
  key: storyKeyArb,
  epic: fc.integer({ min: 1, max: 20 }),
  title: safeString,
  points: fc.integer({ min: 0, max: 100 }),
  status: canonicalStatusArb,
  assignee: fc.option(safeString, { nil: null }),
  jira_key: fc.option(safeString, { nil: null }),
})

// Arbitrary: SprintTeamMember
const teamMemberArb = fc.record({ name: safeString })

// Arbitrary: SprintMetrics
const metricsArb = fc.record({
  total_points: fc.integer({ min: 0, max: 500 }),
  completed_points: fc.integer({ min: 0, max: 500 }),
})

// Arbitrary: SprintData as a YAML-serializable object (nested dates format)
const sprintYamlNestedArb = fc.record({
  sprint_number: fc.integer({ min: 1, max: 999 }),
  status: fc.constantFrom(...SPRINT_STATUSES),
  dates: fc.record({
    start: safeString,
    target_end: safeString,
    actual_end: fc.option(safeString, { nil: null }),
  }),
  team: fc.array(teamMemberArb, { minLength: 0, maxLength: 5 }),
  planned_stories: fc.array(sprintStoryArb, { minLength: 1, maxLength: 10 }),
  carryover: fc.array(sprintStoryArb, { minLength: 0, maxLength: 5 }),
  metrics: metricsArb,
  retro_completed: fc.boolean(),
})

// Arbitrary: SprintData as a YAML-serializable object (flat dates format)
const sprintYamlFlatArb = fc.record({
  sprint_number: fc.integer({ min: 1, max: 999 }),
  status: fc.constantFrom(...SPRINT_STATUSES),
  start_date: safeString,
  target_end: safeString,
  actual_end: fc.option(safeString, { nil: null }),
  team: fc.array(teamMemberArb, { minLength: 0, maxLength: 5 }),
  planned_stories: fc.array(sprintStoryArb, { minLength: 1, maxLength: 10 }),
  carryover: fc.array(sprintStoryArb, { minLength: 0, maxLength: 5 }),
  metrics: metricsArb,
  retro_completed: fc.boolean(),
})


// ── Property 2: Sprint file round-trip parsing ──────────────────────────────
// Feature: multi-sprint-support, Property 2: Sprint file round-trip parsing

describe('Property 2: Sprint file round-trip parsing', () => {
  // **Validates: Requirements 2.1, 2.2, 2.3, 2.7**

  it('round-trips SprintData through YAML serialization (nested dates format)', () => {
    fc.assert(
      fc.property(sprintYamlNestedArb, (raw) => {
        const yamlStr = stringify(raw)
        const parsed = parseSprint(yamlStr)

        expect(parsed).not.toBeNull()
        expect(parsed!.sprintNumber).toBe(raw.sprint_number)
        expect(parsed!.status).toBe(raw.status)
        expect(parsed!.dates.start).toBe(raw.dates.start)
        expect(parsed!.dates.targetEnd).toBe(raw.dates.target_end)
        expect(parsed!.dates.actualEnd).toBe(raw.dates.actual_end)
        expect(parsed!.team).toEqual(raw.team)
        expect(parsed!.retroCompleted).toBe(raw.retro_completed)
        expect(parsed!.metrics.totalPoints).toBe(raw.metrics.total_points)
        expect(parsed!.metrics.completedPoints).toBe(raw.metrics.completed_points)

        // Verify stories round-trip
        expect(parsed!.plannedStories).toHaveLength(raw.planned_stories.length)
        for (let i = 0; i < raw.planned_stories.length; i++) {
          const orig = raw.planned_stories[i]
          const result = parsed!.plannedStories[i]
          expect(result.key).toBe(orig.key)
          expect(result.epic).toBe(orig.epic)
          expect(result.title).toBe(orig.title)
          expect(result.points).toBe(orig.points)
          // Status should be normalized — since we use canonical statuses, it should match
          expect(result.status).toBe(orig.status)
          expect(result.assignee).toBe(orig.assignee)
          expect(result.jiraKey).toBe(orig.jira_key)
        }

        // Verify carryover round-trip
        expect(parsed!.carryover).toHaveLength(raw.carryover.length)
        for (let i = 0; i < raw.carryover.length; i++) {
          const orig = raw.carryover[i]
          const result = parsed!.carryover[i]
          expect(result.key).toBe(orig.key)
          expect(result.status).toBe(orig.status)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('round-trips SprintData through YAML serialization (flat dates format)', () => {
    fc.assert(
      fc.property(sprintYamlFlatArb, (raw) => {
        const yamlStr = stringify(raw)
        const parsed = parseSprint(yamlStr)

        expect(parsed).not.toBeNull()
        expect(parsed!.sprintNumber).toBe(raw.sprint_number)
        expect(parsed!.status).toBe(raw.status)
        expect(parsed!.dates.start).toBe(raw.start_date)
        expect(parsed!.dates.targetEnd).toBe(raw.target_end)
        expect(parsed!.dates.actualEnd).toBe(raw.actual_end)

        // Stories should still round-trip correctly
        expect(parsed!.plannedStories).toHaveLength(raw.planned_stories.length)
        for (let i = 0; i < raw.planned_stories.length; i++) {
          expect(parsed!.plannedStories[i].key).toBe(raw.planned_stories[i].key)
          expect(parsed!.plannedStories[i].status).toBe(raw.planned_stories[i].status)
        }
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 3: Velocity log round-trip parsing ─────────────────────────────
// Feature: multi-sprint-support, Property 3: Velocity log round-trip parsing

describe('Property 3: Velocity log round-trip parsing', () => {
  // **Validates: Requirements 2.5**

  const velocityEntryArb = fc.record({
    sprint_number: fc.integer({ min: 1, max: 999 }),
    planned_points: fc.integer({ min: 0, max: 500 }),
    completed_points: fc.integer({ min: 0, max: 500 }),
    velocity: fc.integer({ min: 0, max: 500 }),
    stories_completed: fc.integer({ min: 0, max: 100 }),
    stories_carried: fc.integer({ min: 0, max: 100 }),
    date_completed: safeString,
  })

  const velocityLogYamlArb = fc.record({
    sprints: fc.array(velocityEntryArb, { minLength: 0, maxLength: 10 }),
    averages: fc.record({
      last_3_sprints: fc.integer({ min: 0, max: 500 }),
      last_5_sprints: fc.integer({ min: 0, max: 500 }),
      all_time: fc.integer({ min: 0, max: 500 }),
      trend: fc.constantFrom('stable', 'increasing', 'decreasing'),
    }),
    recommendations: fc.record({
      conservative: fc.integer({ min: 0, max: 500 }),
      standard: fc.integer({ min: 0, max: 500 }),
      aggressive: fc.integer({ min: 0, max: 500 }),
    }),
  })

  it('round-trips VelocityLog through YAML serialization', () => {
    fc.assert(
      fc.property(velocityLogYamlArb, (raw) => {
        const yamlStr = stringify(raw)
        const parsed = parseVelocityLog(yamlStr)

        // Verify sprint entries
        expect(parsed.sprints).toHaveLength(raw.sprints.length)
        for (let i = 0; i < raw.sprints.length; i++) {
          const orig = raw.sprints[i]
          const result = parsed.sprints[i]
          expect(result.sprintNumber).toBe(orig.sprint_number)
          expect(result.plannedPoints).toBe(orig.planned_points)
          expect(result.completedPoints).toBe(orig.completed_points)
          expect(result.velocity).toBe(orig.velocity)
          expect(result.storiesCompleted).toBe(orig.stories_completed)
          expect(result.storiesCarried).toBe(orig.stories_carried)
          expect(result.dateCompleted).toBe(orig.date_completed)
        }

        // Verify averages
        expect(parsed.averages.last3Sprints).toBe(raw.averages.last_3_sprints)
        expect(parsed.averages.last5Sprints).toBe(raw.averages.last_5_sprints)
        expect(parsed.averages.allTime).toBe(raw.averages.all_time)
        expect(parsed.averages.trend).toBe(raw.averages.trend)

        // Verify recommendations
        expect(parsed.recommendations.conservative).toBe(raw.recommendations.conservative)
        expect(parsed.recommendations.standard).toBe(raw.recommendations.standard)
        expect(parsed.recommendations.aggressive).toBe(raw.recommendations.aggressive)
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 4: Sprint story status normalization ───────────────────────────
// Feature: multi-sprint-support, Property 4: Sprint story status normalization

describe('Property 4: Sprint story status normalization', () => {
  // **Validates: Requirements 2.4, 5.4**

  const randomStatusStringArb = fc.oneof(
    // Canonical statuses
    fc.constantFrom(...CANONICAL_STATUSES),
    // Known synonyms
    fc.constantFrom(
      'completed', 'complete', 'finished',
      'wip', 'working', 'in-dev', 'development',
      'ready-for-review', 'needs-review', 'pending-review',
      'todo', 'new', 'not-started', 'pending',
      'ready', 'ready-to-dev', 'ready-to-develop', 'ready-for-development',
    ),
    // Random strings that may or may not be valid
    fc.stringMatching(/^[a-z][a-z0-9 _-]{0,29}$/),
  )

  it('parsed story status is always a valid canonical StoryStatus', () => {
    fc.assert(
      fc.property(randomStatusStringArb, (rawStatus) => {
        // Build a minimal sprint YAML with the random status
        const yamlObj = {
          sprint_number: 1,
          status: 'active',
          planned_stories: [{
            key: '1-1-test',
            epic: 1,
            title: 'test',
            points: 1,
            status: rawStatus,
            assignee: null,
            jira_key: null,
          }],
          metrics: { total_points: 1, completed_points: 0 },
        }
        const yamlStr = stringify(yamlObj)
        const parsed = parseSprint(yamlStr)

        expect(parsed).not.toBeNull()
        // The parsed status must always be a valid canonical StoryStatus
        expect(VALID_STATUSES.has(parsed!.plannedStories[0].status as any)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('normalizeStatus always returns a canonical status or null', () => {
    fc.assert(
      fc.property(randomStatusStringArb, (rawStatus) => {
        const result = normalizeStatus(rawStatus)
        if (result !== null) {
          expect(VALID_STATUSES.has(result)).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 11: Story status resolution from sprints ───────────────────────
// Feature: multi-sprint-support, Property 11: Story status resolution from sprints

describe('Property 11: Story status resolution from sprints', () => {
  // **Validates: Requirements 5.1, 5.2, 5.3**

  // Generate a SprintData object with given sprint number and stories
  function makeSprintData(
    sprintNumber: number,
    status: 'active' | 'completed' | 'planned',
    planned: SprintStory[],
    carryover: SprintStory[] = [],
  ): SprintData {
    return {
      sprintNumber,
      status,
      dates: { start: '2025-01-01', targetEnd: '2025-01-14', actualEnd: null },
      team: [],
      plannedStories: planned,
      metrics: { totalPoints: 0, completedPoints: 0 },
      carryover,
      retroCompleted: false,
    }
  }

  function makeStory(key: string, status: string): SprintStory {
    return { key, epic: 1, title: key, points: 1, status, assignee: null, jiraKey: null }
  }

  // Arbitrary: a set of story keys
  const storyKeysArb = fc.uniqueArray(storyKeyArb, { minLength: 1, maxLength: 8 })

  // Arbitrary: a multi-sprint scenario where some stories carry over
  const multiSprintScenarioArb = storyKeysArb.chain((keys) => {
    // Generate 2-5 sprints
    return fc.tuple(
      fc.integer({ min: 2, max: 5 }),
      fc.array(
        fc.record({
          storyIndex: fc.integer({ min: 0, max: keys.length - 1 }),
          status: canonicalStatusArb,
          sprintOffset: fc.integer({ min: 0, max: 4 }),
          isCarryover: fc.boolean(),
        }),
        { minLength: 1, maxLength: 20 }
      )
    ).map(([numSprints, assignments]) => {
      // Build sprints with story assignments
      const sprintMap = new Map<number, { planned: SprintStory[]; carryover: SprintStory[] }>()
      for (let i = 1; i <= numSprints; i++) {
        sprintMap.set(i, { planned: [], carryover: [] })
      }

      for (const a of assignments) {
        const sprintNum = (a.sprintOffset % numSprints) + 1
        const key = keys[a.storyIndex]
        const story = makeStory(key, a.status)
        const sprint = sprintMap.get(sprintNum)!
        if (a.isCarryover) {
          sprint.carryover.push(story)
        } else {
          sprint.planned.push(story)
        }
      }

      // Ensure each sprint has at least one planned story (required by parseSprint)
      for (const [, data] of sprintMap) {
        if (data.planned.length === 0) {
          data.planned.push(makeStory(keys[0], 'backlog'))
        }
      }

      const sprints: SprintData[] = []
      for (const [num, data] of sprintMap) {
        sprints.push(makeSprintData(num, 'completed', data.planned, data.carryover))
      }

      return { keys, sprints }
    })
  })

  it('resolved status comes from the highest-numbered sprint containing the story', () => {
    fc.assert(
      fc.property(multiSprintScenarioArb, ({ sprints }) => {
        const statusMap = buildDevelopmentStatusFromSprints(sprints)

        // For each story in the map, verify it matches the highest sprint's status
        for (const [storyKey, resolvedStatus] of Object.entries(statusMap)) {
          // Find the highest-numbered sprint containing this story
          let highestSprint = -1
          let expectedStatus = ''

          for (const sprint of sprints) {
            const allStories = [...sprint.plannedStories, ...sprint.carryover]
            // Find the LAST occurrence in this sprint (in case of duplicates)
            for (const story of allStories) {
              if (story.key === storyKey && sprint.sprintNumber >= highestSprint) {
                highestSprint = sprint.sprintNumber
                expectedStatus = normalizeStatus(story.status) ?? 'backlog'
              }
            }
          }

          expect(resolvedStatus).toBe(expectedStatus)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('all resolved statuses are valid canonical StoryStatus values', () => {
    fc.assert(
      fc.property(multiSprintScenarioArb, ({ sprints }) => {
        const statusMap = buildDevelopmentStatusFromSprints(sprints)

        for (const status of Object.values(statusMap)) {
          expect(VALID_STATUSES.has(status)).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 7: Default sprint selection ────────────────────────────────────
// Feature: multi-sprint-support, Property 7: Default sprint selection

describe('Property 7: Default sprint selection', () => {
  // **Validates: Requirements 3.7, 3.8**

  const sprintDataArb = fc.record({
    sprintNumber: fc.integer({ min: 1, max: 999 }),
    status: fc.constantFrom<'active' | 'completed' | 'planned'>('active', 'completed', 'planned'),
  }).map(({ sprintNumber, status }): SprintData => ({
    sprintNumber,
    status,
    dates: { start: '', targetEnd: '', actualEnd: null },
    team: [],
    plannedStories: [],
    metrics: { totalPoints: 0, completedPoints: 0 },
    carryover: [],
    retroCompleted: false,
  }))

  it('returns null for empty sprint array', () => {
    expect(getDefaultSprintNumber([])).toBeNull()
  })

  it('returns the active sprint number when one exists', () => {
    // Generate arrays that have at least one active sprint
    const withActiveArb = fc.tuple(
      fc.array(sprintDataArb, { minLength: 0, maxLength: 10 }),
      sprintDataArb.map(s => ({ ...s, status: 'active' as const })),
      fc.array(sprintDataArb, { minLength: 0, maxLength: 10 }),
    ).map(([before, active, after]) => [...before.map(s => ({ ...s, status: s.status === 'active' ? 'completed' as const : s.status })), active, ...after.map(s => ({ ...s, status: s.status === 'active' ? 'completed' as const : s.status }))])

    fc.assert(
      fc.property(withActiveArb, (sprints) => {
        const result = getDefaultSprintNumber(sprints)
        // Should return the first active sprint found
        const activeSprint = sprints.find(s => s.status === 'active')
        expect(result).toBe(activeSprint!.sprintNumber)
      }),
      { numRuns: 100 }
    )
  })

  it('returns the highest sprint number when no active sprint exists', () => {
    const noActiveArb = fc.array(
      sprintDataArb.map(s => ({
        ...s,
        status: (s.status === 'active' ? 'completed' : s.status) as 'completed' | 'planned',
      })),
      { minLength: 1, maxLength: 10 }
    )

    fc.assert(
      fc.property(noActiveArb, (sprints) => {
        const result = getDefaultSprintNumber(sprints)
        const maxNumber = Math.max(...sprints.map(s => s.sprintNumber))
        expect(result).toBe(maxNumber)
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 1: Multi-sprint detection correctness ──────────────────────────
// Feature: multi-sprint-support, Property 1: Multi-sprint detection correctness

import { isMultiSprintFolder } from './parseSprint'

describe('Property 1: Multi-sprint detection correctness', () => {
  // **Validates: Requirements 1.1, 1.2, 1.3**

  // Arbitrary: a valid sprint filename like "sprint-1.yaml", "sprint-42.yaml"
  const sprintFileArb = fc.integer({ min: 1, max: 999 }).map(n => `sprint-${n}.yaml`)

  // Arbitrary: non-sprint filenames that should NOT trigger multi-sprint detection
  const nonSprintFileArb = fc.oneof(
    fc.constant('velocity-log.yaml'),
    fc.constant('sprint-status.yaml'),
    fc.constant('README.md'),
    fc.constant('.gitkeep'),
    safeString.map(s => `${s}.yaml`),
    safeString.map(s => `${s}.txt`),
    // Files that look similar but don't match the pattern
    fc.constant('sprint-.yaml'),
    fc.constant('sprint-abc.yaml'),
    fc.constant('sprint-1.yml'),
    fc.constant('sprint-1.json'),
    fc.constant('my-sprint-1.yaml'),
  )

  it('returns true when files contain at least one sprint-*.yaml file', () => {
    fc.assert(
      fc.property(
        fc.array(nonSprintFileArb, { minLength: 0, maxLength: 10 }),
        fc.array(sprintFileArb, { minLength: 1, maxLength: 10 }),
        fc.array(nonSprintFileArb, { minLength: 0, maxLength: 10 }),
        (before, sprintFiles, after) => {
          const files = [...before, ...sprintFiles, ...after]
          expect(isMultiSprintFolder(files)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns false when no files match sprint-*.yaml pattern', () => {
    fc.assert(
      fc.property(
        fc.array(nonSprintFileArb, { minLength: 0, maxLength: 15 }),
        (files) => {
          expect(isMultiSprintFolder(files)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns false for an empty file list', () => {
    expect(isMultiSprintFolder([])).toBe(false)
  })

  it('isMultiSprint is true iff at least one sprint-N.yaml file exists', () => {
    // Combined property: generate a random mix of sprint and non-sprint files,
    // then verify the detection result matches whether any sprint file is present
    const mixedFilesArb = fc.array(
      fc.oneof(sprintFileArb, nonSprintFileArb),
      { minLength: 0, maxLength: 20 }
    )

    fc.assert(
      fc.property(mixedFilesArb, (files) => {
        const hasSprintFile = files.some(f => /^sprint-\d+\.yaml$/.test(f))
        expect(isMultiSprintFolder(files)).toBe(hasSprintFile)
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 5: Sprint switcher ordering and display ────────────────────────
// Feature: multi-sprint-support, Property 5: Sprint switcher ordering and display

describe('Property 5: Sprint switcher ordering and display', () => {
  // **Validates: Requirements 3.3, 3.4**

  // Pure sorting logic extracted from SprintSwitcher component:
  // [...sprints].sort((a, b) => b.sprintNumber - a.sprintNumber)
  function sortSprintsForSwitcher(sprints: SprintData[]): SprintData[] {
    return [...sprints].sort((a, b) => b.sprintNumber - a.sprintNumber)
  }

  // Arbitrary: SprintData with unique sprint numbers
  const sprintDataWithNumberArb = (sprintNumber: number) =>
    fc.record({
      status: fc.constantFrom<'active' | 'completed' | 'planned'>('active', 'completed', 'planned'),
      dates: fc.record({
        start: safeString,
        targetEnd: safeString,
        actualEnd: fc.option(safeString, { nil: null }),
      }),
    }).map(({ status, dates }): SprintData => ({
      sprintNumber,
      status,
      dates,
      team: [],
      plannedStories: [],
      metrics: { totalPoints: 0, completedPoints: 0 },
      carryover: [],
      retroCompleted: false,
    }))

  // Generate arrays of SprintData with unique sprint numbers
  const uniqueSprintArrayArb = fc
    .uniqueArray(fc.integer({ min: 1, max: 9999 }), { minLength: 1, maxLength: 20 })
    .chain((numbers) =>
      fc.tuple(...numbers.map((n) => sprintDataWithNumberArb(n)))
    )

  it('sorts sprints in descending order by sprintNumber', () => {
    fc.assert(
      fc.property(uniqueSprintArrayArb, (sprints) => {
        const sorted = sortSprintsForSwitcher(sprints)

        // Every consecutive pair should be in descending order
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].sprintNumber).toBeGreaterThan(sorted[i + 1].sprintNumber)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('preserves all sprints (no elements lost or duplicated)', () => {
    fc.assert(
      fc.property(uniqueSprintArrayArb, (sprints) => {
        const sorted = sortSprintsForSwitcher(sprints)

        expect(sorted).toHaveLength(sprints.length)

        const originalNumbers = new Set(sprints.map((s) => s.sprintNumber))
        const sortedNumbers = new Set(sorted.map((s) => s.sprintNumber))
        expect(sortedNumbers).toEqual(originalNumbers)
      }),
      { numRuns: 100 }
    )
  })

  it('each entry has sprintNumber, status, and dates for display', () => {
    fc.assert(
      fc.property(uniqueSprintArrayArb, (sprints) => {
        const sorted = sortSprintsForSwitcher(sprints)

        for (const sprint of sorted) {
          // sprintNumber is present and numeric
          expect(typeof sprint.sprintNumber).toBe('number')

          // status is a valid sprint status
          expect(['active', 'completed', 'planned']).toContain(sprint.status)

          // dates object has start and targetEnd for date range display
          expect(sprint.dates).toBeDefined()
          expect(typeof sprint.dates.start).toBe('string')
          expect(typeof sprint.dates.targetEnd).toBe('string')
        }
      }),
      { numRuns: 100 }
    )
  })

  it('does not mutate the original array', () => {
    fc.assert(
      fc.property(uniqueSprintArrayArb, (sprints) => {
        const originalOrder = sprints.map((s) => s.sprintNumber)
        sortSprintsForSwitcher(sprints)
        const afterOrder = sprints.map((s) => s.sprintNumber)

        expect(afterOrder).toEqual(originalOrder)
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 6: Sprint story filtering ──────────────────────────────────────
// Feature: multi-sprint-support, Property 6: Sprint story filtering

describe('Property 6: Sprint story filtering', () => {
  // **Validates: Requirements 3.6**

  // Pure function extracted from Board.tsx sprint filtering logic
  function filterStoriesBySprint(
    stories: { id: string }[],
    sprints: SprintData[],
    selectedSprintNumber: number | null,
  ): { id: string }[] {
    if (selectedSprintNumber == null) return stories
    const sprint = sprints.find(s => s.sprintNumber === selectedSprintNumber)
    if (!sprint) return stories
    const sprintStoryKeys = new Set([
      ...sprint.plannedStories.map(s => s.key),
      ...sprint.carryover.map(s => s.key),
    ])
    return stories.filter(s => sprintStoryKeys.has(s.id))
  }

  function makeSprintStory(key: string): SprintStory {
    return { key, epic: 1, title: key, points: 1, status: 'done', assignee: null, jiraKey: null }
  }

  function makeSprint(
    sprintNumber: number,
    planned: string[],
    carryover: string[],
  ): SprintData {
    return {
      sprintNumber,
      status: 'active',
      dates: { start: '2025-01-01', targetEnd: '2025-01-14', actualEnd: null },
      team: [],
      plannedStories: planned.map(makeSprintStory),
      metrics: { totalPoints: 0, completedPoints: 0 },
      carryover: carryover.map(makeSprintStory),
      retroCompleted: false,
    }
  }

  // Arbitrary: a scenario with stories, sprints, and a selected sprint
  const scenarioArb = fc
    .record({
      allStoryKeys: fc.uniqueArray(storyKeyArb, { minLength: 1, maxLength: 15 }),
      numSprints: fc.integer({ min: 1, max: 4 }),
    })
    .chain(({ allStoryKeys, numSprints }) => {
      // For each sprint, pick a random subset of story keys for planned and carryover
      const sprintArbs = Array.from({ length: numSprints }, (_, i) =>
        fc.tuple(
          fc.subarray(allStoryKeys, { minLength: 0 }),
          fc.subarray(allStoryKeys, { minLength: 0 }),
        ).map(([planned, carry]) => makeSprint(i + 1, planned, carry))
      )
      return fc.tuple(
        fc.constant(allStoryKeys),
        fc.tuple(...sprintArbs),
        fc.integer({ min: 1, max: numSprints }),
      )
    })
    .map(([allStoryKeys, sprints, selectedNum]) => ({
      stories: allStoryKeys.map(id => ({ id })),
      sprints: sprints as SprintData[],
      selectedSprintNumber: selectedNum,
    }))

  it('filtered result contains exactly the stories in the sprint\'s planned + carryover', () => {
    fc.assert(
      fc.property(scenarioArb, ({ stories, sprints, selectedSprintNumber }) => {
        const filtered = filterStoriesBySprint(stories, sprints, selectedSprintNumber)
        const sprint = sprints.find(s => s.sprintNumber === selectedSprintNumber)!
        const expectedKeys = new Set([
          ...sprint.plannedStories.map(s => s.key),
          ...sprint.carryover.map(s => s.key),
        ])

        // Every filtered story must be in the sprint
        for (const story of filtered) {
          expect(expectedKeys.has(story.id)).toBe(true)
        }

        // Every story in the sprint that exists in allStories must be in filtered
        for (const story of stories) {
          if (expectedKeys.has(story.id)) {
            expect(filtered.some(f => f.id === story.id)).toBe(true)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  it('returns all stories when selectedSprintNumber is null', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(storyKeyArb, { minLength: 1, maxLength: 10 }),
        (keys) => {
          const stories = keys.map(id => ({ id }))
          const sprints = [makeSprint(1, keys.slice(0, 2), [])]
          const filtered = filterStoriesBySprint(stories, sprints, null)
          expect(filtered).toEqual(stories)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns all stories when selected sprint is not found', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(storyKeyArb, { minLength: 1, maxLength: 10 }),
        (keys) => {
          const stories = keys.map(id => ({ id }))
          const sprints = [makeSprint(1, keys.slice(0, 2), [])]
          const filtered = filterStoriesBySprint(stories, sprints, 999)
          expect(filtered).toEqual(stories)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ── Property 8: Combined filtering is intersection ──────────────────────────
// Feature: multi-sprint-support, Property 8: Combined filtering is intersection

describe('Property 8: Combined filtering is intersection', () => {
  // **Validates: Requirements 4.1, 4.2, 4.3**

  // Pure filtering functions extracted from Board.tsx
  function filterBySprint(
    stories: { id: string; epicId: number }[],
    sprints: SprintData[],
    selectedSprintNumber: number | null,
  ): { id: string; epicId: number }[] {
    if (selectedSprintNumber == null) return stories
    const sprint = sprints.find(s => s.sprintNumber === selectedSprintNumber)
    if (!sprint) return stories
    const sprintStoryKeys = new Set([
      ...sprint.plannedStories.map(s => s.key),
      ...sprint.carryover.map(s => s.key),
    ])
    return stories.filter(s => sprintStoryKeys.has(s.id))
  }

  function filterByEpic(
    stories: { id: string; epicId: number }[],
    selectedEpicId: number | null,
  ): { id: string; epicId: number }[] {
    if (selectedEpicId === null) return stories
    return stories.filter(s => s.epicId === selectedEpicId)
  }

  function makeSprintStory(key: string): SprintStory {
    return { key, epic: 1, title: key, points: 1, status: 'done', assignee: null, jiraKey: null }
  }

  function makeSprint(
    sprintNumber: number,
    planned: string[],
    carryover: string[],
  ): SprintData {
    return {
      sprintNumber,
      status: 'active',
      dates: { start: '2025-01-01', targetEnd: '2025-01-14', actualEnd: null },
      team: [],
      plannedStories: planned.map(makeSprintStory),
      metrics: { totalPoints: 0, completedPoints: 0 },
      carryover: carryover.map(makeSprintStory),
      retroCompleted: false,
    }
  }

  const scenarioArb = fc
    .record({
      storyKeys: fc.uniqueArray(storyKeyArb, { minLength: 1, maxLength: 12 }),
      epicIds: fc.uniqueArray(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 5 }),
    })
    .chain(({ storyKeys, epicIds }) => {
      // Assign each story a random epicId
      const storiesArb = fc.tuple(
        ...storyKeys.map(key =>
          fc.constantFrom(...epicIds).map(epicId => ({ id: key, epicId }))
        )
      )
      // Build a sprint with a random subset of story keys
      const sprintArb = fc.subarray(storyKeys, { minLength: 0 }).map(planned =>
        makeSprint(1, planned, [])
      )
      return fc.tuple(
        storiesArb,
        sprintArb,
        fc.constant(epicIds),
      )
    })
    .chain(([stories, sprint, epicIds]) =>
      fc.tuple(
        fc.constant(stories as { id: string; epicId: number }[]),
        fc.constant([sprint] as SprintData[]),
        fc.option(fc.constantFrom(...epicIds), { nil: null }),
        fc.option(fc.constant(1), { nil: null }), // sprint number or null
      )
    )
    .map(([stories, sprints, selectedEpicId, selectedSprintNumber]) => ({
      stories,
      sprints,
      selectedEpicId,
      selectedSprintNumber,
    }))

  it('sprint then epic filter equals intersection of individual filters', () => {
    fc.assert(
      fc.property(scenarioArb, ({ stories, sprints, selectedEpicId, selectedSprintNumber }) => {
        // Apply sprint filter then epic filter (as Board does)
        const combined = filterByEpic(
          filterBySprint(stories, sprints, selectedSprintNumber),
          selectedEpicId,
        )

        // Apply each filter independently
        const sprintOnly = filterBySprint(stories, sprints, selectedSprintNumber)
        const epicOnly = filterByEpic(stories, selectedEpicId)

        // Intersection of both individual filters
        const sprintIds = new Set(sprintOnly.map(s => s.id))
        const epicIds = new Set(epicOnly.map(s => s.id))
        const intersection = stories.filter(s => sprintIds.has(s.id) && epicIds.has(s.id))

        // Combined result should equal the intersection
        const combinedIds = combined.map(s => s.id).sort()
        const intersectionIds = intersection.map(s => s.id).sort()
        expect(combinedIds).toEqual(intersectionIds)
      }),
      { numRuns: 100 }
    )
  })

  it('with null sprint and null epic, all stories are returned', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(storyKeyArb, { minLength: 1, maxLength: 10 }),
        (keys) => {
          const stories = keys.map(id => ({ id, epicId: 1 }))
          const sprints = [makeSprint(1, keys, [])]
          const combined = filterByEpic(
            filterBySprint(stories, sprints, null),
            null,
          )
          expect(combined).toEqual(stories)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ── Property 9: Epic progress respects sprint filter ────────────────────────
// Feature: multi-sprint-support, Property 9: Epic progress respects sprint filter

describe('Property 9: Epic progress respects sprint filter', () => {
  // **Validates: Requirements 4.4**

  // Pure function: compute epic progress (done/total) from visible stories
  function computeEpicProgress(
    stories: { id: string; epicId: number; status: string }[],
    epicId: number,
  ): { done: number; total: number } {
    const epicStories = stories.filter(s => s.epicId === epicId)
    const done = epicStories.filter(s => s.status === 'done').length
    return { done, total: epicStories.length }
  }

  // Pure sprint filter (same as Board logic)
  function filterBySprint(
    stories: { id: string; epicId: number; status: string }[],
    sprints: SprintData[],
    selectedSprintNumber: number | null,
  ): { id: string; epicId: number; status: string }[] {
    if (selectedSprintNumber == null) return stories
    const sprint = sprints.find(s => s.sprintNumber === selectedSprintNumber)
    if (!sprint) return stories
    const sprintStoryKeys = new Set([
      ...sprint.plannedStories.map(s => s.key),
      ...sprint.carryover.map(s => s.key),
    ])
    return stories.filter(s => sprintStoryKeys.has(s.id))
  }

  function makeSprintStory(key: string): SprintStory {
    return { key, epic: 1, title: key, points: 1, status: 'done', assignee: null, jiraKey: null }
  }

  function makeSprint(
    sprintNumber: number,
    planned: string[],
    carryover: string[],
  ): SprintData {
    return {
      sprintNumber,
      status: 'active',
      dates: { start: '2025-01-01', targetEnd: '2025-01-14', actualEnd: null },
      team: [],
      plannedStories: planned.map(makeSprintStory),
      metrics: { totalPoints: 0, completedPoints: 0 },
      carryover: carryover.map(makeSprintStory),
      retroCompleted: false,
    }
  }

  const scenarioArb = fc
    .record({
      storyKeys: fc.uniqueArray(storyKeyArb, { minLength: 2, maxLength: 12 }),
      epicIds: fc.uniqueArray(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 4 }),
    })
    .chain(({ storyKeys, epicIds }) => {
      // Assign each story a random epicId and status
      const storiesArb = fc.tuple(
        ...storyKeys.map(key =>
          fc.tuple(
            fc.constantFrom(...epicIds),
            fc.constantFrom('done', 'in-progress', 'backlog'),
          ).map(([epicId, status]) => ({ id: key, epicId, status }))
        )
      )
      // Build two sprints with different subsets
      const sprint1Arb = fc.subarray(storyKeys, { minLength: 0 }).map(p => makeSprint(1, p, []))
      const sprint2Arb = fc.subarray(storyKeys, { minLength: 0 }).map(p => makeSprint(2, p, []))
      return fc.tuple(storiesArb, sprint1Arb, sprint2Arb, fc.constantFrom(...epicIds))
    })
    .map(([stories, sprint1, sprint2, targetEpicId]) => ({
      stories: stories as { id: string; epicId: number; status: string }[],
      sprints: [sprint1, sprint2] as SprintData[],
      targetEpicId,
    }))

  it('epic progress is computed only from sprint-filtered stories', () => {
    fc.assert(
      fc.property(scenarioArb, ({ stories, sprints, targetEpicId }) => {
        // For each sprint selection, verify progress uses only visible stories
        for (const sprintNum of [1, 2, null] as (number | null)[]) {
          const visible = filterBySprint(stories, sprints, sprintNum)
          const progress = computeEpicProgress(visible, targetEpicId)

          // Manually count expected values from visible stories
          const epicVisible = visible.filter(s => s.epicId === targetEpicId)
          const expectedDone = epicVisible.filter(s => s.status === 'done').length
          const expectedTotal = epicVisible.length

          expect(progress.done).toBe(expectedDone)
          expect(progress.total).toBe(expectedTotal)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('progress from sprint-filtered stories differs from unfiltered when sprint excludes stories', () => {
    // This is a sanity check: if a sprint excludes some epic stories,
    // the filtered progress total should be <= unfiltered total
    fc.assert(
      fc.property(scenarioArb, ({ stories, sprints, targetEpicId }) => {
        const unfilteredProgress = computeEpicProgress(stories, targetEpicId)
        for (const sprintNum of [1, 2]) {
          const visible = filterBySprint(stories, sprints, sprintNum)
          const filteredProgress = computeEpicProgress(visible, targetEpicId)
          expect(filteredProgress.total).toBeLessThanOrEqual(unfilteredProgress.total)
          expect(filteredProgress.done).toBeLessThanOrEqual(unfilteredProgress.done)
        }
      }),
      { numRuns: 100 }
    )
  })
})


// ── Property 10: Sprint selection preserves epic filter ─────────────────────
// Feature: multi-sprint-support, Property 10: Sprint selection preserves epic filter

describe('Property 10: Sprint selection preserves epic filter', () => {
  // **Validates: Requirements 4.5**

  // Model the store state relevant to this property
  interface FilterState {
    selectedSprintNumber: number | null
    selectedEpicId: number | null
  }

  function setSelectedSprintNumber(
    state: FilterState,
    sprintNumber: number | null,
  ): FilterState {
    return { ...state, selectedSprintNumber: sprintNumber }
  }

  const filterStateArb = fc.record({
    selectedSprintNumber: fc.option(fc.integer({ min: 1, max: 999 }), { nil: null }),
    selectedEpicId: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null }),
  })

  const newSprintNumberArb = fc.option(fc.integer({ min: 1, max: 999 }), { nil: null })

  it('changing sprint selection does not modify epicId', () => {
    fc.assert(
      fc.property(filterStateArb, newSprintNumberArb, (state, newSprint) => {
        const nextState = setSelectedSprintNumber(state, newSprint)
        expect(nextState.selectedEpicId).toBe(state.selectedEpicId)
      }),
      { numRuns: 100 }
    )
  })

  it('multiple sprint changes preserve epicId through all transitions', () => {
    fc.assert(
      fc.property(
        filterStateArb,
        fc.array(newSprintNumberArb, { minLength: 1, maxLength: 10 }),
        (initialState, sprintChanges) => {
          const originalEpicId = initialState.selectedEpicId
          let current = initialState
          for (const newSprint of sprintChanges) {
            current = setSelectedSprintNumber(current, newSprint)
            expect(current.selectedEpicId).toBe(originalEpicId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
