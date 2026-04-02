import { Card, CardContent, Typography, Box, Chip, Tooltip } from '@mui/material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DescriptionIcon from '@mui/icons-material/Description'
import PersonIcon from '@mui/icons-material/Person'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Story, EPIC_COLORS } from '../../types'
import { useStore } from '../../store'
import { useRequirementLookup } from '../../hooks/useRequirementLookup'

interface StoryCardProps {
  story: Story
  isDragging?: boolean
  disableDrag?: boolean
  isLocked?: boolean
}

export default function StoryCard({ story, isDragging = false, disableDrag = false, isLocked = false }: StoryCardProps) {
  const setSelectedStory = useStore((state) => state.setSelectedStory)
  const { openRequirement } = useRequirementLookup()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isBeingDragged } = useSortable({
    id: story.id,
    disabled: disableDrag
  })
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isBeingDragged ? 1000 : undefined
  }

  const preventDragOnInteractive = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  const epicColor = EPIC_COLORS[(story.epicId - 1) % EPIC_COLORS.length]

  const handleClick = () => {
    setSelectedStory(story)
  }

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      elevation={0}
      sx={{
        border: 1,
        borderColor: isLocked
          ? 'action.disabled'
          : isDragging ? 'primary.main' : 'divider',
        position: 'relative',
        cursor: isLocked ? 'default' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        opacity: isLocked ? 0.5 : isBeingDragged ? 0.3 : isDragging ? 0.9 : 1,
        boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.2)' : 'none',
        '&:hover': isLocked ? {} : {
          borderColor: 'primary.main',
          transform: isDragging ? 'none' : 'translateY(-2px)',
          boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)'
        },
        ...dragStyle,
        transition: isBeingDragged ? dragStyle.transition : 'all 0.15s ease',
        touchAction: 'none'
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            label={`Story ${story.epicId}.${story.storyNumber}`}
            size="small"
            onPointerDown={preventDragOnInteractive}
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: epicColor,
              color: 'white',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          {story.points !== undefined && story.points !== null && (
            <Chip
              label={`${story.points} pts`}
              size="small"
              onPointerDown={preventDragOnInteractive}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: 'success.dark',
                color: 'white',
                '& .MuiChip-label': { px: 0.75 }
              }}
            />
          )}
          {story.filePath && (
            <Tooltip title="Tasks and Implementation notes available" arrow placement="top">
              <DescriptionIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
        </Box>

        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: 'text.primary',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {story.title}
        </Typography>

        {story.epicDescription && (
          <Tooltip title={story.epicDescription.replace(/\*\*/g, '').slice(0, 150) + (story.epicDescription.length > 150 ? '...' : '')} arrow placement="bottom">
            <Box
              sx={{
                mt: 1,
                color: 'text.secondary',
                fontStyle: 'italic',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
                fontSize: '0.75rem',
                '& p': { m: 0 },
                '& ul, & ol': { m: 0, pl: 2 },
                '& code': { fontSize: '0.7rem' }
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{story.epicDescription}</ReactMarkdown>
            </Box>
          </Tooltip>
        )}

        {(story.frsAddressed?.length || story.nfrsAddressed?.length || story.archAddressed?.length || story.arAddressed?.length) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {story.frsAddressed?.map((fr) => (
              <Chip key={fr} label={fr} size="small" onClick={(e) => { e.stopPropagation(); openRequirement(fr) }} onPointerDown={preventDragOnInteractive} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#ed6c02', color: 'white', cursor: 'pointer', '& .MuiChip-label': { px: 0.75 } }} />
            ))}
            {story.nfrsAddressed?.map((nfr) => (
              <Chip key={nfr} label={nfr} size="small" onClick={(e) => { e.stopPropagation(); openRequirement(nfr) }} onPointerDown={preventDragOnInteractive} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#7b1fa2', color: 'white', cursor: 'pointer', '& .MuiChip-label': { px: 0.75 } }} />
            ))}
            {story.archAddressed?.map((arch) => (
              <Chip key={arch} label={arch} size="small" onClick={(e) => { e.stopPropagation(); openRequirement(arch) }} onPointerDown={preventDragOnInteractive} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#00838f', color: 'white', cursor: 'pointer', '& .MuiChip-label': { px: 0.75 } }} />
            ))}
            {story.arAddressed?.map((ar) => (
              <Chip key={ar} label={ar} size="small" onClick={(e) => { e.stopPropagation(); openRequirement(ar) }} onPointerDown={preventDragOnInteractive} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#558b2f', color: 'white', cursor: 'pointer', '& .MuiChip-label': { px: 0.75 } }} />
            ))}
          </Box>
        )}

        {story.assignee && (
          <Box sx={{ display: 'flex', mt: 1 }}>
            <Chip
              icon={<PersonIcon sx={{ fontSize: '12px !important' }} />}
              label={story.assignee}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 }, '& .MuiChip-icon': { ml: 0.5 } }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
