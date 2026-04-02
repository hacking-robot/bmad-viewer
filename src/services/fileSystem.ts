import type { BmadScanResult } from '../types/bmadScan'
import { saveHandle, loadHandle, verifyOrRequestPermission as requestHandlePermission } from './handleStore'

export interface DirEntry {
  files: string[]
  dirs: string[]
  error?: string
}

export interface FileResult {
  content: string | null
  error?: string
}

export interface ProjectDetectionResult {
  projectType: 'bmm' | 'gds' | 'dashboard' | null
  outputFolder: string
  error?: string
}

let _rootHandle: FileSystemDirectoryHandle | null = null

export function getRootHandle(): FileSystemDirectoryHandle | null {
  return _rootHandle
}

export function setRootHandle(handle: FileSystemDirectoryHandle | null): void {
  _rootHandle = handle
}

export async function openProjectFolder(): Promise<{ handle: FileSystemDirectoryHandle; name: string } | null> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API is not supported. Please use Chrome or Edge.')
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (window as any).showDirectoryPicker()
    _rootHandle = handle
    await saveHandle(handle.name, handle)
    return { handle, name: handle.name }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null
    }
    throw err
  }
}

export async function restoreProjectFolder(name: string): Promise<{ handle: FileSystemDirectoryHandle; name: string } | null> {
  const handle = await loadHandle(name)
  if (!handle) return null
  const granted = await requestHandlePermission(handle)
  if (!granted) return null
  _rootHandle = handle
  return { handle, name: handle.name }
}

export async function readFile(path: string): Promise<FileResult> {
  if (!_rootHandle) return { content: null, error: 'No project folder open' }
  try {
    const cleanPath = path.replace(/^\/+/, '')
    const fileHandle = await traversePath(_rootHandle, cleanPath)
    if (!fileHandle) return { content: null, error: `File not found: ${path}` }
    if (fileHandle.kind !== 'file') return { content: null, error: `Not a file: ${path}` }
    const file = await (fileHandle as FileSystemFileHandle).getFile()
    const content = await file.text()
    return { content }
  } catch (err) {
    return { content: null, error: String(err) }
  }
}

export async function listDirectory(path: string): Promise<DirEntry> {
  if (!_rootHandle) return { files: [], dirs: [], error: 'No project folder open' }
  try {
    const cleanPath = path.replace(/^\/+/, '')
    let dirHandle: FileSystemDirectoryHandle
    if (cleanPath === '') {
      dirHandle = _rootHandle
    } else {
      const handle = await traversePath(_rootHandle, cleanPath)
      if (!handle || handle.kind !== 'file') {
        dirHandle = handle as FileSystemDirectoryHandle
      } else {
        return { files: [], dirs: [], error: `Not a directory: ${path}` }
      }
    }
    const files: string[] = []
    const dirs: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        files.push(entry.name)
      } else {
        dirs.push(entry.name)
      }
    }
    return { files, dirs }
  } catch (err) {
    return { files: [], dirs: [], error: String(err) }
  }
}

async function traversePath(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemHandle | null> {
  const parts = path.split('/').filter(Boolean)
  let current: FileSystemDirectoryHandle = root

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    try {
      const next = await current.getDirectoryHandle(part)
      current = next
    } catch {
      if (i === parts.length - 1) {
        try {
          return await current.getFileHandle(part)
        } catch {
          return null
        }
      }
      return null
    }
  }
  return current
}

