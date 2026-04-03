import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Alert,
  LinearProgress,
} from '@mui/material'
import CloudIcon from '@mui/icons-material/Cloud'
import VisibilityIcon from '@mui/icons-material/Visibility'
import LockIcon from '@mui/icons-material/Lock'
import { useStore } from '../../store'
import { githubApi } from '../../services/githubApi'
import { loadToken, saveToken } from '../../services/tokenManager'
import { setRemoteContext, listDirectory } from '../../services/remoteFileReader'
import type { ProjectType } from '../../types'

interface OpenRemoteDialogProps {
  open: boolean
  onClose: () => void
}

export default function OpenRemoteDialog({ open, onClose }: OpenRemoteDialogProps) {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addRecentProject = useStore((s) => s.addRecentProject)
  const setProjectName = useStore((s) => s.setProjectName)
  const setProjectType = useStore((s) => s.setProjectType)
  const setOutputFolder = useStore((s) => s.setOutputFolder)
  const setIsRemoteProject = useStore((s) => s.setIsRemoteProject)
  const setRemoteProjectUrl = useStore((s) => s.setRemoteProjectUrl)
  const setRemoteOwner = useStore((s) => s.setRemoteOwner)
  const setRemoteRepo = useStore((s) => s.setRemoteRepo)
  const setRemoteViewingBranch = useStore((s) => s.setRemoteViewingBranch)
  const setHasGitHubToken = useStore((s) => s.setHasGitHubToken)
  const setViewMode = useStore((s) => s.setViewMode)

  useEffect(() => {
    if (open) {
      loadToken().then((t) => {
        if (t) {
          setToken(t)
          setHasGitHubToken(true)
        }
      })
      setUrl('')
      setError(null)
      setLoading(false)
    }
  }, [open, setHasGitHubToken])

  const handleOpen = async () => {
    if (!url.trim()) {
      setError('Enter a GitHub URL or owner/repo')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { owner, repo } = githubApi.parseUrl(url.trim())

      useStore.getState().setLoadingStatus('Connecting to repository…')

      const defaultBranch = await githubApi.getDefaultBranch(owner, repo, token || undefined)

      useStore.getState().setLoadingStatus('Fetching file tree…')

      await setRemoteContext(owner, repo, defaultBranch, token || undefined)

      useStore.getState().setLoadingStatus('Detecting project type…')

      let detectedType: ProjectType = 'bmm'
      const bmadDir = await listDirectory('_bmad')
      console.log('[OpenRemote] _bmad dir scan:', bmadDir)
      if (!bmadDir.error && bmadDir.dirs.includes('gds')) {
        detectedType = 'gds'
      }
      console.log('[OpenRemote] Detected project type:', detectedType)

      let outputFolder = '_bmad-output'
      if (detectedType === 'bmm') {
        const configResult = await listDirectory('_bmad/_memory')
        if (!configResult.error && configResult.files.includes('config.yaml')) {
          const configRead = await import('../../services/remoteFileReader').then(m => m.readFile('_bmad/_memory/config.yaml'))
          if (configRead.content) {
            const match = configRead.content.match(/^outputFolder:\s*['"]?([^'"\n]+)['"]?/m)
            if (match) outputFolder = match[1].trim()
          }
        }
      }
      console.log('[OpenRemote] outputFolder =', outputFolder)

      setProjectName(`${owner}/${repo}`)
      setProjectType(detectedType)
      setOutputFolder(outputFolder)
      setIsRemoteProject(true)
      setRemoteProjectUrl(url.trim())
      setRemoteOwner(owner)
      setRemoteRepo(repo)
      setRemoteViewingBranch(defaultBranch)
      setViewMode('board')

      addRecentProject({
        name: `${owner}/${repo}`,
        projectType: detectedType,
        isRemote: true,
        remoteUrl: url.trim(),
      })

      if (token) {
        await saveToken(token)
        setHasGitHubToken(true)
      }

      console.log('[OpenRemote] Done, closing dialog')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to repository'
      console.error('[OpenRemote] Error:', msg, err)
      if (msg.includes('403') || msg.includes('401') || msg.includes('could not read') || msg.includes('authentication')) {
        setError('Authentication failed. Check your token or repository access.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudIcon fontSize="small" />
        Open Remote Project
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Open a GitHub repository to view as a read-only sprint board.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            HTTPS URLs only — use owner/repo shorthand or https://github.com/owner/repo
          </Typography>
        </Box>

        <TextField
          label="GitHub URL"
          placeholder="e.g. owner/repo or https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          error={!!error && !url.trim()}
        />

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="GitHub Token (optional)"
              placeholder="ghp_... or github_pat_..."
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              fullWidth
              size="small"
              sx={{ flex: 1 }}
            />
            <IconButton
              size="small"
              onClick={() => setShowToken(!showToken)}
              sx={{ color: 'text.secondary' }}
            >
              {showToken ? <VisibilityIcon sx={{ fontSize: 18 }} /> : <LockIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Required for private repos. Create a fine-grained token at GitHub → Settings → Developer settings → Fine-grained tokens with <strong>Contents: Read-only</strong>.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleOpen}
          disabled={loading || !url.trim()}
          startIcon={loading ? undefined : <CloudIcon />}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Connecting...' : 'Open Remote'}
        </Button>
      </DialogActions>
      {loading && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress sx={{ width: 16 }} />
            <Typography variant="body2" color="text.secondary">
              Connecting to repository...
            </Typography>
          </Box>
        </Box>
      )}
      {error && !loading && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 3, mb: 2 }}>
          {error}
        </Alert>
      )}
    </Dialog>
  )
}
