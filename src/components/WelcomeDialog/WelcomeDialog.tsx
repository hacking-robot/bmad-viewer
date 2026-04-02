import { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import CloseIcon from '@mui/icons-material/Close'
import logoDark from '../../assets/logo-dark.svg'
import logoLight from '../../assets/logo-light.svg'
import { useProjectData } from '../../hooks/useProjectData'
import { useStore } from '../../store'

export default function WelcomeDialog() {
  const [error, setError] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const themeMode = useStore((s) => s.themeMode)
  const recentProjects = useStore((s) => s.recentProjects)
  const removeRecentProject = useStore((s) => s.removeRecentProject)
  const { selectProject, switchToProject } = useProjectData()

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 480,
          p: 4,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box
            component="img"
            src={themeMode === 'dark' ? logoDark : logoLight}
            alt="BMad Viewer"
            sx={{ width: 72, height: 72, borderRadius: 3 }}
          />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              BMad Viewer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A read-only viewer for your BMAD project stories, epics, and planning artifacts.
            </Typography>
          </Box>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<FolderOpenIcon />}
            onClick={async () => {
              setError(null)
              const ok = await selectProject()
              if (!ok) {
                const storeError = useStore.getState().error
                if (storeError) setError(storeError)
              }
            }}
          >
            Open Project Folder
          </Button>
        </Stack>

        {recentProjects.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Recent Projects
              </Typography>
              <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
                {recentProjects.map((project) => (
                  <ListItemButton
                    key={project.name}
                    onClick={() => switchToProject(project)}
                    onMouseEnter={() => setHoveredItem(project.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                    sx={{ borderRadius: 1, py: 0.5 }}
                  >
                    <ListItemText
                      primary={project.name}
                      secondary={project.projectType}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeRecentProject(project.name)
                      }}
                      sx={{
                        opacity: hoveredItem === project.name ? 1 : 0,
                        transition: 'opacity 0.2s',
                        ml: 1,
                        '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </ListItemButton>
                ))}
              </List>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  )
}
