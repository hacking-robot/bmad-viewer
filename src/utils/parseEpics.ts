import { Epic, Story } from '../types'
import type { SprintStatusData } from './parseSprintStatus'
import { getStoryStatus, getEpicStatus } from './parseSprintStatus'

/**
 * Classify a list of requirement references into FR, NFR, and ARCH buckets.
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
    else if (/\bNFR/i.test(trimmed)) nfrs.push(trimmed)
    else if (/\bARCH/i.test(trimmed)) arch.push(trimmed)
    else if (/\bAR/i.test(trimmed)) ar.push(trimmed)
    else frs.push(trimmed)
  }
  return { frs, nfrs, arch, ar }
}

function parseRequirementRefs(text: string): string[] {
  return text.split(/,/).map(item => item.trim()).filter(Boolean)
}

interface ParsedStory {
  title: string
  storyNumber: number | string
  description: string // Full user story text from epics.md
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

export function parseEpics(
  markdownContent: string,
  sprintStatus: SprintStatusData
): Epic[] {
  const lines = markdownContent.split('\n')
  const epics: ParsedEpic[] = []
  let currentEpic: ParsedEpic | null = null
  let currentStory: ParsedStory | null = null
  let storyDescriptionLines: string[] = []
  let inStoriesSection = false
  let storyNumber = 0

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
        .split(/\*\*Requirements:?\*\*/i)[0]
        .trim()
      if (description) {
        currentStory.description = description
      }

      // Extract Acceptance Criteria section
      const acMatch = fullText.match(/\*\*Acceptance\s+Criteria:?\*\*\s*([\s\S]*?)(?=\*\*Technical\s+Notes:?\*\*|\*\*FRs\s+addressed:?\*\*|\*\*Architecture\s+requirements?:?\*\*|\*\*Requirements:?\*\*|---\s*$|$)/i)
      if (acMatch) {
        const acItems = acMatch[1].trim()
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || line.startsWith('*') || line.startsWith('- ['))
          .map(line => line.replace(/^[-*]\s*(\[.\]\s*)?/, '').trim())
          .filter(Boolean)
        if (acItems.length > 0) {
          currentStory.acceptanceCriteriaPreview = acItems
        }
      }

      // Extract Technical Notes section
      const techMatch = fullText.match(/\*\*Technical\s+Notes:?\*\*\s*([\s\S]*?)(?=\*\*Acceptance\s+Criteria:?\*\*|\*\*FRs\s+addressed:?\*\*|\*\*Architecture\s+requirements?:?\*\*|\*\*Requirements:?\*\*|---\s*$|$)/i)
      if (techMatch) {
        const techText = techMatch[1].trim()
        if (techText) {
          currentStory.technicalNotes = techText
        }
      }

      // Extract FRs addressed section
      const frsMatch = fullText.match(/\*\*FRs\s+addressed:?\*\*\s*([\s\S]*?)(?=\*\*Acceptance\s+Criteria:?\*\*|\*\*Technical\s+Notes:?\*\*|\*\*Architecture\s+requirements?:?\*\*|\*\*Requirements:?\*\*|---\s*$|$)/i)
      if (frsMatch) {
        const allRefs = frsMatch[1].trim()
          .split(/[,\n]/)
          .map(item => item.trim())
          .filter(Boolean)
        if (allRefs.length > 0) {
          const classified = classifyRequirements(allRefs)
          if (classified.frs.length > 0) currentStory.frsAddressed = classified.frs
          if (classified.nfrs.length > 0) currentStory.nfrsAddressed = classified.nfrs
          if (classified.arch.length > 0) currentStory.archAddressed = classified.arch
          if (classified.ar.length > 0) currentStory.arAddressed = classified.ar
        }
      }

      // Extract Architecture requirements section (separate from FRs addressed)
      const archMatch = fullText.match(/\*\*Architecture\s+requirements?:?\*\*\s*([\s\S]*?)(?=\*\*Acceptance\s+Criteria:?\*\*|\*\*Technical\s+Notes:?\*\*|\*\*FRs\s+addressed:?\*\*|\*\*Requirements:?\*\*|---\s*$|$)/i)
      if (archMatch) {
        const archRefs = archMatch[1].trim()
          .split(/[,\n]/)
          .map(item => item.trim())
          .filter(Boolean)
        if (archRefs.length > 0) {
          const classified = classifyRequirements(archRefs)
          // Merge with any already-parsed requirements (from FRs addressed section)
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
      }

      currentEpic.stories.push(currentStory)
      currentStory = null
      storyDescriptionLines = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match Epic header: ## Epic 1: Name (combined) or # Epic 1: Name (sharded)
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
      storyNumber = 0
      continue
    }

    // Match Goal section: ### Goal (multi-line) or **Goal:** / **Epic Goal:** inline
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
    if (currentEpic && !currentStory && line.startsWith('**Goal:**')) {
      currentEpic.goal = line.replace('**Goal:**', '').trim()
      continue
    }
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

    // Match Stories section
    if (currentEpic && (line.startsWith('### Stories') || line.startsWith('## Stories'))) {
      finishCurrentStory()
      inStoriesSection = true
      continue
    }

    // Match heading format: ### Story 1.3: Title or ### Story 0.3.5: Title
    // This works with or without a ### Stories section header
    if (currentEpic) {
      const headingMatch = line.match(/^### Story \d+\.([\w.]+):\s*(.+)$/)
      if (headingMatch) {
        finishCurrentStory()
        inStoriesSection = true
        const rawStoryNum = headingMatch[1]
        // Parse story number - could be a simple int, a versioned number like "3.5", or a string like "F0"
        const parsedStoryNum: number | string = /^[\d.]+$/.test(rawStoryNum) ? rawStoryNum.replace(/\./g, '-') : rawStoryNum
        const title = stripMarkdown(headingMatch[2].trim())
        currentStory = { title, storyNumber: parsedStoryNum, description: title }
        continue
      }
    }

    // Match numbered story lines (only inside ### Stories section, not while collecting story body)
    if (currentEpic && inStoriesSection && !currentStory) {
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
      if (numberedMatch) {
        storyNumber++
        const fullText = stripMarkdown(numberedMatch[1].trim())
        const title = extractStoryTitle(fullText)
        currentEpic.stories.push({ title, storyNumber, description: fullText })
        continue
      }
    }

    // Stop stories section on a new ## heading (but not ### which are story headers)
    if (currentEpic && inStoriesSection && line.match(/^## /) && !line.match(/^## Stories/)) {
      finishCurrentStory()
      inStoriesSection = false
      storyNumber = 0
    }

    // Collect story description lines (for ### Story heading format)
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
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')     // *italic* → italic
    .replace(/__(.+?)__/g, '$1')     // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')       // _italic_ → italic
    .replace(/`(.+?)`/g, '$1')       // `code` → code
}

function extractStoryTitle(text: string): string {
  // Strip markdown formatting before parsing
  const clean = stripMarkdown(text)
  // Try to extract action from "As a X, I [verb] Y so that Z" format
  // Matches common verbs: can, want, see, use, have, am able to, etc.
  const userStoryMatch = clean.match(/^As a .+?, I (?:can |want to |see |use |have |am able to |no longer |clearly )?(.+?)(?:,| so that|$)/)
  if (userStoryMatch) {
    let title = userStoryMatch[1].trim()
    title = title.replace(/^to\s+/, '') // Remove leading "to"
    title = title.charAt(0).toUpperCase() + title.slice(1) // Capitalize
    return title
  }
  // Fall back to full text (truncated if too long)
  return clean.length > 80 ? clean.substring(0, 77) + '...' : clean
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) // Limit length
}

export function getAllStories(epics: Epic[]): Story[] {
  return epics.flatMap((epic) => epic.stories)
}
