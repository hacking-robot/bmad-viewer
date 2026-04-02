import { useState, useEffect } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Divider,
  Tooltip,
  Popover,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import IconButton from '@mui/material/IconButton'
import { useStore } from '../../store'
import { useRequirementLookup } from '../../hooks/useRequirementLookup'
import { useRequirementDescriptions } from '../../hooks/useRequirementDescriptions'
import { EPIC_COLORS } from '../../types'

export default function EpicFilter() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [infoAnchor, setInfoAnchor] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const epics = useStore((state) => state.epics)
  const selectedEpicId = useStore((state) => state.selectedEpicId)
  const setSelectedEpicId = useStore((state) => state.setSelectedEpicId)
  const selectedSprintNumber = useStore((state) => state.selectedSprintNumber)
  const sprints = useStore((state) => state.sprints)
  const { openRequirement } = useRequirementLookup()
  const { getDescription } = useRequirementDescriptions()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (epicId: number | null) => {
    setSelectedEpicId(epicId)
    handleClose()
  }

  const selectedEpic = epics.find((e) => e.id === selectedEpicId)

  const sprintStoryKeys = (() => {
    if (selectedSprintNumber == null) return null
    const sprint = sprints.find(s => s.sprintNumber === selectedSprintNumber)
    if (!sprint) return null
    return new Set([
      ...sprint.plannedStories.map(s => s.key),
      ...sprint.carryover.map(s => s.key),
    ])
  })()

  const filteredEpics = sprintStoryKeys
    ? epics.filter(epic => epic.stories.some(s => sprintStoryKeys.has(s.id)))
    : epics

  useEffect(() => {
    if (selectedEpicId != null && !filteredEpics.some(e => e.id === selectedEpicId)) {
      setSelectedEpicId(null)
    }
  }, [selectedSprintNumber, filteredEpics, selectedEpicId, setSelectedEpicId])

  const getEpicStories = (epicId: number) => {
    const epic = epics.find((e) => e.id === epicId)
    if (!epic) return []
    return sprintStoryKeys
      ? epic.stories.filter(s => sprintStoryKeys.has(s.id))
      : epic.stories
  }

  const getEpicProgress = (epicId: number) => {
    const stories = getEpicStories(epicId)
    if (stories.length === 0) return 0
    const doneCount = stories.filter((s) => s.status === 'done').length
    return (doneCount / stories.length) * 100
  }

  const normalizeReqId = (id: string) =>
    id.replace(/\s*\(.*?\)\s*$/, '').trim().toUpperCase()
      .replace(/^(FR|NFR|ARCH|AR)-?(\d+)$/i, (_m, prefix, num) => `${prefix}${String(Number(num))}`)

  const getRequirementsProgress = (epicId: number) => {
    const epic = epics.find((e) => e.id === epicId)
    if (!epic) return null

    const allReqs = new Set<string>()
    epic.frsCovered?.forEach(r => allReqs.add(normalizeReqId(r)))
    epic.nfrsCovered?.forEach(r => allReqs.add(normalizeReqId(r)))
    epic.archCovered?.forEach(r => allReqs.add(normalizeReqId(r)))
    epic.arCovered?.forEach(r => allReqs.add(normalizeReqId(r)))

    if (allReqs.size === 0) return null

    const allStories = epic.stories
    const reqStoryCount = new Map<string, { total: number; done: number }>()

    for (const s of allStories) {
      const storyReqs = new Set<string>()
      s.frsAddressed?.forEach(r => storyReqs.add(normalizeReqId(r)))
      s.nfrsAddressed?.forEach(r => storyReqs.add(normalizeReqId(r)))
      s.archAddressed?.forEach(r => storyReqs.add(normalizeReqId(r)))
      s.arAddressed?.forEach(r => storyReqs.add(normalizeReqId(r)))

      for (const req of storyReqs) {
        if (!allReqs.has(req)) continue
        const entry = reqStoryCount.get(req) ?? { total: 0, done: 0 }
        entry.total++
        if (s.status === 'done') entry.done++
        reqStoryCount.set(req, entry)
      }
    }

    let covered = 0
    for (const req of allReqs) {
      const entry = reqStoryCount.get(req)
      if (entry && entry.total > 0 && entry.done === entry.total) covered++
    }

    return { covered, total: allReqs.size, percent: (covered / allReqs.size) * 100 }
  }

  const handleInfoClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setInfoAnchor(event.currentTarget)
  }

  const handleInfoClose = () => {
    setInfoAnchor(null)
  }

  const getStoryCountsByStatus = (epicId: number) => {
    const epic = epics.find((e) => e.id === epicId)
    if (!epic) return {}
    const counts: Record<string, number> = {}
    epic.stories.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1
    })
    return counts
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Button
          onClick={handleClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{
            textTransform: 'none',
            color: 'text.primary',
            bgcolor: 'action.hover',
            px: 2,
            '&:hover': {
              bgcolor: 'action.selected'
            }
          }}
        >
          {selectedEpic ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: EPIC_COLORS[(selectedEpic.id - 1) % EPIC_COLORS.length]
                }}
              />
              <Typography variant="body2">Epic {selectedEpic.id}</Typography>
            </Box>
          ) : (
            <Typography variant="body2">All Epics</Typography>
          )}
        </Button>

        {selectedEpic && (
          <Tooltip title="Epic info">
            <IconButton
              onClick={handleInfoClick}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {selectedEpic && (
        <Popover
          open={Boolean(infoAnchor)}
          anchorEl={infoAnchor}
          onClose={handleInfoClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center'
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2,
                maxWidth: 500,
                maxHeight: 500,
                overflow: 'auto',
                borderRadius: 1.5,
                WebkitAppRegion: 'no-drag'
              }
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: EPIC_COLORS[(selectedEpic.id - 1) % EPIC_COLORS.length],
                flexShrink: 0
              }}
            />
            <Typography variant="subtitle1" fontWeight={600}>
              Epic {selectedEpic.id}: {selectedEpic.name}
            </Typography>
          </Box>

          {selectedEpic.goal && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Goal
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary' }}>
                {selectedEpic.goal}
              </Typography>
            </Box>
          )}

          {(() => {
            const stories = getEpicStories(selectedEpic.id)
            const frs = new Set<string>(selectedEpic.frsCovered)
            const nfrs = new Set<string>(selectedEpic.nfrsCovered)
            const arch = new Set<string>(selectedEpic.archCovered)
            const ar = new Set<string>(selectedEpic.arCovered)
            for (const s of stories) {
              s.frsAddressed?.forEach(r => frs.add(r))
              s.nfrsAddressed?.forEach(r => nfrs.add(r))
              s.archAddressed?.forEach(r => arch.add(r))
              s.arAddressed?.forEach(r => ar.add(r))
            }
            if (frs.size === 0 && nfrs.size === 0 && arch.size === 0 && ar.size === 0) return null

            const colorMap: Record<string, string> = { FR: '#ed6c02', NFR: '#7b1fa2', ARCH: '#00838f', AR: '#558b2f' }
            const getColor = (id: string) => {
              const prefix = id.replace(/[-]?\d.*$/, '').toUpperCase()
              return colorMap[prefix] || '#757575'
            }

            const allReqs = [
              ...[...frs].sort().map(r => ({ id: r, color: getColor(r) })),
              ...[...nfrs].sort().map(r => ({ id: r, color: getColor(r) })),
              ...[...arch].sort().map(r => ({ id: r, color: getColor(r) })),
              ...[...ar].sort().map(r => ({ id: r, color: getColor(r) })),
            ]

            return (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: 'block' }}>
                  Requirements Coverage
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {allReqs.map(({ id, color }) => {
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
            )
          })()}

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
              Story Status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {(() => {
                const counts = getStoryCountsByStatus(selectedEpic.id)
                const statusOrder = ['backlog', 'ready-for-dev', 'in-progress', 'review', 'done']
                return statusOrder.map((status) => {
                  const count = counts[status] || 0
                  if (count === 0) return null
                  const statusColors: Record<string, string> = {
                    'backlog': '#9e9e9e',
                    'ready-for-dev': '#2196f3',
                    'in-progress': '#ff9800',
                    'review': '#9c27b0',
                    'done': '#4caf50'
                  }
                  return (
                    <Box
                      key={status}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        fontSize: '0.75rem'
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: statusColors[status] || 'text.disabled'
                        }}
                      />
                      <Typography variant="caption">
                        {status.replace(/-/g, ' ')}: {count}
                      </Typography>
                    </Box>
                  )
                })
              })()}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Total: {selectedEpic.stories.length} stories
            </Typography>
          </Box>

        </Popover>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxHeight: 400,
            WebkitAppRegion: 'no-drag'
          }
        }}
      >
        <MenuItem
          onClick={() => handleSelect(null)}
          selected={selectedEpicId === null}
        >
          <Typography>All Epics</Typography>
        </MenuItem>

        <Divider />

        {filteredEpics.map((epic) => {
          const progress = getEpicProgress(epic.id)
          const color = EPIC_COLORS[(epic.id - 1) % EPIC_COLORS.length]
          const sprintStories = getEpicStories(epic.id)
          const reqProgress = getRequirementsProgress(epic.id)

          return (
            <MenuItem
              key={epic.id}
              onClick={() => handleSelect(epic.id)}
              selected={selectedEpicId === epic.id}
              sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1.5 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: color,
                    flexShrink: 0
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Epic {epic.id}: {epic.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#26c6da',
                      borderRadius: 2
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 62, textAlign: 'left', fontSize: '0.7rem', lineHeight: 1 }}>
                  {sprintStories.filter((s) => s.status === 'done').length}/{sprintStories.length} stories
                </Typography>
              </Box>
              {reqProgress && (
                <Tooltip title={`Requirements: ${reqProgress.covered}/${reqProgress.total} addressed by done stories`} placement="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: '-1px' }}>
                    <LinearProgress
                      variant="determinate"
                      value={reqProgress.percent}
                      sx={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#ffd54f',
                          borderRadius: 2
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 62, textAlign: 'left', fontSize: '0.65rem', lineHeight: 1 }}>
                      {reqProgress.covered}/{reqProgress.total} reqs
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </MenuItem>
          )
        })}
      </Menu>

    </>
  )
}
