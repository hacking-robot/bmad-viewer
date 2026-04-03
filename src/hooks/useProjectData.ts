import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { parseSprintStatus } from '../utils/parseSprintStatus'
import { parseEpicsUnified, getAllStories } from '../utils/parseEpicsUnified'
import { parseStoryContent } from '../utils/parseStory'
import { getEpicsFullPath, getSprintStatusFullPath, getSprintsFullPath, hasBoardModule } from '../utils/projectTypes'
import { parseSprint, parseVelocityLog, buildDevelopmentStatusFromSprints, getDefaultSprintNumber } from '../utils/parseSprint'
import { mergeWorkflowConfig } from '../utils/workflowMerge'
import * as fs from '../services/fileSystem'
import { getFs } from '../services/fsRouter'
import { setRemoteContext } from '../services/remoteFileReader'
import { githubApi } from '../services/githubApi'
import { loadToken } from '../services/tokenManager'

let _skipNextLoadForName: string | null = null

export async function loadProjectData() {
  const state = useStore.getState()
  const { projectName, projectType } = state
  if (!projectName || !projectType) return

  console.log(`[loadProjectData] Starting load: projectType=${projectType}, remote=${state.isRemoteProject}`)

  if (projectType === 'dashboard') {
    state.setLoading(false)
    return
  }

  state.setLoading(true)
  state.setError(null)
  state.setLoadingStatus('Scanning project structure…')

  const fileOps = getFs()

  try {
    const outputFolder = state.outputFolder

    let sprintStatus: ReturnType<typeof parseSprintStatus>
    let detectedMultiSprint = false
    let loadedSprints: import('../types').SprintData[] = []
    let loadedVelocityLog: import('../types').VelocityLog | null = null

    const bmadImplDir = `_bmad/${projectType}/4-implementation`
    const bmadImplResult = await fileOps.listDirectory(bmadImplDir)
    const hasSprintPlanning = (bmadImplResult.dirs || []).includes('bmad-sprint-planning')

    const sprintsPath = getSprintsFullPath('', outputFolder)
    const sprintsDirResult = await fileOps.listDirectory(sprintsPath)
    const sprintFiles = (sprintsDirResult.files || [])
      .filter((f: string) => /^sprint-\d+\.yaml$/.test(f))
      .sort()

    if (sprintFiles.length > 0) {
      detectedMultiSprint = true
      const parsedSprints: import('../types').SprintData[] = []

      for (const file of sprintFiles) {
        state.setLoadingStatus(`Reading ${file}…`)
        const result = await fileOps.readFile(`${sprintsPath}${file}`)
        if (result.content) {
          const parsed = parseSprint(result.content)
          if (parsed) parsedSprints.push(parsed)
        }
      }

      loadedSprints = parsedSprints
      state.setLoadingStatus('Building development status…')
      const developmentStatusMap = buildDevelopmentStatusFromSprints(parsedSprints)
      sprintStatus = {
        generated: '',
        project: '',
        projectKey: '',
        trackingSystem: '',
        storyLocation: '',
        developmentStatus: developmentStatusMap,
      }

      if ((sprintsDirResult.files || []).includes('velocity-log.yaml')) {
        const velResult = await fileOps.readFile(`${sprintsPath}velocity-log.yaml`)
        if (velResult.content) {
          try {
            loadedVelocityLog = parseVelocityLog(velResult.content)
          } catch {}
        }
      }
    } else if (hasSprintPlanning) {
      detectedMultiSprint = true
      sprintStatus = {
        generated: '',
        project: '',
        projectKey: '',
        trackingSystem: '',
        storyLocation: '',
        developmentStatus: {},
      }
    } else {
      const sprintStatusPath = getSprintStatusFullPath('', projectType, outputFolder)
      const statusResult = await fileOps.readFile(sprintStatusPath)
      if (statusResult.error || !statusResult.content) {
        throw new Error('Failed to read sprint-status.yaml')
      }
      sprintStatus = parseSprintStatus(statusResult.content)
    }

    state.setLoadingStatus('Reading epics…')

    const epicsPath = getEpicsFullPath('', projectType, outputFolder)
    let epicsContent: string
    const epicsResult = await fileOps.readFile(epicsPath)

    if (epicsResult.error || !epicsResult.content) {
      const outputRootEpics = await fileOps.readFile(`${outputFolder}/epics.md`)
      if (outputRootEpics.content) {
        epicsContent = outputRootEpics.content
      } else {
        const searchDirs = [
          `${outputFolder}/planning-artifacts`,
          outputFolder,
        ]
        let epicFiles: string[] = []
        let epicDir = ''
        for (const dir of searchDirs) {
          const dirFiles = await fileOps.listDirectory(dir)
          const found = (dirFiles.files || [])
            .filter((f: string) => /^epic-\d+\.md$/.test(f))
            .sort((a: string, b: string) => {
              const numA = parseInt(a.match(/\d+/)?.[0] || '0')
              const numB = parseInt(b.match(/\d+/)?.[0] || '0')
              return numA - numB
            })
          if (found.length > 0) {
            epicFiles = found
            epicDir = dir
            break
          }
        }

        if (epicFiles.length === 0) {
          epicsContent = ''
        } else {
          const parts: string[] = []
          for (const file of epicFiles) {
            const result = await fileOps.readFile(`${epicDir}/${file}`)
            if (result.content) parts.push(result.content)
          }
          epicsContent = parts.join('\n\n')
        }
      }
    } else {
      epicsContent = epicsResult.content
    }

    state.setLoadingStatus('Parsing stories…')

    const epics = parseEpicsUnified(epicsContent, sprintStatus, projectType)
    const stories = getAllStories(epics)

    state.setLoadingStatus('Matching implementation files…')

    const implementationPath = `${outputFolder}/implementation-artifacts`
    const filesResult = await fileOps.listDirectory(implementationPath)

    state.setLoadingStatus('Matching story files…')

    if (filesResult.files) {
      const storyFiles = filesResult.files.filter((f: string) => f.endsWith('.md') && !f.startsWith('story-'))
      for (const story of stories) {
        const matchingFile = storyFiles.find((f: string) => {
          const prefix = `${story.epicId}-${String(story.storyNumber).toLowerCase()}-`
          return f.startsWith(prefix)
        })
        if (matchingFile) {
          story.filePath = `${implementationPath}/${matchingFile}`
          const storyKey = matchingFile.replace('.md', '')
          const fileStatus = sprintStatus.developmentStatus[storyKey]
          if (fileStatus) story.status = fileStatus
        }
      }
    }

    if (loadedSprints.length > 0) {
      const sprintStoryMap = new Map<string, { assignee: string | null; jiraKey: string | null }>()
      for (const sprint of loadedSprints) {
        for (const ss of [...sprint.plannedStories, ...sprint.carryover]) {
          sprintStoryMap.set(ss.key, { assignee: ss.assignee, jiraKey: ss.jiraKey })
        }
      }
      for (const story of stories) {
        const sprintMeta = sprintStoryMap.get(story.id)
        if (sprintMeta) {
          story.assignee = sprintMeta.assignee
          story.jiraKey = sprintMeta.jiraKey
        }
      }
    }

    useStore.setState({
      epics,
      stories,
      lastRefreshed: new Date(),
    })

    const storeState = useStore.getState()
    storeState.setIsMultiSprint(detectedMultiSprint)
    storeState.setSprints(loadedSprints)
    storeState.setVelocityLog(loadedVelocityLog)

    if (detectedMultiSprint && loadedSprints.length > 0) {
      storeState.setSelectedSprintNumber(getDefaultSprintNumber(loadedSprints))
    } else if (!detectedMultiSprint) {
      storeState.setSelectedSprintNumber(null)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load project data'
    useStore.getState().setError(msg)
  } finally {
    useStore.getState().setLoading(false)
  }
}

export async function loadStoryContent(story: { filePath?: string } | null) {
  if (!story?.filePath) {
    useStore.getState().setStoryContent(null)
    return
  }

  try {
    const fileOps = getFs()
    const result = await fileOps.readFile(story.filePath)
    if (result.error || !result.content) {
      useStore.getState().setStoryContent(null)
      return
    }
    const content = parseStoryContent(result.content)
    useStore.getState().setStoryContent(content)
  } catch {
    useStore.getState().setStoryContent(null)
  }
}

export function useProjectDataEffects() {
  const _hasHydrated = useStore((s) => s._hasHydrated)
  const projectName = useStore((s) => s.projectName)
  const projectType = useStore((s) => s.projectType)
  const selectedStory = useStore((s) => s.selectedStory)
  const isRemoteProject = useStore((s) => s.isRemoteProject)

  const lastLoadedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const skipLoad = _skipNextLoadForName === projectName
    _skipNextLoadForName = null

    if (!_hasHydrated || !projectName || !projectType) return

    const loadKey = `${projectName}:${projectType}:${isRemoteProject}`
    const alreadyLoaded = lastLoadedKeyRef.current === loadKey
    lastLoadedKeyRef.current = loadKey

    const run = async () => {
      if (isRemoteProject) {
        if (!skipLoad && !alreadyLoaded) {
          loadProjectData()
        }
        return
      }

      if (!fs.getRootHandle()) {
        const restored = await fs.restoreProjectFolder(projectName)
        if (!restored) {
          useStore.getState().setProjectName(null)
          return
        }
      }

      if (!skipLoad && !alreadyLoaded) {
        loadProjectData()
      }

      try {
        const scanResult = await fs.scanBmadProject()
        if (!scanResult) {
          useStore.getState().setBmadScanResult(null)
          useStore.getState().setScannedWorkflowConfig(null)
          return
        }

        useStore.getState().setBmadScanResult(scanResult)

        const scanDetectedType = scanResult.modules.includes('gds')
          ? 'gds' as const
          : hasBoardModule(scanResult.modules)
            ? 'bmm' as const
            : 'dashboard' as const

        const { projectType: currentType } = useStore.getState()
        if (currentType !== scanDetectedType) {
          if (currentType !== 'dashboard') {
            _skipNextLoadForName = projectName
          }
          useStore.getState().setProjectType(scanDetectedType)
          if (scanDetectedType === 'dashboard') {
            useStore.getState().setViewMode('dashboard')
          }
        }

        const merged = mergeWorkflowConfig(scanResult, scanDetectedType)
        useStore.getState().setScannedWorkflowConfig(merged)
      } catch {
        useStore.getState().setBmadScanResult(null)
        useStore.getState().setScannedWorkflowConfig(null)
      }
    }

    run()
  }, [_hasHydrated, projectName, projectType, isRemoteProject])

  useEffect(() => {
    if (selectedStory) {
      loadStoryContent(selectedStory)
    } else {
      useStore.getState().setStoryContent(null)
    }
  }, [selectedStory])
}

