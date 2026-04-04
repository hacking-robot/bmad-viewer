import { useState } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useStore } from '../../store'
import { useWorkflow } from '../../hooks/useWorkflow'
import { transformCommand } from '../../utils/commandTransform'
import type { NextStepAction, ProjectWorkflowPhase } from '../../types/flow'
import type { ScannedWorkflow } from '../../types/bmadScan'

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

function CommandBox({ command }: { command: string }) {
  return (
    <Box sx={{
      p: 0.5, px: 1, bgcolor: 'background.default', borderRadius: 0.5,
      border: 1, borderColor: 'divider', fontFamily: 'monospace', fontSize: '0.7rem',
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
    }}>
      <span>{transformCommand(command)}</span>
      <CopyButton text={command} />
    </Box>
  )
}

function ModuleHeader({ name }: { name: string }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ ml: 1, mb: 0.5, display: 'block' }}>
      {name}
    </Typography>
  )
}

function WorkflowAccordion({ label, description, command, module }: {
  label: string
  description: string
  command: string
  module?: string
}) {
  return (
    <Accordion disableGutters sx={{ '&:before': { display: 'none' }, mb: 0.5 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {label}
          </Typography>
          {module && (
            <Chip label={module.toUpperCase()} size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0 }}>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
            {description}
          </Typography>
        )}
        {command && <CommandBox command={command} />}
      </AccordionDetails>
    </Accordion>
  )
}

export default function WorkflowsTab() {
  const bmadScanResult = useStore((state) => state.bmadScanResult)
  const setupProgress = useStore((state) => state.setupProgress)
  const { getProjectWorkflows } = useWorkflow()

  // Try three data sources in order of preference
  const projectWorkflows = getProjectWorkflows()
  const scannedWorkflows: ScannedWorkflow[] = bmadScanResult?.workflows || []
  const csvSteps = setupProgress?.steps || []

  // Source 1: merged project workflows from flow config
  const hasProjectWorkflows = Object.keys(projectWorkflows).length > 0
  // Source 2: scanned workflows from _bmad/ directory
  const hasScannedWorkflows = scannedWorkflows.length > 0
  // Source 3: CSV steps from bmad-help.csv
  const hasCsvSteps = csvSteps.length > 0

  if (!hasProjectWorkflows && !hasScannedWorkflows && !hasCsvSteps) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No workflows detected. Click Refresh to scan the project.
      </Typography>
    )
  }

  // Sort keys by leading number (e.g. "1-analysis" → 1, "2-planning" → 2)
  const sortByPhaseNum = (a: string, b: string) => {
    const na = parseInt(a.match(/^(\d+)/)?.[1] || '99')
    const nb = parseInt(b.match(/^(\d+)/)?.[1] || '99')
    return na - nb
  }

  return (
    <Box>
      {/* Source 1: Project workflows from flow config */}
      {hasProjectWorkflows && Object.entries(projectWorkflows)
        .sort(([a], [b]) => sortByPhaseNum(a, b))
        .map(([phaseKey, phase]: [string, ProjectWorkflowPhase]) => (
        <Box key={phaseKey} sx={{ mb: 2 }}>
          <ModuleHeader name={phase.label} />
          {phase.workflows.map((wf: NextStepAction) => (
            <WorkflowAccordion
              key={wf.command}
              label={wf.label}
              description={wf.description}
              command={wf.command}
            />
          ))}
        </Box>
      ))}

      {/* Source 2: Scanned workflows */}
      {hasScannedWorkflows && !hasProjectWorkflows && (() => {
        const grouped: Record<string, ScannedWorkflow[]> = {}
        for (const wf of scannedWorkflows) {
          const mod = wf.module || 'other'
          if (!grouped[mod]) grouped[mod] = []
          grouped[mod].push(wf)
        }
        return Object.entries(grouped)
          .sort(([a], [b]) => sortByPhaseNum(a, b))
          .map(([mod, wfs]) => (
          <Box key={mod} sx={{ mb: 2 }}>
            <ModuleHeader name={mod} />
            {wfs.map((wf) => (
              <WorkflowAccordion
                key={wf.name}
                label={wf.name}
                description={wf.description}
                command={`/${wf.name}`}
                module={wf.module}
              />
            ))}
          </Box>
        ))
      })()}

      {/* Source 3: CSV steps */}
      {hasCsvSteps && !hasProjectWorkflows && !hasScannedWorkflows && (() => {
        const grouped: Record<string, typeof csvSteps> = {}
        for (const step of csvSteps) {
          const phase = step.phase || 'other'
          if (!grouped[phase]) grouped[phase] = []
          grouped[phase].push(step)
        }
        return Object.entries(grouped)
          .sort(([a], [b]) => sortByPhaseNum(a, b))
          .map(([phase, steps]) => (
          <Box key={phase} sx={{ mb: 2 }}>
            <ModuleHeader name={phase} />
            {steps.map((step) => (
              <WorkflowAccordion
                key={step.id}
                label={step.label}
                description={step.description}
                command={`/${step.name}`}
                module={step.moduleName}
              />
            ))}
          </Box>
        ))
      })()}
    </Box>
  )
}
