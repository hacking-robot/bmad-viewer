import { useMemo } from 'react'
import { Box, Typography, Tooltip } from '@mui/material'
import { useStore } from '../../store'
import { STATUS_COLUMNS, StoryStatus } from '../../types'

const statusDescriptions: Record<StoryStatus, string> = {
  backlog: 'Stories not yet ready for development',
  'ready-for-dev': 'Stories ready to implement',
  'in-progress': 'Currently being developed',
  review: 'Code complete, awaiting review',
  'human-review': 'Awaiting human review approval',
  done: 'Implemented and verified',
  optional: 'Nice-to-have features'
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return date.toLocaleDateString()
}

export default function StatusBar() {
  const stories = useStore((state) => state.stories)
  const epics = useStore((state) => state.epics)
  const selectedEpicId = useStore((state) => state.selectedEpicId)
  const lastRefreshed = useStore((state) => state.lastRefreshed)
  const viewMode = useStore((state) => state.viewMode)
  const bmadScanResult = useStore((state) => state.bmadScanResult)

  const statusCounts = useMemo(() => {
    const counts: Record<StoryStatus, number> = {
      'backlog': 0,
      'ready-for-dev': 0,
      'in-progress': 0,
      'review': 0,
      'human-review': 0,
      'done': 0,
      'optional': 0
    }

    const filteredStories = selectedEpicId !== null
      ? stories.filter(s => s.epicId === selectedEpicId)
      : stories

    for (const story of filteredStories) {
      counts[story.status]++
    }

    return counts
  }, [stories, selectedEpicId])

  const selectedEpicName = useMemo(() => {
    if (selectedEpicId === null) return 'All Epics'
    const epic = epics.find(e => e.id === selectedEpicId)
    return epic ? epic.name : 'Unknown Epic'
  }, [epics, selectedEpicId])

  const statusDisplay = useMemo(() => {
    return STATUS_COLUMNS
      .map(col => ({
        ...col,
        count: statusCounts[col.status]
      }))
      .filter(col => col.count > 0)
  }, [statusCounts])

  return (
    <Box
      sx={{
        height: 28,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        gap: 2,
        flexShrink: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {bmadScanResult?.version && (
          <Tooltip title={`BMAD version: ${bmadScanResult.version}${bmadScanResult.modules.length > 0 ? `\nModules: ${bmadScanResult.modules.join(', ')}` : ''}`}>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help', fontFamily: 'monospace', fontSize: '0.65rem' }}>
              BMAD v{bmadScanResult.version}
              {bmadScanResult.modules.length > 0 && (
                <Typography component="span" variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', ml: 0.5 }}>
                  ({bmadScanResult.modules.join(', ')})
                </Typography>
              )}
            </Typography>
          </Tooltip>
        )}

        {viewMode === 'board' && statusDisplay.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {statusDisplay.map((col) => (
              <Tooltip
                key={col.status}
                title={`${col.count} ${col.label}: ${statusDescriptions[col.status]}`}
                arrow
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: col.color
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {col.count}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>

      {viewMode === 'board' && (
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {selectedEpicName}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tooltip title="Last data refresh">
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(lastRefreshed)}
          </Typography>
        </Tooltip>

      </Box>
    </Box>
  )
}
