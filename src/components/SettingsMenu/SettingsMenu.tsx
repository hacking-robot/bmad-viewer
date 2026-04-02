import { useState, useRef } from 'react'
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import CloseIcon from '@mui/icons-material/Close'
import { useStore } from '../../store'
import { themeList, base24Schemes } from '../../data/themes'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const themeBeforePreview = useRef<string | null>(null)

  const colorTheme = useStore((state) => state.colorTheme)
  const setColorTheme = useStore((state) => state.setColorTheme)

  const handleOpen = () => {
    themeBeforePreview.current = colorTheme
    setSearchQuery('')
    setOpen(true)
  }

  const handleCancel = () => {
    if (themeBeforePreview.current) {
      setColorTheme(themeBeforePreview.current)
      themeBeforePreview.current = null
    }
    setOpen(false)
  }

  const handleSave = () => {
    themeBeforePreview.current = null
    setOpen(false)
  }

  return (
    <>
      <Tooltip title="Theme Settings">
        <IconButton
          onClick={handleOpen}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="xs"
        fullWidth
        hideBackdrop
        sx={{ pointerEvents: 'none', '& .MuiDialog-paper': { pointerEvents: 'auto' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Color Theme
          <IconButton size="small" onClick={handleCancel}>
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
          <Button onClick={handleCancel}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
