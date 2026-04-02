import { useState } from 'react'
import {
  Popover,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useStore } from '../../store'
import { useRequirementLookup } from '../../hooks/useRequirementLookup'
import { useRequirementDescriptions } from '../../hooks/useRequirementDescriptions'
import type { SprintData, SprintStory, VelocityLog, Story } from '../../types'

const STATUS_COLORS: Record<string, string> = {
  active: '#4caf50',
  completed: '#2196f3',
  planned: '#9e9e9e',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

/** Group stories by epic number and compute point totals per epic */
function groupByEpic(stories: SprintStory[]): { epic: number; epicTitle: string; points: number; count: number }[] {
  const map = new Map<number, { epicTitle: string; points: number; count: number }>()
  for (const s of stories) {
    const entry = map.get(s.epic) ?? { epicTitle: s.epicTitle ?? `Epic ${s.epic}`, points: 0, count: 0 }
    entry.points += s.points
    entry.count += 1
    map.set(s.epic, entry)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([epic, v]) => ({ epic, ...v }))
}

function VelocitySection({ velocityLog }: { velocityLog: VelocityLog }) {
  const { averages, recommendations } = velocityLog
  return (
    <>
      <Divider sx={{ my: 1.5 }} />
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Velocity
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Last 3 avg:</Typography>
        <Typography variant="caption">{averages.last3Sprints} pts</Typography>
        <Typography variant="caption" color="text.secondary">Last 5 avg:</Typography>
        <Typography variant="caption">{averages.last5Sprints} pts</Typography>
        <Typography variant="caption" color="text.secondary">All-time avg:</Typography>
        <Typography variant="caption">{averages.allTime} pts</Typography>
        <Typography variant="caption" color="text.secondary">Trend:</Typography>
        <Typography variant="caption">{averages.trend}</Typography>
      </Box>

      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Capacity Recommendations
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Conservative:</Typography>
        <Typography variant="caption">{recommendations.conservative} pts</Typography>
        <Typography variant="caption" color="text.secondary">Standard:</Typography>
        <Typography variant="caption">{recommendations.standard} pts</Typography>
        <Typography variant="caption" color="text.secondary">Aggressive:</Typography>
        <Typography variant="caption">{recommendations.aggressive} pts</Typography>
      </Box>
    </>
  )
}

function SprintDetails({ sprint, velocityLog, boardStories, epics, getDescription, openRequirement }: { sprint: SprintData; velocityLog: VelocityLog | null; boardStories: Story[]; epics: import('../../types').Epic[]; getDescription: (id: string) => string | undefined; openRequirement: (id: string) => void }) {
  const allStories = [...sprint.plannedStories, ...sprint.carryover]
  const epicGroups = groupByEpic(allStories)

  // Build per-epic requirements from epic-level + story-level for stories in this sprint
  const sprintStoryKeys = new Set(allStories.map(s => s.key))
  const sprintEpicIds = new Set(allStories.map(s => s.epic))

  const colorMap: Record<string, string> = { FR: '#ed6c02', NFR: '#7b1fa2', ARCH: '#00838f', AR: '#558b2f' }
  const getColor = (id: string) => {
    const prefix = id.replace(/[-]?\d.*$/, '').toUpperCase()
    return colorMap[prefix] || '#757575'
  }

  const epicReqGroups: { epicId: number; epicName: string; reqs: { id: string; color: string }[] }[] = []
  for (const epicId of [...sprintEpicIds].sort((a, b) => a - b)) {
    const epic = epics.find(e => e.id === epicId)
    const frs = new Set<string>()
    const nfrs = new Set<string>()
    const arch = new Set<string>()
    const ar = new Set<string>()
    if (epic) {
      epic.frsCovered?.forEach(r => frs.add(r))
      epic.nfrsCovered?.forEach(r => nfrs.add(r))
      epic.archCovered?.forEach(r => arch.add(r))
      epic.arCovered?.forEach(r => ar.add(r))
    }
    for (const s of boardStories) {
      if (sprintStoryKeys.has(s.id) && s.epicId === epicId) {
        s.frsAddressed?.forEach(r => frs.add(r))
        s.nfrsAddressed?.forEach(r => nfrs.add(r))
        s.archAddressed?.forEach(r => arch.add(r))
        s.arAddressed?.forEach(r => ar.add(r))
      }
    }
    const reqs = [
      ...[...frs].sort().map(r => ({ id: r, color: getColor(r) })),
      ...[...nfrs].sort().map(r => ({ id: r, color: getColor(r) })),
      ...[...arch].sort().map(r => ({ id: r, color: getColor(r) })),
      ...[...ar].sort().map(r => ({ id: r, color: getColor(r) })),
    ]
    if (reqs.length > 0) {
      const epicName = epic?.name || `Epic ${epicId}`
      epicReqGroups.push({ epicId, epicName, reqs })
    }
  }
  const hasRequirements = epicReqGroups.length > 0

  return (
    <Box sx={{ p: 2, width: 400, maxHeight: 480, overflow: 'auto' }}>
      {/* Header: sprint number + status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Sprint {sprint.sprintNumber}
        </Typography>
        <Chip
          label={sprint.status}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            bgcolor: STATUS_COLORS[sprint.status] || STATUS_COLORS.planned,
            color: '#fff',
          }}
        />
      </Box>

      {/* Dates */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">Start:</Typography>
        <Typography variant="caption">{formatDate(sprint.dates.start)}</Typography>
        <Typography variant="caption" color="text.secondary">Target end:</Typography>
        <Typography variant="caption">{formatDate(sprint.dates.targetEnd)}</Typography>
        <Typography variant="caption" color="text.secondary">Actual end:</Typography>
        <Typography variant="caption">{formatDate(sprint.dates.actualEnd)}</Typography>
      </Box>

      {/* Team */}
      {sprint.team.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            Team
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {sprint.team.map((m) => (
              <Chip key={m.name} label={m.name} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.75rem' }} />
            ))}
          </Box>
        </>
      )}

      {/* Metrics */}
      <Divider sx={{ my: 1.5 }} />
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Metrics
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Total points:</Typography>
        <Typography variant="caption">{sprint.metrics.totalPoints}</Typography>
        <Typography variant="caption" color="text.secondary">Completed:</Typography>
        <Typography variant="caption">{sprint.metrics.completedPoints}</Typography>
        {sprint.metrics.storyCount != null && (
          <>
            <Typography variant="caption" color="text.secondary">Stories:</Typography>
            <Typography variant="caption">{sprint.metrics.storyCount}</Typography>
          </>
        )}
        {sprint.metrics.storiesCompleted != null && (
          <>
            <Typography variant="caption" color="text.secondary">Completed:</Typography>
            <Typography variant="caption">{sprint.metrics.storiesCompleted}</Typography>
          </>
        )}
      </Box>

      {/* Stories by epic */}
      {epicGroups.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            Stories by Epic
          </Typography>
          {epicGroups.map((g) => (
            <Box key={g.epic} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
              <Typography variant="caption">Epic {g.epic}: {g.epicTitle}</Typography>
              <Typography variant="caption" color="text.secondary">
                {g.count} {g.count === 1 ? 'story' : 'stories'} · {g.points} pts
              </Typography>
            </Box>
          ))}
        </>
      )}

      {/* Velocity section — only when velocityLog is available */}
      {velocityLog && <VelocitySection velocityLog={velocityLog} />}

      {/* Requirements Coverage */}
      {hasRequirements && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            Requirements Coverage
          </Typography>
          {epicReqGroups.map(({ epicId, epicName, reqs }) => (
            <Box key={epicId} sx={{ mb: 1.5 }}>
              <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                Epic {epicId}: {epicName}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {reqs.map(({ id, color }) => {
                  const desc = getDescription(id)
                  return (
                    <Box
                      key={id}
                      onClick={() => openRequirement(id)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 0.75,
                        px: 0.75,
                        py: 0.25,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Chip
                        label={id}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          bgcolor: color,
                          color: 'white',
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                      {desc && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4, mt: 0.25, pl: 0.25 }}>
                          {desc}
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ))}
        </>
      )}
    </Box>
  )
}

export default function SprintInfoPanel() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const sprints = useStore((s) => s.sprints)
  const selectedSprintNumber = useStore((s) => s.selectedSprintNumber)
  const velocityLog = useStore((s) => s.velocityLog)
  const isMultiSprint = useStore((s) => s.isMultiSprint)
  const stories = useStore((s) => s.stories)
  const epics = useStore((s) => s.epics)
  const { getDescription } = useRequirementDescriptions()
  const { openRequirement } = useRequirementLookup()

  // Only render when multi-sprint is active and a specific sprint is selected
  if (!isMultiSprint || selectedSprintNumber == null) return null

  const sprint = sprints.find((s) => s.sprintNumber === selectedSprintNumber)
  if (!sprint) return null

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <Tooltip title="Sprint Info">
        <IconButton onClick={handleOpen} size="small" sx={{ color: 'text.secondary' }}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: { borderRadius: 1.5, WebkitAppRegion: 'no-drag' },
          },
        }}
      >
        <SprintDetails sprint={sprint} velocityLog={velocityLog} boardStories={stories} epics={epics} getDescription={getDescription} openRequirement={openRequirement} />
      </Popover>
    </>
  )
}
