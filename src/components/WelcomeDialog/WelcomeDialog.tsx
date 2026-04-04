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
  Chip,
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import CloudIcon from '@mui/icons-material/Cloud'
import CloseIcon from '@mui/icons-material/Close'
import logoDark from '../../assets/logo-dark.svg'
import logoLight from '../../assets/logo-light.svg'
import { useProjectData } from '../../hooks/useProjectData'
import { useStore } from '../../store'
import OpenRemoteDialog from '../RemoteBranchViewer/OpenRemoteDialog'

export default function WelcomeDialog() {
  const [error, setError] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [remoteDialogOpen, setRemoteDialogOpen] = useState(false)
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
           borderRadius: 3,
           border: '1px solid',
           borderColor: 'divider',
           overflow: 'hidden',
         }}
        >
        <Box sx={{ p: 4 }}>
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
              A read-only viewer for BMad projects.
            </Typography>
          </Box>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
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
              Local Project
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<CloudIcon />}
              onClick={() => setRemoteDialogOpen(true)}
            >
              Remote Project
            </Button>
          </Stack>
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
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{project.name}</span>
                          <Chip
                            label={(project.projectType || 'unknown').toUpperCase()}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                          />
                          {project.isRemote && (
                            <Chip
                              icon={<CloudIcon sx={{ fontSize: 12 }} />}
                              label="Remote"
                              size="small"
                              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                            />
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500, component: 'div' }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeRecentProject(project.name, project.isRemote)
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
        </Box>

        <Divider />
        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', fontSize: '0.65rem', py: 1.5 }}
        >
          Settings are saved locally in browser's local storage. Remote projects are read directly from GitHub.
        </Typography>
      </Paper>
      <OpenRemoteDialog open={remoteDialogOpen} onClose={() => setRemoteDialogOpen(false)} />
    </Box>
  )
}
