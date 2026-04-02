import { useMemo, useEffect } from 'react'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material'
import { useStore } from './store'
import { lightTheme, createBase24Theme } from './theme'
import { useResolvedTheme } from './hooks/useResolvedTheme'
import { useProjectDataEffects } from './hooks/useProjectData'
import Header from './components/Header/Header'
import Board from './components/Board/Board'
import { Dashboard } from './components/Dashboard'
import StoryDialog from './components/StoryDialog/StoryDialog'
import WelcomeDialog from './components/WelcomeDialog/WelcomeDialog'
import StatusBar from './components/StatusBar'
import ArtifactViewer from './components/ArtifactViewer/ArtifactViewer'
import { hasBoardModule } from './utils/projectTypes'

const muiCache = createCache({ key: 'mui', prepend: true })
let prevSchemeSlug: string | null = null

export default function App() {
  const hasHydrated = useStore((state) => state._hasHydrated)
  const projectName = useStore((state) => state.projectName)
  const bmadScanResult = useStore((state) => state.bmadScanResult)
  const projectType = useStore((state) => state.projectType)
  const viewMode = useStore((state) => state.viewMode)
  const setViewMode = useStore((state) => state.setViewMode)

  const artifactViewerFile = useStore((state) => state.artifactViewerFile)
  const artifactViewerScrollTo = useStore((state) => state.artifactViewerScrollTo)
  const closeArtifactViewer = useStore((state) => state.closeArtifactViewer)

  const zoomLevel = useStore((state) => state.zoomLevel)

  useEffect(() => {
    const el = document.getElementById('app-content')
    if (!el) return
    if (zoomLevel !== 100) {
      el.style.zoom = `${zoomLevel}%`
      el.style.height = `${10000 / zoomLevel}vh`
    } else {
      el.style.zoom = ''
      el.style.height = '100vh'
    }
  }, [zoomLevel])

  useProjectDataEffects()

  const hasBrd = bmadScanResult?.modules ? hasBoardModule(bmadScanResult.modules) : projectType !== 'dashboard'

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (projectType === 'dashboard') {
          setViewMode('dashboard')
        } else if (hasBrd && viewMode === 'board') {
          setViewMode('dashboard')
        } else if (hasBrd && viewMode === 'dashboard') {
          setViewMode('board')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, projectType, hasBrd, setViewMode])

  const { scheme, slug } = useResolvedTheme()

  if (prevSchemeSlug !== null && prevSchemeSlug !== slug) {
    muiCache.sheet.flush()
    for (const key of Object.keys(muiCache.inserted)) delete muiCache.inserted[key]
    for (const key of Object.keys(muiCache.registered)) delete muiCache.registered[key]
  }
  prevSchemeSlug = slug

  const theme = useMemo(
    () => createBase24Theme(scheme),
    [scheme]
  )

  const setThemeMode = useStore((state) => state.setThemeMode)
  const themeMode = useStore((state) => state.themeMode)
  useEffect(() => {
    if (scheme.variant !== themeMode) {
      setThemeMode(scheme.variant)
    }
  }, [scheme.variant, themeMode, setThemeMode])

  if (!hasHydrated) {
    return (
      <CacheProvider value={muiCache}>
        <ThemeProvider theme={lightTheme}>
          <CssBaseline />
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.default',
            }}
          >
            <CircularProgress />
          </Box>
        </ThemeProvider>
      </CacheProvider>
    )
  }

  return (
    <CacheProvider value={muiCache}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        id="app-content"
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          overflow: 'hidden'
        }}
      >
        {!projectName ? (
          <WelcomeDialog />
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Header />
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {hasBrd ? <Board /> : <Dashboard />}
                <StatusBar />
              </Box>
            </Box>
          </Box>
        )}
        {hasBrd && projectName && <StoryDialog />}
        <ArtifactViewer
          artifact={artifactViewerFile}
          scrollToText={artifactViewerScrollTo}
          onClose={closeArtifactViewer}
        />
      </Box>
    </ThemeProvider>
    </CacheProvider>
  )
}
