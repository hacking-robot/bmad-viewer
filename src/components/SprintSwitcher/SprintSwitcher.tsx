import { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  Box,
  Typography,
  Chip,
  Divider
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useStore } from '../../store'

const STATUS_COLORS: Record<string, string> = {
  active: '#4caf50',
  completed: '#2196f3',
  planned: '#9e9e9e'
}

function formatDateRange(start: string, targetEnd: string): string {
  const fmt = (d: string) => {
    try {
      const date = new Date(d)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return d
    }
  }
  return `${fmt(start)} – ${fmt(targetEnd)}`
}

export default function SprintSwitcher() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const sprints = useStore((s) => s.sprints)
  const selectedSprintNumber = useStore((s) => s.selectedSprintNumber)
  const setSelectedSprintNumber = useStore((s) => s.setSelectedSprintNumber)
  const isMultiSprint = useStore((s) => s.isMultiSprint)

  if (!isMultiSprint) return null

  const sortedSprints = [...sprints].sort((a, b) => b.sprintNumber - a.sprintNumber)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (sprintNumber: number | null) => {
    setSelectedSprintNumber(sprintNumber)
    handleClose()
  }

  return (
    <>
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
        <Typography variant="body2">
          {selectedSprintNumber != null ? `Sprint ${selectedSprintNumber}` : 'All Sprints'}
        </Typography>
      </Button>

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
          selected={selectedSprintNumber === null}
        >
          <Typography>All Sprints</Typography>
        </MenuItem>

        <Divider />

        {sortedSprints.map((sprint) => (
          <MenuItem
            key={sprint.sprintNumber}
            onClick={() => handleSelect(sprint.sprintNumber)}
            selected={selectedSprintNumber === sprint.sprintNumber}
            sx={{ py: 1.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Sprint {sprint.sprintNumber}
              </Typography>
              <Chip
                label={sprint.status}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: STATUS_COLORS[sprint.status] || STATUS_COLORS.planned,
                  color: '#fff'
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {formatDateRange(sprint.dates.start, sprint.dates.targetEnd)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
