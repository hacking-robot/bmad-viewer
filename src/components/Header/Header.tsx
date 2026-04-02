import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Badge,
  Chip,
  Popover,
  Collapse,
} from '@mui/material'
import logoDark from '../../assets/logo-dark.svg'
import logoLight from '../../assets/logo-light.svg'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import DescriptionIcon from '@mui/icons-material/Description'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import VisibilityIcon from '@mui/icons-material/Visibility'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchBar from '../SearchBar/SearchBar'
import EpicFilter from '../EpicFilter/EpicFilter'
import SprintSwitcher from '../SprintSwitcher'
import SprintInfoPanel from '../SprintInfoPanel'
import SettingsMenu from '../SettingsMenu'
import ProjectSwitcher from '../ProjectSwitcher'
import { useStore } from '../../store'
import { hasBoardModule } from '../../utils/projectTypes'
import { useDocuments, getArtifactTypeLabel, getArtifactTypeColor } from '../../hooks/useDocuments'
import { loadProjectData } from '../../hooks/useProjectData'

export default function Header() {
  const projectType = useStore((state) => state.projectType)
  const themeMode = useStore((state) => state.themeMode)
  const viewMode = useStore((state) => state.viewMode)
  const bmadScanResult = useStore((state) => state.bmadScanResult)
  const { folders, allFiles, getModuleLabel } = useDocuments()
  const [docsAnchor, setDocsAnchor] = useState<null | HTMLElement>(null)
  const openArtifactViewer = useStore((state) => state.openArtifactViewer)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())

  const hasBrd = bmadScanResult?.modules ? hasBoardModule(bmadScanResult.modules) : projectType !== 'dashboard'
  const isGameProject = projectType === 'gds'
  const logoSrc = themeMode === 'dark' ? logoDark : logoLight

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          minHeight: 44,
          gap: 2,
          pl: 2,
          pr: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, userSelect: 'none' }}>
          <Box
            component="img"
            src={logoSrc}
            alt="BMad Viewer"
            sx={{ width: 28, height: 28, borderRadius: 1 }}
          />
          {isGameProject && (
            <Chip
              icon={<SportsEsportsIcon sx={{ fontSize: 14 }} />}
              label="Game"
              size="small"
              sx={{
                height: 20,
                bgcolor: '#8B5CF6',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.65rem',
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
          )}
          <Chip
            icon={<VisibilityIcon sx={{ fontSize: 14 }} />}
            label="Read-only"
            size="small"
            sx={{
              height: 20,
              bgcolor: 'info.main',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.65rem',
              '& .MuiChip-icon': { color: 'white' }
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />
        <ProjectSwitcher />
        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Documents">
          <IconButton
            onClick={(e) => setDocsAnchor(e.currentTarget)}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <Badge badgeContent={allFiles.length} color="primary" invisible={allFiles.length === 0}>
              <FolderOpenIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        <SettingsMenu />
      </Toolbar>

      {hasBrd && viewMode === 'board' && (
        <Toolbar
          variant="dense"
          sx={{
            minHeight: 38,
            gap: 1.5,
            pl: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchBar />
            <EpicFilter />
            <SprintSwitcher />
            <SprintInfoPanel />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Refresh data">
            <IconButton
              size="small"
              onClick={() => loadProjectData()}
              sx={{ color: 'text.secondary' }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}

      <Popover
        open={Boolean(docsAnchor)}
        anchorEl={docsAnchor}
        onClose={() => setDocsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: { p: 2, width: 380, maxHeight: 500, overflow: 'auto', borderRadius: 1.5 }
          }
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Documents
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {folders.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
              No documents found
            </Typography>
          )}
          {folders.map((folder) => {
            const isCollapsed = collapsedFolders.has(folder.id)
            const toggleCollapse = () => {
              setCollapsedFolders(prev => {
                const next = new Set(prev)
                if (next.has(folder.id)) next.delete(folder.id)
                else next.add(folder.id)
                return next
              })
            }
            const moduleLabel = getModuleLabel(folder.module)
            return (
              <Box key={folder.id}>
                <Box
                  onClick={toggleCollapse}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    py: 0.25,
                    '&:hover': { opacity: 0.8 }
                  }}
                >
                  {isCollapsed
                    ? <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    : <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  }
                  <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    {folder.label}
                  </Typography>
                  {moduleLabel && (
                    <Chip
                      label={moduleLabel}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        bgcolor: 'action.selected',
                      }}
                    />
                  )}
                </Box>
                <Collapse in={!isCollapsed}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, ml: 1 }}>
                    {folder.files.map((file) => (
                      <Box
                        key={file.path}
                        onClick={() => { openArtifactViewer(file); setDocsAnchor(null) }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 0.5,
                          pl: 1,
                          borderRadius: 0.5,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <DescriptionIcon sx={{ fontSize: 14, color: getArtifactTypeColor(file.type) }} />
                        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                          {file.displayName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.6rem',
                            px: 0.5,
                            py: 0.125,
                            borderRadius: 0.5,
                            bgcolor: getArtifactTypeColor(file.type),
                            color: 'white',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {getArtifactTypeLabel(file.type)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </Box>
      </Popover>
    </AppBar>
  )
}