export async function detectProject(): Promise<ProjectDetectionResult> {
  if (!_rootHandle) return { projectType: null, outputFolder: '_bmad-output', error: 'No project folder open' }

  const root = await listDirectory('')
  if (root.error) return { projectType: null, outputFolder: '_bmad-output', error: root.error }

  const hasBmad = root.dirs.includes('_bmad')
  if (!hasBmad) {
    return { projectType: null, outputFolder: '_bmad-output', error: 'No _bmad/ directory found. Not a BMAD project.' }
  }

  const bmadDir = await listDirectory('_bmad')
  const hasGds = bmadDir.dirs.includes('gds')
  const hasBmm = bmadDir.dirs.includes('bmm')

  if (hasGds) {
    return { projectType: 'gds', outputFolder: '_bmad-output' }
  }
  if (hasBmm) {
    let outputFolder = '_bmad-output'
    try {
      const configResult = await readFile('_bmad/_memory/config.yaml')
      if (configResult.content) {
        const match = configResult.content.match(/^outputFolder:\s*['"]?([^'"\n]+)['"]?/m)
        if (match) outputFolder = match[1].trim()
      }
    } catch {}
    return { projectType: 'bmm', outputFolder }
  }

  const hasCore = bmadDir.dirs.includes('core')
  if (hasCore) {
    return { projectType: 'dashboard', outputFolder: '_bmad-output' }
  }

  return { projectType: null, outputFolder: '_bmad-output', error: 'Could not detect BMAD project type.' }
}

export async function scanBmadProject(): Promise<BmadScanResult | null> {
  if (!_rootHandle) return null

  const bmadDir = await listDirectory('_bmad')
  if (bmadDir.error) return null

  const version = await readManifestVersion()
  const modules = await discoverModules()
  const agents = await scanAllAgents(modules)
  const cleanModules = modules.map(m => m.startsWith('__custom:') ? m.split(':')[1] : m)
  const workflows = await scanAllWorkflows(cleanModules)
  const detectedDeveloperMode = await detectDeveloperMode(cleanModules)
  const installedIdes = await detectInstalledIdes()
  const outputFolder = await detectOutputFolder()

  const claudeCommandsDir = await listDirectory('.claude/commands')
  const claudeSkillsDir = await listDirectory('.claude/skills')
  const missingClaudeCommands = !!claudeCommandsDir.error && !!claudeSkillsDir.error

  return {
    version,
    modules: cleanModules,
    agents,
    workflows,
    detectedDeveloperMode,
    installedIdes,
    missingClaudeCommands,
    outputFolder,
    scannedAt: new Date().toISOString(),
  }
}

async function readManifestVersion(): Promise<string | null> {
  const result = await readFile('_bmad/_config/manifest.yaml')
  if (!result.content) return null
  const match = result.content.match(/^\s*version:\s*['"]?([^'"\n]+)['"]?/m)
  return match ? match[1].trim() : null
}

async function discoverModules(): Promise<string[]> {
  const bmadDir = await listDirectory('_bmad')
  if (bmadDir.error) return []

  const modules: string[] = []
  for (const dir of bmadDir.dirs) {
    if (dir.startsWith('.') || dir === '_config' || dir === '_memory') continue
    const agentsDir = await listDirectory(`_bmad/${dir}/agents`)
    const hasConfig = await readFile(`_bmad/${dir}/config.yaml`)
    if (!agentsDir.error || !hasConfig.error) {
      modules.push(dir)
    }
  }

  const customDir = await listDirectory('_bmad/_config/custom')
  if (!customDir.error) {
    for (const entry of customDir.dirs) {
      if (entry.startsWith('.')) continue
      const agentsDir = await listDirectory(`_bmad/_config/custom/${entry}/src/${entry}/agents`)
      if (!agentsDir.error) {
        modules.push(`__custom:${entry}:_config/custom/${entry}/src/${entry}`)
      }
    }
  }

  if (modules.length === 0) {
    const common = ['core', 'bmm', 'gds']
    for (const m of common) {
      if (bmadDir.dirs.includes(m)) modules.push(m)
    }
  }

  return modules
}

