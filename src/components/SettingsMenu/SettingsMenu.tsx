import { useState, useRef, useCallback } from 'react'
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Slider,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import CloseIcon from '@mui/icons-material/Close'
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings'
import PaletteIcon from '@mui/icons-material/Palette'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LinkIcon from '@mui/icons-material/Link'
import { useStore } from '../../store'
import { themeList, base24Schemes } from '../../data/themes'

export default function SettingsMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [displaySubAnchor, setDisplaySubAnchor] = useState<null | HTMLElement>(null)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false)
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const themeBeforePreview = useRef<string | null>(null)

  const colorTheme = useStore((state) => state.colorTheme)
  const setColorTheme = useStore((state) => state.setColorTheme)
  const zoomLevel = useStore((state) => state.zoomLevel)
  const setZoomLevel = useStore((state) => state.setZoomLevel)
  const jiraDomain = useStore((state) => state.jiraDomain)
  const setJiraDomain = useStore((state) => state.setJiraDomain)
  const [jiraInput, setJiraInput] = useState('')

  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setDisplaySubAnchor(null)
  }

  const closeAllSubs = useCallback(() => {
    setDisplaySubAnchor(null)
  }, [])

  const openSub = useCallback((setter: (el: HTMLElement | null) => void) => (e: React.MouseEvent<HTMLElement>) => {
    closeAllSubs()
    setter(e.currentTarget)
  }, [closeAllSubs])

  const handleThemePickerOpen = () => {
    setDisplaySubAnchor(null)
    handleClose()
    themeBeforePreview.current = colorTheme
    setSearchQuery('')
    setThemePickerOpen(true)
  }

  const handleThemePickerClose = () => {
    if (themeBeforePreview.current) {
      setColorTheme(themeBeforePreview.current)
      themeBeforePreview.current = null
    }
    setThemePickerOpen(false)
  }

  const handleThemePickerSave = () => {
    themeBeforePreview.current = null
    setThemePickerOpen(false)
  }

  return (
    <>
      <Tooltip title="Settings">
        <IconButton onClick={handleClick} size="small" sx={{ color: 'text.secondary' }}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <MenuItem onClick={openSub(setDisplaySubAnchor)}>
          <ListItemIcon><DisplaySettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary="Display"
            secondary={base24Schemes[colorTheme]?.name || colorTheme}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
          <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary', ml: 1 }} />
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); setJiraInput(jiraDomain); setJiraDialogOpen(true) }}>
          <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary="Jira Domain"
            secondary={jiraDomain || 'Not set'}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
      </Menu>

      {/* Display Submenu */}
      <Menu
        anchorEl={displaySubAnchor}
        open={Boolean(displaySubAnchor)}
        onClose={() => setDisplaySubAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        <MenuItem onClick={handleThemePickerOpen}>
          <ListItemIcon><PaletteIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary="Color Theme"
            secondary={base24Schemes[colorTheme]?.name || colorTheme}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
        <MenuItem onClick={() => { setDisplaySubAnchor(null); handleClose(); setZoomDialogOpen(true) }}>
          <ListItemIcon><ZoomInIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary="Zoom Level"
            secondary={`${zoomLevel}%`}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
      </Menu>

      {/* Theme Picker Dialog */}
      <Dialog
        open={themePickerOpen}
        onClose={handleThemePickerClose}
        maxWidth="xs"
        fullWidth
        hideBackdrop
        sx={{ pointerEvents: 'none', '& .MuiDialog-paper': { pointerEvents: 'auto' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Color Theme
          <IconButton size="small" onClick={handleThemePickerClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            placeholder="Search themes..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, px: 0.5 }}>
            {searchQuery
              ? `${themeList.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).length} of ${themeList.length} themes`
              : `${themeList.length} themes`
            }
          </Typography>
          <Box
            sx={{
              maxHeight: 400,
              overflow: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            {(['dark', 'light'] as const).map((variant) => {
              const filtered = themeList.filter(
                (t) => t.variant === variant &&
                  t.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              if (filtered.length === 0) return null
              return (
                <Box key={variant}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      display: 'block',
                      fontWeight: 600,
                      bgcolor: 'background.paper',
                      borderBottom: 1,
                      borderColor: 'divider',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >
                    {variant === 'dark' ? 'Dark Themes' : 'Light Themes'}
                  </Typography>
                  {filtered.map((option) => {
                    const scheme = base24Schemes[option.slug]
                    const p = scheme?.palette
                    const swatchColors = p ? [
                      `#${p.base08}`, `#${p.base0A}`, `#${p.base0B}`, `#${p.base0D}`, `#${p.base0E}`
                    ] : []
                    const isActive = option.slug === colorTheme
                    return (
                      <Box
                        key={option.slug}
                        onClick={() => setColorTheme(option.slug)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 0.75,
                          cursor: 'pointer',
                          bgcolor: isActive ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          {swatchColors.map((color, i) => (
                            <Box
                              key={i}
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                bgcolor: color,
                                border: 1,
                                borderColor: 'divider'
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" noWrap>
                          {option.name}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleThemePickerClose}>Cancel</Button>
          <Button variant="contained" onClick={handleThemePickerSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Zoom Dialog */}
      <Dialog
        open={zoomDialogOpen}
        onClose={() => setZoomDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        hideBackdrop
        sx={{ pointerEvents: 'none', '& .MuiDialog-paper': { pointerEvents: 'auto' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Zoom Level
          <IconButton size="small" onClick={() => setZoomDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 2 }}>
            <Slider
              value={zoomLevel}
              onChange={(_, value) => setZoomLevel(value as number)}
              min={50}
              max={200}
              step={10}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}%`}
              sx={{ flex: 1 }}
            />
            <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
              {zoomLevel}%
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Jira Domain Dialog */}
      <Dialog
        open={jiraDialogOpen}
        onClose={() => { setJiraDomain(jiraInput.trim()); setJiraDialogOpen(false) }}
        maxWidth="xs"
        fullWidth
        hideBackdrop
        sx={{ pointerEvents: 'none', '& .MuiDialog-paper': { pointerEvents: 'auto' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Jira Domain
          <IconButton size="small" onClick={() => { setJiraDomain(jiraInput.trim()); setJiraDialogOpen(false) }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            placeholder="e.g. mycompany.atlassian.net"
            size="small"
            fullWidth
            value={jiraInput}
            onChange={(e) => setJiraInput(e.target.value)}
            helperText={jiraInput ? `Links will open: https://${jiraInput}/browse/...` : 'Not set'}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setJiraDomain(jiraInput.trim()); setJiraDialogOpen(false) }}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
