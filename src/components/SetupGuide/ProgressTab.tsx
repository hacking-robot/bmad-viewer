import { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { useStore } from '../../store'
import { transformCommand } from '../../utils/commandTransform'
import type { SetupStep } from '../../types/bmadScan'

const PHASE_INFO: Record<string, { label: string; tier: string; color: string }> = {
  '1-analysis': { label: 'Phase 1 — Analysis', tier: 'Recommended', color: 'info' },
  '2-planning': { label: 'Phase 2 — Planning', tier: 'Required', color: 'warning' },
  '3-solutioning': { label: 'Phase 3 — Solutioning', tier: 'Required', color: 'warning' },
  '4-implementation': { label: 'Phase 4 — Implementation', tier: 'Required', color: 'warning' },
}

function getPhaseInfo(phase: string) {
  return PHASE_INFO[phase] || { label: phase, tier: 'Optional', color: 'default' }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'}>
      <IconButton size="small" onClick={handleCopy}
        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
      >
        {copied ? (
          <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
        ) : (
          <ContentCopyIcon sx={{ fontSize: 14 }} />
        )}
      </IconButton>
    </Tooltip>
  )
}

function StepCard({ step, number }: { step: SetupStep; number: number }) {
  const command = `/${step.name}`
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.5,
      p: 1.5,
      borderRadius: 1,
      border: 1,
      borderColor: step.completed ? 'success.main' : 'divider',
      bgcolor: step.completed ? 'success.main' : 'background.paper',
      opacity: step.completed ? 0.85 : 1,
    }}>
      <Box sx={{ mt: 0.25 }}>
        {step.completed ? (
          <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {number}. {step.label}
          </Typography>
          {step.agentName && (
            <Chip
              label={step.agentName}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>
        {step.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            {step.description}
          </Typography>
        )}
        <Box sx={{
          p: 0.5, px: 1, bgcolor: 'background.default', borderRadius: 0.5,
          border: 1, borderColor: 'divider', fontFamily: 'monospace', fontSize: '0.7rem',
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
        }}>
          <span>{transformCommand(command)}</span>
          <CopyButton text={command} />
        </Box>
      </Box>
    </Box>
  )
}

export default function ProgressTab() {
  const setupProgress = useStore((state) => state.setupProgress)
  const steps = setupProgress?.steps || []

  if (steps.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No setup steps detected. Click Refresh to scan the project.
      </Typography>
    )
  }

  // Group steps by phase
  const phaseGroups: Record<string, SetupStep[]> = {}
  for (const step of steps) {
    const phase = step.phase || 'other'
    if (!phaseGroups[phase]) phaseGroups[phase] = []
    phaseGroups[phase].push(step)
  }

  // Sort phase keys by phase number
  const sortedPhases = Object.keys(phaseGroups).sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '99')
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '99')
    return numA - numB
  })

  let stepNumber = 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {sortedPhases.map((phase) => {
        const info = getPhaseInfo(phase)
        const phaseSteps = phaseGroups[phase]
        return (
          <Box key={phase}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {info.label}
              </Typography>
              <Chip
                label={info.tier}
                size="small"
                color={info.color as 'info' | 'warning' | 'default'}
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {phaseSteps.map((step) => {
                stepNumber++
                return <StepCard key={step.id} step={step} number={stepNumber} />
              })}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
