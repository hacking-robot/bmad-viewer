import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
import CloudIcon from '@mui/icons-material/Cloud'
import { useStore } from '../../store'
import { githubApi } from '../../services/githubApi'
import { loadToken } from '../../services/tokenManager'
import { setRemoteContext } from '../../services/remoteFileReader'
import { loadProjectData } from '../../hooks/useProjectData'

export default function RemoteBranchTrigger() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const remoteViewingBranch = useStore((s) => s.remoteViewingBranch)
  const isRemoteProject = useStore((s) => s.isRemoteProject)
  const remoteOwner = useStore((s) => s.remoteOwner)
  const remoteRepo = useStore((s) => s.remoteRepo)
  const setRemoteViewingBranch = useStore((s) => s.setRemoteViewingBranch)

  useEffect(() => {
    if (isRemoteProject && remoteOwner && remoteRepo) {
      loadBranches()
    }
  }, [isRemoteProject, remoteOwner, remoteRepo])

  const loadBranches = async () => {
    if (!remoteOwner || !remoteRepo) return
    setLoading(true)
    try {
      const token = await loadToken()
      const list = await githubApi.listBranches(remoteOwner, remoteRepo, token || undefined)
      setBranches(list)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleBranchSelect = async (branch: string) => {
    if (!remoteOwner || !remoteRepo) return
    setAnchorEl(null)
    setLoading(true)
    try {
      const token = await loadToken()
      await setRemoteContext(remoteOwner, remoteRepo, branch, token || undefined)
      setRemoteViewingBranch(branch)
      await loadProjectData()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (!isRemoteProject) return null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={remoteViewingBranch || 'Remote branch'}>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: 'text.secondary' }}
        >
          {loading ? <LinearProgress /> : <CloudIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Tooltip>

      {remoteViewingBranch && (
        <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 120 }} noWrap>
          {remoteViewingBranch}
        </Typography>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Switch branch
        </Typography>
        <Divider />
        {branches.map((branch) => (
          <MenuItem
            key={branch}
            selected={branch === remoteViewingBranch}
            onClick={() => handleBranchSelect(branch)}
            sx={{ fontSize: '0.8rem' }}
          >
            {branch}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
