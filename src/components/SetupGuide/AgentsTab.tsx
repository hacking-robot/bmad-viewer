import { useState } from 'react'
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useStore } from '../../store'
import { transformCommand } from '../../utils/commandTransform'

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

export default function AgentsTab() {
  const setupProgress = useStore((state) => state.setupProgress)
  const bmadScanResult = useStore((state) => state.bmadScanResult)

  // Prefer agents from setup progress (parsed from agent-manifest.csv),
  // fall back to scanned agents from bmadScanResult
  const agents = setupProgress?.agents?.length
    ? setupProgress.agents.map(a => ({
        id: a.name,
        name: a.displayName,
        title: a.title,
        icon: a.icon,
        role: a.role,
        module: a.module,
        command: `/${a.name}`,
      }))
    : (bmadScanResult?.agents || []).map(a => ({
        id: a.id,
        name: a.name,
        title: a.title || a.role,
        icon: a.icon,
        role: a.role,
        module: a.module,
        command: `/${a.id}`,
      }))

  if (agents.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No agents detected. Click Refresh to scan the project.
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
      {agents.map((agent) => (
        <Box
          key={agent.id}
          sx={{
            p: 2,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'relative',
          }}
        >
          {agent.module && (
            <Chip
              label={agent.module.toUpperCase()}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 600,
              }}
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: '1rem', bgcolor: 'primary.main' }}>
              {agent.icon || agent.name[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>
                {agent.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {agent.title}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem', lineHeight: 1.4 }}>
            {agent.role.length > 120 ? agent.role.slice(0, 120) + '...' : agent.role}
          </Typography>
          <Box sx={{
            p: 0.5, px: 1, bgcolor: 'background.default', borderRadius: 0.5,
            border: 1, borderColor: 'divider', fontFamily: 'monospace', fontSize: '0.7rem',
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
          }}>
            <span>{transformCommand(agent.command)}</span>
            <CopyButton text={agent.command} />
          </Box>
        </Box>
      ))}
    </Box>
  )
}
