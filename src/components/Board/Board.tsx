import { useMemo, useState, useRef } from 'react'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, UniqueIdentifier } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useStore } from '../../store'
import { STATUS_COLUMNS, Story, StoryStatus } from '../../types'
import Column from './Column'
import StoryCard from '../StoryCard/StoryCard'

export default function Board() {
  const loading = useStore((state) => state.loading)
  const loadingStatus = useStore((state) => state.loadingStatus)
  const error = useStore((state) => state.error)
  const allStories = useStore((state) => state.stories)
  const selectedEpicId = useStore((state) => state.selectedEpicId)
  const searchQuery = useStore((state) => state.searchQuery)
  const selectedSprintNumber = useStore((state) => state.selectedSprintNumber)
  const sprints = useStore((state) => state.sprints)
  const collapsedColumnsByEpic = useStore((state) => state.collapsedColumnsByEpic)
  const toggleColumnCollapse = useStore((state) => state.toggleColumnCollapse)
  const storyOrder = useStore((state) => state.storyOrder)
  const setStoryOrder = useStore((state) => state.setStoryOrder)
  const isRemoteProject = useStore((s) => s.isRemoteProject)
  const remoteViewingBranch = useStore((s) => s.remoteViewingBranch)
  const isRemote = isRemoteProject || remoteViewingBranch !== null
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isRemote ? Infinity : 5
      }
    })
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const savedScrollPositionRef = useRef<number>(0)

  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [_activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const story = allStories.find((s) => s.id === active.id)
    savedScrollPositionRef.current = scrollContainerRef.current?.scrollLeft || 0
    setActiveId(active.id)
    if (story) {
      setActiveStory(story)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const savedScrollLeft = savedScrollPositionRef.current

    setActiveStory(null)
    setActiveId(null)

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = savedScrollLeft
    }

    if (!over || isRemote) return

    const storyId = active.id as string
    const overId = over.id as string
    const epicKey = selectedEpicId === null ? 'all' : String(selectedEpicId)

    const overStory = allStories.find((s) => s.id === overId)
    const story = allStories.find((s) => s.id === storyId)
    if (!overStory || !story) return

    if (story.status !== overStory.status) return

    const status = story.status
    const columnStories = allStories
      .filter((s) => s.status === status)
      .filter((s) => selectedEpicId === null || s.epicId === selectedEpicId)

    const currentOrder = storyOrder[epicKey]?.[status] || columnStories.map(s => s.id)

    const allIds = columnStories.map(s => s.id)
    const orderedIds = currentOrder.filter(id => allIds.includes(id))
    const missingIds = allIds.filter(id => !orderedIds.includes(id))
    const fullOrder = [...orderedIds, ...missingIds]

    const oldIndex = fullOrder.indexOf(storyId)
    const newIndex = fullOrder.indexOf(overId)

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newOrder = arrayMove(fullOrder, oldIndex, newIndex)
      setStoryOrder(epicKey, status, newOrder)
    }
  }

  const collapsedColumns = useMemo(() => {
    const epicKey = selectedEpicId === null ? 'all' : String(selectedEpicId)
    return collapsedColumnsByEpic[epicKey] || []
  }, [collapsedColumnsByEpic, selectedEpicId])

  const stories = useMemo(() => {
    let filtered = allStories

    if (selectedSprintNumber != null) {
      const sprint = sprints.find(s => s.sprintNumber === selectedSprintNumber)
      if (sprint) {
        const sprintStoryKeys = new Set([
          ...sprint.plannedStories.map(s => s.key),
          ...sprint.carryover.map(s => s.key),
        ])
        filtered = filtered.filter(s => sprintStoryKeys.has(s.id))
      }
    }

    if (selectedEpicId !== null) {
      filtered = filtered.filter((s) => s.epicId === selectedEpicId)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((s) =>
        s.title.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allStories, selectedSprintNumber, sprints, selectedEpicId, searchQuery])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1.5 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading project…</Typography>
        {loadingStatus && (
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
            {loadingStatus}
          </Typography>
        )}
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3, flex: 1 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  const displayColumns = STATUS_COLUMNS.filter((col) => {
    if (col.status === 'optional') return false
    if (col.status === 'human-review') return false
    return true
  })

  const sortStoriesByOrder = (columnStories: Story[], status: StoryStatus): Story[] => {
    const epicKey = selectedEpicId === null ? 'all' : String(selectedEpicId)
    const order = storyOrder[epicKey]?.[status]

    if (!order || order.length === 0) {
      return columnStories
    }

    return [...columnStories].sort((a, b) => {
      const indexA = order.indexOf(a.id)
      const indexB = order.indexOf(b.id)

      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1

      return indexA - indexB
    })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
      autoScroll={false}
    >
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <Box
          ref={scrollContainerRef}
          sx={{
            flex: 1,
            display: 'flex',
            gap: 2,
            p: 2,
            overflowX: 'auto',
            overflowY: 'hidden',
            overflowAnchor: 'none',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-track': { bgcolor: 'action.hover', borderRadius: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 4, '&:hover': { bgcolor: 'action.active' } }
          }}
        >
          {displayColumns.map((column) => {
            let columnStories = stories.filter((s) => s.status === column.status)

            if (column.status === 'backlog') {
              const displayStatuses = new Set(displayColumns.map((c) => c.status))
              const orphaned = stories.filter((s) => !displayStatuses.has(s.status))
              columnStories = [...columnStories, ...orphaned]
            }

            const sortedStories = sortStoriesByOrder(columnStories, column.status)

            return (
              <Column
                key={column.status}
                status={column.status}
                label={column.label}
                color={column.color}
                stories={sortedStories}
                isCollapsed={collapsedColumns.includes(column.status)}
                onToggleCollapse={() => toggleColumnCollapse(column.status)}
              />
            )
          })}
        </Box>
      </Box>

      <DragOverlay>
        {activeStory ? (
          <Box sx={{ opacity: 0.8, transform: 'rotate(3deg)' }}>
            <StoryCard story={activeStory} isDragging />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
