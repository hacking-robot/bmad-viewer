import { Epic, Story } from '../types'
import type { SprintStatusData } from './parseSprintStatus'
import { getStoryStatus, getEpicStatus } from './parseSprintStatus'

/**
 * Classify a list of requirement references into FR, NFR, and ARCH buckets.
 * Handles formats like: "FR1", "FR-1", "FR-001", "NFR2", "ARCH3", "AR1", "FR4 (partial)", etc.
 */
function classifyRequirements(refs: string[]): { frs: string[]; nfrs: string[]; arch: string[]; ar: string[] } {
  const frs: string[] = []
  const nfrs: string[] = []
  const arch: string[] = []
  const ar: string[] = []
  for (const ref of refs) {
    const trimmed = ref.trim()
    if (!trimmed) continue
    if (/^NFR[-]?\d/i.test(trimmed)) nfrs.push(trimmed)
    else if (/^ARCH[-]?\d/i.test(trimmed)) arch.push(trimmed)
    else if (/^AR[-]?\d/i.test(trimmed)) ar.push(trimmed)
    else if (/^FR[-]?\d/i.test(trimmed)) frs.push(trimmed)
    // Also handle "All NFRs" or similar
    else if (/\bNFR/i.test(trimmed)) nfrs.push(trimmed)
    else if (/\bARCH/i.test(trimmed)) arch.push(trimmed)
    else if (/\bAR/i.test(trimmed)) ar.push(trimmed)
    else frs.push(trimmed) // Default to FR for backward compat
  }
  return { frs, nfrs, arch, ar }
}

/**
 * Parse comma-separated requirement refs from a line, handling parenthetical notes.
 * e.g. "FR1, FR2, FR3, FR4 (partial)" → ["FR1", "FR2", "FR3", "FR4 (partial)"]
 */
function parseRequirementRefs(text: string): string[] {
  return text.split(/,/)
    .map(item => item.trim())
    .filter(Boolean)
}

interface ParsedStory {
  title: string
  storyNumber: number | string
  description: string // User story from epics.md (As a... I want... So that...)
  acceptanceCriteriaPreview?: string[]  // All AC items from epics.md
  technicalNotes?: string               // Technical Notes section
  frsAddressed?: string[]               // FRs addressed list
  nfrsAddressed?: string[]              // NFRs addressed list
  archAddressed?: string[]              // Architecture requirements addressed list
  arAddressed?: string[]                // AR (Additional Requirements) addressed list
  explicitKey?: string                  // Explicit key from epics.md (key: field)
  points?: number                       // Story points estimation
}

interface ParsedEpic {
  id: number
  name: string
  goal: string
  stories: ParsedStory[]
  frsCovered?: string[]    // Epic-level FRs covered
  nfrsCovered?: string[]   // Epic-level NFRs covered
  archCovered?: string[]   // Epic-level ARCH requirements covered
  arCovered?: string[]     // Epic-level AR (Additional Requirements) covered
}