async function scanAllAgents(modules: string[]): Promise<BmadScanResult['agents']> {
  const allAgents: BmadScanResult['agents'] = []

  for (const module of modules) {
    let modulePath: string
    let moduleName: string

    if (module.startsWith('__custom:')) {
      const parts = module.split(':')
      moduleName = parts[1]
      modulePath = `_bmad/${parts.slice(2).join(':')}`
    } else {
      moduleName = module
      modulePath = `_bmad/${module}`
    }

    const agentsDir = await listDirectory(`${modulePath}/agents`)
    if (agentsDir.error) continue

    for (const file of agentsDir.files) {
      const result = await readFile(`${modulePath}/agents/${file}`)
      if (!result.content) continue

      const agent = parseAgentMarkdown(result.content, moduleName)
      if (agent) allAgents.push(agent)
    }
  }

  return allAgents
}

function parseAgentMarkdown(content: string, module: string): BmadScanResult['agents'][0] | null {
  const id = ''
  const nameMatch = content.match(/<name>([^<]+)<\/name>/)
  const titleMatch = content.match(/<title>([^<]+)<\/title>/)
  const iconMatch = content.match(/<icon>([^<]+)<\/icon>/)
  const roleMatch = content.match(/<role>([\s\S]*?)<\/role>/)
  const identityMatch = content.match(/<identity>([\s\S]*?)<\/identity>/)
  const styleMatch = content.match(/<communicationStyle>([\s\S]*?)<\/communicationStyle>/)
  const principlesMatch = content.match(/<principles>([\s\S]*?)<\/principles>/)

  const commands: { name: string; module: string; type: 'workflows' | 'agents'; label: string }[] = []
  const menuMatches = content.matchAll(/<item[^>]*label="([^"]*)"[^>]*>([\s\S]*?)<\/item>/g)
  for (const m of menuMatches) {
    commands.push({
      name: extractCommandName(m[2]),
      module,
      type: 'agents',
      label: m[1],
    })
  }

  return {
    id,
    name: nameMatch?.[1]?.trim() || '',
    title: titleMatch?.[1]?.trim() || '',
    icon: iconMatch?.[1]?.trim() || '',
    role: roleMatch?.[1]?.trim() || '',
    identity: identityMatch?.[1]?.trim() || '',
    communicationStyle: styleMatch?.[1]?.trim() || '',
    principles: principlesMatch?.[1]?.trim() || '',
    module,
    commands,
  }
}

function extractCommandName(path: string): string {
  const trimmed = path.trim()
  const match = trimmed.match(/([^/]+?)(?:\.\w+)?$/)
  return match ? match[1] : trimmed
}

