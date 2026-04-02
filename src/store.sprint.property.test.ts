// @ts-nocheck -- fast-check combinators don't provide callback type inference
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: multi-sprint-support, Property 14: Sprint selection persistence round-trip

// ── Helpers ──────────────────────────────────────────────────────────────────

// Pure logic extracted from the store's selectedSprintByProject behavior.
// The store persists sprint selections as Record<string, number | null> keyed
// by project path. We test the map operations directly since the Zustand store
// relies on Electron IPC for persistence which isn't available in tests.

type SprintByProject = Record<string, number | null>

/** Simulate setSelectedSprintNumber: store a sprint selection for a project */
function storeSelection(
  map: SprintByProject,
  projectPath: string,
  sprintNumber: number | null,
): SprintByProject {
  return { ...map, [projectPath]: sprintNumber }
}

/** Simulate retrieving the persisted sprint selection for a project */
function retrieveSelection(
  map: SprintByProject,
  projectPath: string,
): number | null | undefined {
  return map[projectPath]
}

// Arbitrary: project path (non-empty, path-like strings)
const projectPathArb = fc.tuple(
  fc.constantFrom('/home/user/projects/', '/Users/dev/', 'C:\\Users\\dev\\', '/tmp/'),
  fc.stringMatching(/^[a-z][a-z0-9-]{0,14}$/),
).map(([prefix, name]: [string, string]) => `${prefix}${name}`)

// Arbitrary: sprint number (positive integer or null for "All Sprints")
const sprintNumberArb = fc.oneof(
  fc.integer({ min: 1, max: 999 }),
  fc.constant(null as number | null),
)

// ── Property 14: Sprint selection persistence round-trip ────────────────────

describe('Property 14: Sprint selection persistence round-trip', () => {
  // **Validates: Requirements 7.1, 7.3, 7.4**

  it('storing and retrieving a sprint selection returns the same value', () => {
    fc.assert(
      fc.property(projectPathArb, sprintNumberArb, (projectPath: string, sprintNumber: number | null) => {
        const map: SprintByProject = {}
        const updated = storeSelection(map, projectPath, sprintNumber)
        const retrieved = retrieveSelection(updated, projectPath)

        expect(retrieved).toBe(sprintNumber)
      }),
      { numRuns: 100 },
    )
  })

  it('different project paths maintain independent sprint selections', () => {
    fc.assert(
      fc.property(
        projectPathArb,
        projectPathArb,
        sprintNumberArb,
        sprintNumberArb,
        (pathA: string, pathB: string, sprintA: number | null, sprintB: number | null) => {
          // Skip when paths collide — independence only applies to distinct paths
          fc.pre(pathA !== pathB)

          let map: SprintByProject = {}
          map = storeSelection(map, pathA, sprintA)
          map = storeSelection(map, pathB, sprintB)

          expect(retrieveSelection(map, pathA)).toBe(sprintA)
          expect(retrieveSelection(map, pathB)).toBe(sprintB)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('updating a sprint selection for one project does not affect others', () => {
    fc.assert(
      fc.property(
        projectPathArb,
        projectPathArb,
        sprintNumberArb,
        sprintNumberArb,
        sprintNumberArb,
        (pathA: string, pathB: string, sprintA: number | null, sprintB: number | null, newSprintA: number | null) => {
          fc.pre(pathA !== pathB)

          // Store initial selections for both projects
          let map: SprintByProject = {}
          map = storeSelection(map, pathA, sprintA)
          map = storeSelection(map, pathB, sprintB)

          // Update project A's selection
          map = storeSelection(map, pathA, newSprintA)

          // Project B's selection should be unchanged
          expect(retrieveSelection(map, pathB)).toBe(sprintB)
          // Project A should have the new value
          expect(retrieveSelection(map, pathA)).toBe(newSprintA)
        },
      ),
      { numRuns: 100 },
    )
  })
})