export function parseBmmEpics(
  markdownContent: string,
  sprintStatus: SprintStatusData
): Epic[] {
  const lines = markdownContent.split('\n')
  const epics: ParsedEpic[] = []
  let currentEpic: ParsedEpic | null = null
  let currentStory: ParsedStory | null = null
  let storyDescriptionLines: string[] = []
  let inStoriesSection = false
  let numberedStoryCount = 0

  const finishCurrentStory = () => {
    if (currentStory && currentEpic) {
      const fullText = storyDescriptionLines.join('\n')

      // Extract explicit key if present (key: 2-9-workflow-context-resolution)
      const keyMatch = fullText.match(/^key:\s*(.+?)\s*$/m)
      if (keyMatch) {
        currentStory.explicitKey = keyMatch[1].trim()
      }

      // Extract story points if present (points: 3 or points: 5)
      const pointsMatch = fullText.match(/^points:\s*(\d+(?:\.\d+)?)\s*$/m)
      if (pointsMatch) {
        currentStory.points = parseFloat(pointsMatch[1])
      }

      // Remove metadata lines (key, points, status, jira_key) from the beginning
      const textWithoutMetadata = fullText
        .replace(/^(key|points|status|jira_key):\s*.*\n?/gm, '')
        .trim()

      // Extract the user story description (before any section headers)
      // Use \s+ instead of literal space to handle non-breaking spaces from AI tools
      const description = textWithoutMetadata
        .split(/\*\*Acceptance\s+Criteria:?\*\*/i)[0]
        .split(/\*\*Technical\s+Notes:?\*\*/i)[0]
        .split(/\*\*FRs\s+addressed:?\*\*/i)[0]
        .split(/\*\*Architecture\s+requirements?:?\*\*/i)[0]
        .trim()
      currentStory.description = description

      // Extract Acceptance Criteria section
      const acMatch = fullText.match(/\*\*Acceptance\s+Criteria:?\*\*\s*([\s\S]*?)(?=\*\*Testing\s+Acceptance\s+Criteria:?\*\*|\*\*Technical\s+Notes:?\*\*|\*\*FRs\s+addressed:?\*\*|\*\*Architecture\s+requirements?:?\*\*|$)/i)
      if (acMatch) {
        const acText = acMatch[1].trim()
        const acLines = acText.split('\n').map(line => line.trim()).filter(Boolean)

        // Detect BDD format (Given/When/Then)
        const hasBDD = acLines.some(line => /^\*\*(Given|When|Then|And)\*\*/.test(line))

        let acItems: string[]
        if (hasBDD) {
          // Parse BDD: group each **Given** block as one AC item, preserving markdown
          const blocks: string[] = []
          let current: string[] = []
          for (const line of acLines) {
            if (/^\*\*Given\*\*/.test(line)) {
              if (current.length > 0) blocks.push(current.join('\n'))
              current = [line]
            } else if (/^\*\*(When|Then|And)\*\*/.test(line)) {
              current.push(line)
            } else if (line.startsWith('- ')) {
              current.push(line)
            } else {
              current.push(line)
            }
          }
          if (current.length > 0) blocks.push(current.join('\n'))
          acItems = blocks
        } else {
          // Parse bullet points (lines starting with - or * but not ** bold)
          acItems = acLines
            .filter(line => line.startsWith('- ') || (line.startsWith('* ') && !line.startsWith('**')))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(Boolean)
        }

        if (acItems.length > 0) {
          currentStory.acceptanceCriteriaPreview = acItems
        }
      }

      // Extract Technical Notes section
      const techMatch = fullText.match(/\*\*Technical\s+Notes:?\*\*\s*([\s\S]*?)(?=\*\*Acceptance\s+Criteria:?\*\*|\*\*FRs\s+addressed:?\*\*|\*\*Architecture\s+requirements?:?\*\*|$)/i)
      if (techMatch) {
        const techText = techMatch[1].trim()
        if (techText) {
          currentStory.technicalNotes = techText
        }
      }

      // Extract FRs addressed section (stop at next **Header:** or blank line)
      const frsMatch = fullText.match(/\*\*FRs\s+addressed:?\*\*\s*([^\n]+)/i)
      if (frsMatch) {
        // Parse comma-separated refs and classify into FR/NFR/ARCH
        const allRefs = parseRequirementRefs(frsMatch[1])
        const classified = classifyRequirements(allRefs)
        if (classified.frs.length > 0) currentStory.frsAddressed = classified.frs
        if (classified.nfrs.length > 0) currentStory.nfrsAddressed = classified.nfrs
        if (classified.arch.length > 0) currentStory.archAddressed = classified.arch
        if (classified.ar.length > 0) currentStory.arAddressed = classified.ar
      }

      // Extract Architecture requirements section (separate from FRs addressed)
      const archMatch = fullText.match(/\*\*Architecture\s+requirements?:?\*\*\s*([^\n]+)/i)
      if (archMatch) {
        const archRefs = parseRequirementRefs(archMatch[1])
        const classified = classifyRequirements(archRefs)
        if (classified.arch.length > 0) {
          currentStory.archAddressed = [...(currentStory.archAddressed || []), ...classified.arch]
        }
        if (classified.frs.length > 0) {
          currentStory.frsAddressed = [...(currentStory.frsAddressed || []), ...classified.frs]
        }
        if (classified.nfrs.length > 0) {
          currentStory.nfrsAddressed = [...(currentStory.nfrsAddressed || []), ...classified.nfrs]
        }
        if (classified.ar.length > 0) {
          currentStory.arAddressed = [...(currentStory.arAddressed || []), ...classified.ar]
        }
      }

      currentEpic.stories.push(currentStory)
      currentStory = null
      storyDescriptionLines = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match Epic header: ## Epic 1: Name or # Epic 1: Name (sharded)
    const epicMatch = line.match(/^#{1,2} Epic (\d+): (.+)$/)
    if (epicMatch) {
      finishCurrentStory()
      if (currentEpic) {
        epics.push(currentEpic)
      }
      currentEpic = {
        id: parseInt(epicMatch[1]),
        name: epicMatch[2].trim(),
        goal: '',
        stories: []
      }
      inStoriesSection = false
      numberedStoryCount = 0
      continue
    }

    // Match BMM Goal format: **Goal:** text here or ### Goal section
    if (currentEpic && line.startsWith('**Goal:**')) {
      currentEpic.goal = line.replace('**Goal:**', '').trim()
      continue
    }
    if (currentEpic && !currentStory && line.startsWith('### Goal')) {
      let goalLines: string[] = []
      for (let j = i + 1; j < lines.length && !lines[j].startsWith('#'); j++) {
        if (lines[j].trim()) {
          goalLines.push(lines[j].trim())
        }
        if (goalLines.length >= 2) break
      }
      currentEpic.goal = goalLines.join(' ')
      continue
    }
    // Sharded format: **Epic Goal:** text on same line
    if (currentEpic && !currentStory && line.match(/^\*\*Epic Goal:\*\*/)) {
      currentEpic.goal = line.replace(/^\*\*Epic Goal:\*\*\s*/, '').trim()
      continue
    }

    // Match epic-level FRs/NFRs/ARCH covered: **FRs Covered:** FR1, FR2, NFR3, ARCH1
    if (currentEpic && !currentStory) {
      const coveredMatch = line.match(/^\*\*FRs\s+[Cc]overed:?\*\*\s*(.+)$/i)
      if (coveredMatch) {
        const allRefs = parseRequirementRefs(coveredMatch[1])
        const classified = classifyRequirements(allRefs)
        if (classified.frs.length > 0) currentEpic.frsCovered = classified.frs
        if (classified.nfrs.length > 0) currentEpic.nfrsCovered = classified.nfrs
        if (classified.arch.length > 0) currentEpic.archCovered = classified.arch
        if (classified.ar.length > 0) currentEpic.arCovered = classified.ar
        continue
      }
    }

    // Match Stories section header (for numbered list format)
    if (currentEpic && (line.startsWith('### Stories') || line.startsWith('## Stories'))) {
      finishCurrentStory()
      inStoriesSection = true
      continue
    }

    // Match BMM Story header: ### Story 1.1: Title Here, ### Story 1.F0: Title, or ### Story 0.3.5: Title
    const storyMatch = line.match(/^### Story (\d+)\.([\w.]+): (.+)$/)
    if (storyMatch && currentEpic) {
      finishCurrentStory()
      inStoriesSection = true
      const epicNumber = parseInt(storyMatch[1])
      const rawStoryNum = storyMatch[2]
      // Parse story number - could be a simple int, a versioned number like "3.5", or a string like "F0"
      const storyNumber = /^[\d.]+$/.test(rawStoryNum) ? rawStoryNum.replace(/\./g, '-') : rawStoryNum
      const title = stripMarkdown(storyMatch[3].trim())

      // Only add if this story belongs to the current epic
      if (epicNumber === currentEpic.id) {
        currentStory = { title, storyNumber, description: '' }
      }
      continue
    }

    // Match numbered story lines (inside ### Stories section)
    if (currentEpic && inStoriesSection && !currentStory) {
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
      if (numberedMatch) {
        numberedStoryCount++
        const fullText = stripMarkdown(numberedMatch[1].trim())
        const title = extractStoryTitle(fullText)
        currentEpic.stories.push({ title, storyNumber: numberedStoryCount, description: fullText })
        continue
      }
    }

    // Stop stories section on a new ## heading
    if (currentEpic && inStoriesSection && line.match(/^## /) && !line.match(/^## Stories/)) {
      finishCurrentStory()
      inStoriesSection = false
      numberedStoryCount = 0
    }

    // Collect story description lines
    if (currentStory) {
      storyDescriptionLines.push(line)
    }
  }

  // Don't forget the last story and epic
  finishCurrentStory()
  if (currentEpic) {
    epics.push(currentEpic)
  }

  // Convert to Epic[] with status information
  return epics.map((epic) => {
    const epicStatus = getEpicStatus(sprintStatus, epic.id)

    const stories: Story[] = epic.stories.map((story) => {
      // Use explicit key if present, otherwise generate from title
      const storyKey = story.explicitKey || (() => {
        const slug = generateSlug(story.title)
        return `${epic.id}-${String(story.storyNumber).toLowerCase()}-${slug}`
      })()
      const slug = story.explicitKey ? story.explicitKey.split('-').slice(2).join('-') : generateSlug(story.title)

      return {
        id: storyKey,
        epicId: epic.id,
        storyNumber: story.storyNumber,
        title: story.title,
        slug,
        status: getStoryStatus(sprintStatus, storyKey),
        epicDescription: story.description || undefined,
        acceptanceCriteriaPreview: story.acceptanceCriteriaPreview,
        technicalNotes: story.technicalNotes,
        frsAddressed: story.frsAddressed || epic.frsCovered,
        nfrsAddressed: story.nfrsAddressed || epic.nfrsCovered,
        archAddressed: story.archAddressed || epic.archCovered,
        arAddressed: story.arAddressed || epic.arCovered,
        points: story.points,
      }
    })

    return {
      id: epic.id,
      name: epic.name,
      goal: epic.goal,
      status: epicStatus,
      stories,
      frsCovered: epic.frsCovered,
      nfrsCovered: epic.nfrsCovered,
      archCovered: epic.archCovered,
      arCovered: epic.arCovered,
    }
  })
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

function extractStoryTitle(text: string): string {
  const clean = stripMarkdown(text)
  const userStoryMatch = clean.match(/^As a .+?, I (?:can |want to |see |use |have |am able to |no longer |clearly )?(.+?)(?:,| so that|$)/)
  if (userStoryMatch) {
    let title = userStoryMatch[1].trim()
    title = title.replace(/^to\s+/, '')
    title = title.charAt(0).toUpperCase() + title.slice(1)
    return title
  }
  return clean.length > 80 ? clean.substring(0, 77) + '...' : clean
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}