async function scanAllWorkflows(modules: string[]): Promise<BmadScanResult['workflows']> {
  const workflows: BmadScanResult['workflows'] = []
  const seen = new Set<string>()

  const commandsDir = await listDirectory('.claude/commands')
  if (!commandsDir.error) {
    for (const file of commandsDir.files) {
      if (!file.startsWith('bmad-') || !file.endsWith('.md')) continue
      const match = file.match(/^bmad-(.+)\.md$/)
      if (!match) continue
      const name = match[1]
      if (seen.has(name)) continue
      seen.add(name)

      const parts = name.split('-')
      const moduleName = parts.length > 1 ? parts[0] : 'core'
      const result = await readFile(`.claude/commands/${file}`)
      let description = ''
      if (result.content) {
        const descMatch = result.content.match(/^#\s+(.+)$/m)
        if (descMatch) description = descMatch[1]
      }

      workflows.push({
        name,
        description,
        module: moduleName,
        stepCount: 0,
        maxStepNumber: 0,
        stepNames: [],
      })
    }
  }

  for (const mod of modules) {
    const modWorkflowsDir = await listDirectory(`_bmad/${mod}/workflows`)
    if (modWorkflowsDir.error) continue
    await scanWorkflowDir(`_bmad/${mod}/workflows`, mod, workflows, seen)
    for (const phase of modWorkflowsDir.dirs) {
      await scanWorkflowDir(`_bmad/${mod}/workflows/${phase}`, mod, workflows, seen)
      const phaseDir = await listDirectory(`_bmad/${mod}/workflows/${phase}`)
      if (!phaseDir.error) {
        for (const subdir of phaseDir.dirs) {
          await scanWorkflowDir(`_bmad/${mod}/workflows/${phase}/${subdir}`, mod, workflows, seen)
        }
      }
    }
  }

  return workflows
}

async function scanWorkflowDir(
  dirPath: string,
  module: string,
  workflows: BmadScanResult['workflows'],
  seen: Set<string>,
): Promise<void> {
  const dir = await listDirectory(dirPath)
  if (dir.error) return

  const hasWorkflow = dir.files.some(f => f.startsWith('workflow.'))
  if (!hasWorkflow) return

  const dirName = dirPath.split('/').pop() || ''
  if (seen.has(dirName)) return
  seen.add(dirName)

  const stepDir = await listDirectory(`${dirPath}/steps`)
  let stepCount = 0
  let maxStepNumber = 0
  const stepNames: string[] = []
  if (!stepDir.error) {
    const stepFiles = stepDir.files.filter(f => /^step-\d+.*\.md$/.test(f))
    stepCount = stepFiles.length
    const parsed: { num: number; label: string }[] = []
    for (const f of stepFiles) {
      const match = f.match(/^step-(\d+[a-z]?)[-.](.*)\.md$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxStepNumber) maxStepNumber = num
        const rawName = match[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        parsed.push({ num, label: rawName })
      } else {
        const numMatch = f.match(/^step-(\d+)/)
        if (numMatch) {
          const num = parseInt(numMatch[1], 10)
          if (num > maxStepNumber) maxStepNumber = num
          parsed.push({ num, label: `Step ${num}` })
        }
      }
    }
    parsed.sort((a, b) => a.num - b.num || a.label.localeCompare(b.label))
    stepNames.push(...parsed.map(p => p.label))
  }

  let description = ''
  const wfResult = await readFile(`${dirPath}/workflow.yaml`)
  if (wfResult.content) {
    const descMatch = wfResult.content.match(/^description:\s*['"]?(.+?)['"]?\s*$/m)
    if (descMatch) description = descMatch[1]
  }

  workflows.push({
    name: dirName,
    description,
    module,
    stepCount,
    maxStepNumber,
    stepNames,
  })
}

async function detectDeveloperMode(modules: string[]): Promise<'ai' | 'human' | null> {
  for (const mod of modules) {
    const checklistDir = await listDirectory(`_bmad/${mod}/workflows`)
    if (checklistDir.error) continue
    for (const phase of checklistDir.dirs) {
      const phaseDir = await listDirectory(`_bmad/${mod}/workflows/${phase}`)
      if (phaseDir.error) continue
      for (const wf of phaseDir.dirs) {
        const stepsDir = await listDirectory(`_bmad/${mod}/workflows/${phase}/${wf}/steps`)
        if (stepsDir.error) continue
        for (const stepFile of stepsDir.files) {
          if (!stepFile.endsWith('.md')) continue
          const result = await readFile(`_bmad/${mod}/workflows/${phase}/${wf}/steps/${stepFile}`)
          if (result.content?.includes('human')) return 'human'
          if (result.content?.includes('ai')) return 'ai'
        }
      }
    }
  }
  return null
}

async function detectInstalledIdes(): Promise<string[]> {
  const ides: string[] = []
  const checks = [
    { dir: '.claude/skills', id: 'claude-code' },
    { dir: '.cursor/skills', id: 'cursor' },
    { dir: '.windsurf/skills', id: 'windsurf' },
    { dir: '.roo/skills', id: 'roo' },
  ]
  for (const check of checks) {
    const dir = await listDirectory(check.dir)
    if (!dir.error) ides.push(check.id)
  }
  return ides
}

async function detectOutputFolder(): Promise<string | undefined> {
  const result = await readFile('_bmad/_memory/config.yaml')
  if (!result.content) return undefined
  const match = result.content.match(/^outputFolder:\s*['"]?([^'"\n]+)['"]?/m)
  return match ? match[1].trim() : undefined
}
