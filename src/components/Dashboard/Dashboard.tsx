import { useMemo } from 'react'
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useStore } from '../../store'
import { useWorkflow } from '../../hooks/useWorkflow'
import { transformCommand } from '../../utils/commandTransform'
import type { NextStepAction } from '../../types/flow'

export default function Dashboard() {
  const bmadScanResult = useStore((state) => state.bmadScanResult)

  const { getProjectWorkflows, agents } = useWorkflow()
  const phases = useMemo(() => getProjectWorkflows(), [getProjectWorkflows])
  const phaseEntries = Object.entries(phases)

  const modules = bmadScanResult?.modules?.filter((m: string) => m !== 'core') || []

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        px: { xs: 2, sm: 4, md: 6 },
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            BMAD Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {modules.length > 0 ? (
              <>
                Available modules: {modules.map((m: string, i: number) => (
                  <span key={m}>
                    {i > 0 && ', '}
                    <strong>{m.toUpperCase()}</strong>
                  </span>
                ))}
              </>
            ) : (
              'No BMAD modules installed'
            )}
          </Typography>
        </Box>

        {modules.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper', borderRadius: 2 }}>
            <InfoOutlinedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No BMAD modules found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Install BMAD modules to see workflows and commands here
            </Typography>
          </Box>
        )}

        {phaseEntries.map(([phase, phaseData]) => (
          <Box key={phase} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, textTransform: 'capitalize', color: 'primary.main' }}>
              {phaseData.label}
            </Typography>
            {phaseData.workflows.map((workflow: NextStepAction) => (
              <Accordion key={workflow.label} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {workflow.label}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {workflow.description}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Command:
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {workflow.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {workflow.tooltip || workflow.description}
                      </Typography>
                      <Box
                        sx={{
                          p: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        {transformCommand(workflow.command)}
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))}

        {agents.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available Agents
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {agents.map((agent) => (
                <Chip
                  key={agent.id}
                  avatar={<Avatar sx={{ bgcolor: 'primary.main' }}>{agent.name[0]}</Avatar>}
                  label={agent.name}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
