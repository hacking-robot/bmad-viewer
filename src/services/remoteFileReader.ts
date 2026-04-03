import { githubApi, type TreeEntry } from './githubApi'
import type { DirEntry } from './fileSystem'

const LOG = '[remoteFs]'

let _branch: string | null = null
let _token: string | undefined = undefined
let _tree: TreeEntry[] | null = null
let _owner: string = ''
let _repo: string = ''

export async function setRemoteContext(owner: string, repo: string, branch: string, token?: string): Promise<void> {
  console.log(LOG, 'setRemoteContext()', { owner, repo, branch, hasToken: !!token })
  _owner = owner
  _repo = repo
  _branch = branch
  _token = token || undefined
  _tree = await githubApi.fetchTree(owner, repo, branch, _token)
  console.log(LOG, 'Tree loaded:', _tree.length, 'entries')
}

export function clearRemoteContext(): void {
  _branch = null
  _token = undefined
  _tree = null
}

export async function readFile(path: string): Promise<{ content: string | null; error?: string }> {
  if (!_branch) return { content: null, error: 'No remote branch set' }
  try {
    const cleanPath = path.replace(/^\/+/, '')
    githubApi.setContext(_owner, _repo)
    const content = await githubApi.fetchFileContent(cleanPath, _branch, _token)
    if (content === null) return { content: null, error: `File not found: ${cleanPath}` }
    console.log(LOG, 'readFile()', cleanPath, '→', content.length, 'chars')
    return { content }
  } catch (err) {
    console.warn(LOG, 'readFile() failed', path, err)
    return { content: null, error: String(err) }
  }
}

export async function readBinaryFile(path: string): Promise<Uint8Array | null> {
  if (!_branch) return null
  try {
    const cleanPath = path.replace(/^\/+/, '')
    githubApi.setContext(_owner, _repo)
    return await githubApi.fetchBinaryFile(cleanPath, _branch, _token)
  } catch {
    return null
  }
}

export async function listDirectory(path: string): Promise<DirEntry> {
  if (!_branch || !_tree) return { files: [], dirs: [], error: 'No remote branch set' }
  try {
    const cleanPath = path.replace(/^\/+/, '')
    const prefix = cleanPath ? cleanPath + '/' : ''
    const directChildren = new Map<string, 'file' | 'dir'>()

    for (const entry of _tree) {
      if (!entry.path.startsWith(prefix)) continue
      const rest = entry.path.slice(prefix.length)
      if (!rest) continue
      const firstSegment = rest.split('/')[0]
      if (rest.includes('/')) {
        if (!directChildren.has(firstSegment)) {
          directChildren.set(firstSegment, 'dir')
        }
      } else {
        directChildren.set(firstSegment, 'file')
      }
    }

    const files: string[] = []
    const dirs: string[] = []
    for (const [name, type] of directChildren) {
      if (type === 'dir') dirs.push(name)
      else files.push(name)
    }

    console.log(LOG, 'listDirectory()', cleanPath || '/', '→', files.length, 'files,', dirs.length, 'dirs')
    return { files, dirs }
  } catch (err) {
    console.warn(LOG, 'listDirectory() failed', path, err)
    return { files: [], dirs: [], error: String(err) }
  }
}
