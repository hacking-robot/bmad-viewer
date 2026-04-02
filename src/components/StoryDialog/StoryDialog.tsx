import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tooltip,
  Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import VerifiedIcon from '@mui/icons-material/Verified'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PersonIcon from '@mui/icons-material/Person'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { useStore } from '../../store'
import { useThemedSyntax } from '../../hooks/useThemedSyntax'
import { useRequirementLookup } from '../../hooks/useRequirementLookup'
import { EPIC_COLORS, STATUS_COLUMNS } from '../../types'



const createCodeBlock = (
  prismStyle: Record<string, React.CSSProperties>,
  codeColors: { background: string; color: string }
): Components['code'] => {
  return ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    const codeString = String(children).replace(/\n$/, '')
    const isInline = !match && !codeString.includes('\n')

    if (isInline) {
      return (
        <code
          style={{
            backgroundColor: codeColors.background,
            color: codeColors.color,
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.85em'
          }}
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <SyntaxHighlighter
        style={prismStyle}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: '8px 0',
          borderRadius: 8,
          fontSize: '0.85rem'
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    )
  }
}

export default function StoryDialog() {
  const selectedStory = useStore((state) => state.selectedStory)
  const storyContent = useStore((state) => state.storyContent)
  const setSelectedStory = useStore((state) => state.setSelectedStory)
  const epics = useStore((state) => state.epics)
  const { prismStyle, inlineCodeColors } = useThemedSyntax()
  const { openRequirement } = useRequirementLookup()

  const [sidePanel, setSidePanel] = useState<'none' | 'devNotes' | 'devRecord'>('none')

  useEffect(() => {
    if (selectedStory && storyContent?.devNotes) {
      const status = selectedStory.status
      if (status === 'ready-for-dev' || status === 'in-progress') {
        setSidePanel('devNotes')
      }
    }
  }, [selectedStory?.id, storyContent?.devNotes])

  const CodeBlock = React.useMemo(() => createCodeBlock(prismStyle, inlineCodeColors), [prismStyle, inlineCodeColors])

  useEffect(() => {
    if (sidePanel === 'devRecord' && !storyContent?.developmentRecord) {
      setSidePanel('devNotes')
    }
  }, [sidePanel, storyContent?.developmentRecord])

  const handleClose = () => {
    setSidePanel('none')
    setSelectedStory(null)
  }

  if (!selectedStory) return null

  const epicColor = EPIC_COLORS[(selectedStory.epicId - 1) % EPIC_COLORS.length]
  const statusConfig = STATUS_COLUMNS.find((c) => c.status === selectedStory.status)
  const selectedEpic = epics.find((e) => e.id === selectedStory.epicId)

  return (
    <Dialog
      open={Boolean(selectedStory)}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          maxWidth: sidePanel !== 'none' ? '95vw' : 960,
          transition: 'max-width 0.3s ease'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          pr: 6
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={`Epic ${selectedStory.epicId}`}
              size="small"
              sx={{
                bgcolor: epicColor,
                color: 'white',
                fontWeight: 600
              }}
            />
            <Chip
              label={statusConfig?.label || selectedStory.status}
              size="small"
              sx={{
                bgcolor: statusConfig?.color,
                color: 'white',
                fontWeight: 600
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Story {selectedStory.epicId}.{selectedStory.storyNumber}
            </Typography>
            {selectedStory.points !== undefined && selectedStory.points !== null && (
              <Chip
                label={`${selectedStory.points} pts`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  bgcolor: 'success.dark',
                  color: 'white',
                  '& .MuiChip-label': { px: 0.75 }
                }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            {selectedStory.jiraKey && (
              <Chip
                label={selectedStory.jiraKey}
                size="small"
                sx={{ fontWeight: 600, bgcolor: '#1976d2', color: 'white' }}
              />
            )}
            {selectedStory.assignee && (
              <Chip
                icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
                label={selectedStory.assignee}
                size="small"
                variant="outlined"
                sx={{ '& .MuiChip-icon': { ml: 0.5 } }}
              />
            )}
          </Box>
        </Box>

        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
        {!storyContent && selectedStory.filePath ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 2
            }}
          >
            <CircularProgress size={24} />
            <Typography color="text.secondary">Loading story content...</Typography>
          </Box>
        ) : (
          <>
          <Box sx={{ flex: 1, overflowY: 'auto', minWidth: 0, width: sidePanel !== 'none' ? '50%' : '100%', display: 'flex', flexDirection: 'column' }}>

            {selectedEpic && selectedEpic.goal && (
              <Accordion elevation={0} disableGutters defaultExpanded={false}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ px: 3, bgcolor: 'action.hover' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: epicColor,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Epic {selectedEpic.id}: {selectedEpic.name}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Goal:</strong> {selectedEpic.goal}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            {selectedStory.epicDescription && !storyContent && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  User Story
                </Typography>
                <Box
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    p: 2,
                    '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                    '& ul, & ol': { pl: 3, mb: 1, '& li': { mb: 0.5 } }
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>
                    {selectedStory.epicDescription}
                  </ReactMarkdown>
                </Box>
              </Box>
            )}

            {selectedStory.acceptanceCriteriaPreview && selectedStory.acceptanceCriteriaPreview.length > 0 && !storyContent && (
              <>
                <Divider />
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Acceptance Criteria
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {selectedStory.acceptanceCriteriaPreview.map((ac, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1.5, mb: 2, '&:last-child': { mb: 0 } }}>
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            mt: 0.25
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Box sx={{ flex: 1, fontSize: '0.875rem', '& p': { m: 0 }, '& ul, & ol': { pl: 2.5 } }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>
                            {ac}
                          </ReactMarkdown>
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              </>
            )}

            {selectedStory.technicalNotes && (
              <>
                <Divider />
                <Accordion elevation={0} disableGutters defaultExpanded>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ px: 3, bgcolor: 'action.hover' }}
                  >
                    <Typography variant="h6">Technical Notes</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 3 }}>
                    <Box
                      sx={{
                        '& p': { mb: 1 },
                        '& ul, & ol': { pl: 3, mb: 1 }
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>
                        {selectedStory.technicalNotes}
                      </ReactMarkdown>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </>
            )}

            {(selectedStory.frsAddressed?.length || selectedStory.nfrsAddressed?.length || selectedStory.archAddressed?.length || selectedStory.arAddressed?.length) ? (
              <>
                <Divider />
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Requirements Addressed
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedStory.frsAddressed?.map((fr, index) => (
                      <Box
                        key={`fr-${index}`}
                        onClick={() => openRequirement(fr)}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: '#ed6c02',
                          color: 'white',
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.85 }
                        }}
                      >
                        {fr}
                      </Box>
                    ))}
                    {selectedStory.nfrsAddressed?.map((nfr, index) => (
                      <Box
                        key={`nfr-${index}`}
                        onClick={() => openRequirement(nfr)}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: '#7b1fa2',
                          color: 'white',
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.85 }
                        }}
                      >
                        {nfr}
                      </Box>
                    ))}
                    {selectedStory.archAddressed?.map((arch, index) => (
                      <Box
                        key={`arch-${index}`}
                        onClick={() => openRequirement(arch)}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: '#00838f',
                          color: 'white',
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.85 }
                        }}
                      >
                        {arch}
                      </Box>
                    ))}
                    {selectedStory.arAddressed?.map((ar, index) => (
                      <Box
                        key={`ar-${index}`}
                        onClick={() => openRequirement(ar)}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          bgcolor: '#558b2f',
                          color: 'white',
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.85 }
                        }}
                      >
                        {ar}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            ) : null}

            {storyContent && (
              <>
                <Divider />

                <Box sx={{ display: 'flex', alignItems: 'center', px: 3, minHeight: 48, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: epicColor,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Story {selectedStory.epicId}.{selectedStory.storyNumber}: {selectedStory.title}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    User Story
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                      '& ul, & ol': {
                        pl: 3,
                        mb: 1,
                        '& li': { mb: 0.5 }
                      }
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>
                      {storyContent.description}
                    </ReactMarkdown>
                  </Paper>
                </Box>

                <Divider />

                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      Acceptance Criteria {storyContent.acceptanceCriteria.length > 0 ? `(${storyContent.acceptanceCriteria.length})` : ''}
                    </Typography>
                    <Tooltip title="Criteria that must be met for the story to be considered complete." arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  {storyContent.acceptanceCriteria.length > 0 ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                  <List dense disablePadding>
                    {storyContent.acceptanceCriteria.map((ac, index) => (
                      <ListItem key={ac.id} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'white',
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600
                            }}
                          >
                            {index + 1}
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ '& p': { m: 0 } }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>{ac.title}</ReactMarkdown>
                            </Box>
                          }
                          secondary={
                            ac.description ? (
                              <Box sx={{ '& p': { m: 0 } }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>{ac.description}</ReactMarkdown>
                              </Box>
                            ) : null
                          }
                          primaryTypographyProps={{ fontWeight: 500, component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  </Paper>
                  ) : storyContent.acceptanceCriteriaRaw ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                      '& ul, & ol': { pl: 3, mb: 1, '& li': { mb: 0.5 } }
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>
                      {storyContent.acceptanceCriteriaRaw}
                    </ReactMarkdown>
                  </Paper>
                  ) : null}
                </Box>

                <Divider />

                {storyContent.tasks.length > 0 && (
                  <>
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Tasks ({storyContent.tasks.filter((t) => t.completed).length}/{storyContent.tasks.length})
                        </Typography>
                        <Tooltip title="Implementation tasks." arrow>
                          <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                      <List dense disablePadding>
                        {storyContent.tasks.map((task) => (
                          <Box key={task.id}>
                            <ListItem sx={{ px: 0, py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Box
                                  sx={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: 2,
                                    borderColor: task.completed ? 'success.main' : 'action.disabled',
                                    bgcolor: task.completed ? 'success.main' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ '& p': { m: 0 } }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>{task.title}</ReactMarkdown>
                                  </Box>
                                }
                                primaryTypographyProps={{ fontWeight: 500, component: 'div', sx: { textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'text.disabled' : 'text.primary' } }}
                              />
                            </ListItem>
                            {task.subtasks.length > 0 && (
                              <List dense disablePadding sx={{ pl: 4 }}>
                                {task.subtasks.map((subtask) => (
                                  <ListItem key={subtask.id} sx={{ px: 0, py: 0.25 }}>
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                      <Box
                                        sx={{
                                          width: 16,
                                          height: 16,
                                          borderRadius: '50%',
                                          border: 1.5,
                                          borderColor: subtask.completed ? 'success.main' : 'action.disabled',
                                          bgcolor: subtask.completed ? 'success.main' : 'transparent',
                                        }}
                                      />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={
                                        <Box sx={{ '& p': { m: 0 }, fontSize: '0.875rem' }}>
                                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>{subtask.title}</ReactMarkdown>
                                        </Box>
                                      }
                                      primaryTypographyProps={{ component: 'div', sx: { textDecoration: subtask.completed ? 'line-through' : 'none', color: subtask.completed ? 'text.disabled' : 'text.primary' } }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            )}
                          </Box>
                        ))}
                      </List>
                      </Paper>
                    </Box>
                    <Divider />
                  </>
                )}

                {storyContent.fileChanges && (
                  <Accordion elevation={0} disableGutters>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ px: 3, bgcolor: 'action.hover' }}
                    >
                      <Typography variant="h6">File Changes</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 3 }}>
                      {storyContent.fileChanges.created.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                          >
                            <AddIcon fontSize="small" color="success" />
                            Created ({storyContent.fileChanges.created.length})
                          </Typography>
                          <Box
                            component="ul"
                            sx={{
                              m: 0,
                              pl: 3,
                              '& li': { fontFamily: 'monospace', fontSize: '0.875rem' }
                            }}
                          >
                            {storyContent.fileChanges.created.map((file, i) => (
                              <li key={i}>{file}</li>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {storyContent.fileChanges.modified.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                          >
                            <EditIcon fontSize="small" color="warning" />
                            Modified ({storyContent.fileChanges.modified.length})
                          </Typography>
                          <Box
                            component="ul"
                            sx={{
                              m: 0,
                              pl: 3,
                              '& li': { fontFamily: 'monospace', fontSize: '0.875rem' }
                            }}
                          >
                            {storyContent.fileChanges.modified.map((file, i) => (
                              <li key={i}>{file}</li>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {storyContent.fileChanges.verified.length > 0 && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                          >
                            <VerifiedIcon fontSize="small" color="info" />
                            Verified ({storyContent.fileChanges.verified.length})
                          </Typography>
                          <Box
                            component="ul"
                            sx={{
                              m: 0,
                              pl: 3,
                              '& li': { fontFamily: 'monospace', fontSize: '0.875rem' }
                            }}
                          >
                            {storyContent.fileChanges.verified.map((file, i) => (
                              <li key={i}>{file}</li>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}

                {(selectedStory.frsAddressed?.length || selectedStory.nfrsAddressed?.length || selectedStory.archAddressed?.length || selectedStory.arAddressed?.length) ? (
                  <>
                    <Divider />
                    <Box sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Requirements Addressed
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedStory.frsAddressed?.map((fr, index) => (
                          <Box key={`fr-${index}`} onClick={() => openRequirement(fr)} sx={{ px: 1.5, py: 0.5, bgcolor: '#ed6c02', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                            {fr}
                          </Box>
                        ))}
                        {selectedStory.nfrsAddressed?.map((nfr, index) => (
                          <Box key={`nfr-${index}`} onClick={() => openRequirement(nfr)} sx={{ px: 1.5, py: 0.5, bgcolor: '#7b1fa2', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                            {nfr}
                          </Box>
                        ))}
                        {selectedStory.archAddressed?.map((arch, index) => (
                          <Box key={`arch-${index}`} onClick={() => openRequirement(arch)} sx={{ px: 1.5, py: 0.5, bgcolor: '#00838f', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                            {arch}
                          </Box>
                        ))}
                        {selectedStory.arAddressed?.map((ar, index) => (
                          <Box key={`ar-${index}`} onClick={() => openRequirement(ar)} sx={{ px: 1.5, py: 0.5, bgcolor: '#558b2f', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', '&:hover': { opacity: 0.85 } }}>
                            {ar}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </>
                ) : null}



              </>
            )}

            {!storyContent && !selectedStory.epicDescription && !selectedStory.acceptanceCriteriaPreview && !selectedStory.technicalNotes && !selectedStory.frsAddressed && !selectedStory.nfrsAddressed && !selectedStory.archAddressed && !selectedStory.arAddressed && (
              <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">
                  No story file available. This story is still in backlog.
                </Typography>
              </Box>
            )}
          </Box>

          {(storyContent?.devNotes || storyContent?.developmentRecord) && sidePanel === 'none' && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderLeft: 1,
                borderColor: 'divider'
              }}
            >
              {storyContent?.devNotes && (
                <Box
                  onClick={() => setSidePanel('devNotes')}
                  sx={{
                    writingMode: 'vertical-rl',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    px: 0.5,
                    flex: 1,
                    cursor: 'pointer',
                    bgcolor: 'text.primary',
                    color: 'background.paper',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: 2,
                    userSelect: 'none',
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 0.85 }
                  }}
                >
                  Implementation Notes
                </Box>
              )}
              {storyContent?.developmentRecord && (
                <Box
                  onClick={() => setSidePanel('devRecord')}
                  sx={{
                    writingMode: 'vertical-rl',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    px: 0.5,
                    flex: 1,
                    cursor: 'pointer',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: 2,
                    userSelect: 'none',
                    transition: 'opacity 0.2s',
                    borderTop: storyContent?.devNotes ? 1 : 0,
                    borderColor: 'divider',
                    '&:hover': { opacity: 0.85 }
                  }}
                >
                  Dev Record
                </Box>
              )}
            </Box>
          )}

          {sidePanel !== 'none' && (sidePanel === 'devNotes' ? storyContent?.devNotes : storyContent?.developmentRecord) && (
            <>
              <Divider orientation="vertical" flexItem />
              <Box
                sx={{
                  width: '50%',
                  flexShrink: 0,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, minHeight: 48, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: epicColor,
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="subtitle2" fontWeight={600}>
                      {sidePanel === 'devNotes' ? 'Implementation Notes' : 'Development Record'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {storyContent?.devNotes && storyContent?.developmentRecord && (
                      <Chip
                        label={sidePanel === 'devNotes' ? 'Dev Record' : 'Impl Notes'}
                        size="small"
                        onClick={() => setSidePanel(sidePanel === 'devNotes' ? 'devRecord' : 'devNotes')}
                        sx={{ cursor: 'pointer', fontWeight: 500 }}
                      />
                    )}
                    <IconButton size="small" onClick={() => setSidePanel('none')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      '& h1, & h2, & h3, & h4': {
                        mt: 2,
                        mb: 1,
                        '&:first-of-type': { mt: 0 }
                      },
                      '& p': { mb: 1 },
                      '& ul, & ol': {
                        pl: 3,
                        mb: 1,
                        '& li': { mb: 0.5 }
                      },
                      '& table': {
                        width: '100%',
                        borderCollapse: 'collapse',
                        '& th, & td': {
                          border: 1,
                          borderColor: 'divider',
                          p: 1
                        },
                        '& th': {
                          bgcolor: 'action.hover',
                          fontWeight: 600
                        }
                      }
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ code: CodeBlock }}>
                      {sidePanel === 'devNotes' ? storyContent!.devNotes : storyContent!.developmentRecord!}
                    </ReactMarkdown>
                  </Paper>
                </Box>
              </Box>
            </>
          )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
