import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  InputBase
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { useStore, type RecentProject } from '../../store'
import { useProjectData } from '../../hooks/useProjectData'

export default function ProjectSwitcher() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [preSelectedIndex, setPreSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const projectName = useStore((state) => state.projectName)
  const recentProjects = useStore((state) => state.recentProjects)
  const removeRecentProject = useStore((state) => state.removeRecentProject)
  const { selectProject, switchToProject } = useProjectData()

  const open = Boolean(anchorEl)

  const filteredProjects = recentProjects.filter((project) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return project.name.toLowerCase().includes(query)
  })

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery('')
      setPreSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setPreSelectedIndex(0)
  }, [searchQuery])

  const handleClick = () => {
    if (open) {
      setAnchorEl(null)
    } else if (triggerRef.current) {
      setAnchorEl(triggerRef.current)
    }
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleProjectClick = (project: RecentProject) => {
    switchToProject(project)
    handleClose()
  }

  const handleRemoveProject = (event: React.MouseEvent, name: string, isRemote?: boolean) => {
    event.stopPropagation()
    removeRecentProject(name, isRemote)
  }

  const handleOpenProject = () => {
    selectProject()
    handleClose()
  }

  return (
    <Box
      ref={triggerRef}
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        <Typography
          variant="h6"
          color="text.primary"
          fontWeight={600}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {projectName || 'BMad Viewer'}
        </Typography>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 20,
            color: 'text.secondary',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none'
          }}
        />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        autoFocus={false}
        disableAutoFocusItem
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
              minWidth: 320,
              maxHeight: 400,
              mt: 1,
            }
          }
        }}
      >
        <MenuItem onClick={handleOpenProject} sx={{ py: 1.5 }}>
          <FolderOpenIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">Open Project...</Typography>
        </MenuItem>

        {recentProjects.length > 0 && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <InputBase
              inputRef={searchInputRef}
              placeholder="Recent Projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter' && filteredProjects.length > 0) {
                  const selectedProject = filteredProjects[preSelectedIndex]
                  if (selectedProject) {
                    handleProjectClick(selectedProject)
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setPreSelectedIndex((prev) =>
                    Math.min(prev + 1, filteredProjects.length - 1)
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setPreSelectedIndex((prev) => Math.max(prev - 1, 0))
                } else if (e.key === 'Escape') {
                  handleClose()
                }
              }}
              sx={{
                px: 2,
                py: 1,
                width: '100%',
                fontSize: '0.75rem',
                color: 'text.secondary',
                '& input::placeholder': {
                  color: 'text.secondary',
                  opacity: 1
                }
              }}
            />
            {filteredProjects.length === 0 && searchQuery.trim() && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2, py: 1, display: 'block', fontStyle: 'italic' }}
              >
                No projects found
              </Typography>
            )}
            {filteredProjects.map((project, index) => (
              <MenuItem
                key={`${project.name}-${project.isRemote}`}
                onClick={() => handleProjectClick(project)}
                selected={project.name === projectName && project.isRemote === useStore.getState().isRemoteProject}
                onMouseEnter={() => {
                  setHoveredItem(project.name)
                  setPreSelectedIndex(index)
                }}
                onMouseLeave={() => setHoveredItem(null)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 1.5,
                  pr: 1,
                  ...(index === preSelectedIndex && filteredProjects.length > 0 && {
                    bgcolor: 'action.hover'
                  })
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {project.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    {project.projectType || 'unknown'}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleRemoveProject(e, project.name, project.isRemote)}
                  sx={{
                    opacity: hoveredItem === project.name ? 1 : 0,
                    transition: 'opacity 0.2s',
                    ml: 1,
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: 'error.contrastText'
                    }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </Box>
  )
}
