import { useMemo } from 'react'
import flowBmm from '../data/flow-bmm-stable.json'
import flowGds from '../data/flow-gds.json'
import { useStore } from '../store'
import type { StoryStatus, ProjectType } from '../types'
import type { WorkflowConfig, StatusDefinition, NextStepAction, ProjectWorkflowPhase } from '../types/flow'

const workflowBmm = flowBmm as unknown as WorkflowConfig
const workflowGds = flowGds as unknown as WorkflowConfig

function getWorkflowForType(projectType: ProjectType | null): WorkflowConfig {
  if (projectType === 'gds') {
    return workflowGds
  }
  return workflowBmm
}

export function useWorkflow() {
  const projectType = useStore((state) => state.projectType)
  const scannedConfig = useStore((state) => state.scannedWorkflowConfig)

  const helpers = useMemo(() => {
    const workflow = scannedConfig || {
      ...getWorkflowForType(projectType),
      agents: [],
      projectWorkflows: undefined
    }

    return {
      statuses: workflow.statuses,
      agents: workflow.agents,
      transitions: workflow.transitions,

      getStatus: (id: StoryStatus): StatusDefinition | undefined => {
        return workflow.statuses.find((s) => s.id === id)
      },

      getVisibleStatuses: (): StatusDefinition[] => {
        return workflow.statuses
          .filter((s) => s.visible)
          .sort((a, b) => a.displayOrder - b.displayOrder)
      },

      getNextSteps: (status: StoryStatus): NextStepAction[] => {
        return workflow.statusActions[status]?.nextSteps || []
      },

      getPrimaryNextStep: (status: StoryStatus): NextStepAction | undefined => {
        const steps = workflow.statusActions[status]?.nextSteps || []
        return steps.find((s) => s.primary) || steps[0]
      },

      getValidTransitions: (fromStatus: StoryStatus): StoryStatus[] => {
        return workflow.transitions
          .filter((t) => t.from === fromStatus)
          .map((t) => t.to as StoryStatus)
      },

      isValidTransition: (from: StoryStatus, to: StoryStatus): boolean => {
        return workflow.transitions.some((t) => t.from === from && t.to === to)
      },

      getProjectWorkflows: (): Record<string, ProjectWorkflowPhase> => {
        return workflow.projectWorkflows || {}
      }
    }
  }, [projectType, scannedConfig])

  return helpers
}

export function getWorkflow(projectType: ProjectType | null): WorkflowConfig {
  return getWorkflowForType(projectType)
}

export { workflowBmm, workflowGds }