export function useProjectData() {
  const setProjectType = useStore((s) => s.setProjectType)
  const setOutputFolder = useStore((s) => s.setOutputFolder)
  const setError = useStore((s) => s.setError)
  const addRecentProject = useStore((s) => s.addRecentProject)
  const setViewMode = useStore((s) => s.setViewMode)
  const setProjectName = useStore((s) => s.setProjectName)
  const setColorTheme = useStore((s) => s.setColorTheme)

  const selectProject = useCallback(async () => {
    try {
      const result = await fs.openProjectFolder()
      if (!result) return false

      const detection = await fs.detectProject()
      if (detection.error || !detection.projectType) {
        setError(detection.error || 'Could not detect project type')
        return false
      }

      setProjectName(result.name)
      setProjectType(detection.projectType)
      setOutputFolder(detection.outputFolder)
      setViewMode(detection.projectType === 'dashboard' ? 'dashboard' : 'board')
      addRecentProject({
        name: result.name,
        projectType: detection.projectType,
        outputFolder: detection.outputFolder,
      })
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false
      setError(err instanceof Error ? err.message : 'Failed to open project')
      return false
    }
  }, [setProjectName, setProjectType, setOutputFolder, setError, addRecentProject, setViewMode])

  const switchToProject = useCallback(async (project: import('../store').RecentProject) => {
    if (project.isRemote && project.remoteUrl) {
      try {
        const token = await loadToken()
        const { owner, repo } = githubApi.parseUrl(project.remoteUrl)
        const defaultBranch = await githubApi.getDefaultBranch(owner, repo, token || undefined)
        await setRemoteContext(owner, repo, defaultBranch, token || undefined)

        useStore.getState().setProjectName(`${owner}/${repo}`)
        useStore.getState().setProjectType(project.projectType)
        useStore.getState().setOutputFolder('_bmad-output')
        useStore.getState().setIsRemoteProject(true)
        useStore.getState().setRemoteProjectUrl(project.remoteUrl)
        useStore.getState().setRemoteOwner(owner)
        useStore.getState().setRemoteRepo(repo)
        useStore.getState().setRemoteViewingBranch(defaultBranch)
        useStore.getState().setViewMode('board')
        if (project.colorTheme) setColorTheme(project.colorTheme)
        return
      } catch {
        return
      }
    }

    try {
      const result = await fs.restoreProjectFolder(project.name)
      if (result) {
        const detection = await fs.detectProject()
        if (!detection.error && detection.projectType) {
          setProjectName(result.name)
          setProjectType(detection.projectType)
          setOutputFolder(detection.outputFolder)
          setViewMode(detection.projectType === 'dashboard' ? 'dashboard' : 'board')
          if (project.colorTheme) setColorTheme(project.colorTheme)
          return
        }
      }
      await selectProject()
    } catch {
      await selectProject()
    }
  }, [selectProject, setProjectName, setProjectType, setOutputFolder, setViewMode, setColorTheme])

  return {
    selectProject,
    switchToProject,
    loadProjectData,
    loadStoryContent,
  }
}
