import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import { useStore } from '../../store'
import { computeSetupProgress } from '../../utils/parseBmadHelp'
import { loadProjectData } from '../../hooks/useProjectData'
import ProgressTab from './ProgressTab'
import AgentsTab from './AgentsTab'
import WorkflowsTab from './WorkflowsTab'

export default function SetupGuide() {
  const setupProgress = useStore((state) => state.setupProgress)
  const boardAvailable = useStore((state) => state.boardAvailable)
  const [tab, setTab] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const outputFolder = useStore.getState().outputFolder
      const progress = await computeSetupProgress(outputFolder)
      useStore.getState().setSetupProgress(progress)

      if (progress.boardReady && !boardAvailable) {
        await loadProjectData()
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }, [boardAvailable])

  const percent = setupProgress?.percentComplete ?? 0

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        px: { xs: 2, sm: 4, md: 6 },
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Project Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View project progress, agents, and workflows.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Refresh progress">
              <IconButton onClick={handleRefresh} disabled={refreshing} sx={{ color: 'text.secondary' }}>
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Close setup guide">
              <IconButton onClick={() => useStore.getState().setViewMode('board')} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Progress bar */}
        {setupProgress && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {setupProgress.requiredCompleted} of {setupProgress.requiredTotal} required steps complete
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {percent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percent}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'action.hover',
              }}
            />
          </Box>
        )}

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Setup Progress" />
          <Tab label="Agents" />
          <Tab label="Workflows" />
        </Tabs>

        {/* Tab panels */}
        {tab === 0 && <ProgressTab />}
        {tab === 1 && <AgentsTab />}
        {tab === 2 && <WorkflowsTab />}
      </Box>
    </Box>
  )
}
