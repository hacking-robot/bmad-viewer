const API = 'https://api.github.com'

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

let _treeCache = new Map<string, TreeEntry[]>()
let _owner = ''
let _repo = ''

function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' }
  if (token) h.Authorization = `token ${token}`
  return h
}

function parseUrl(input: string): { owner: string; repo: string } {
  let url = input.trim()
  url = url.replace(/\.git$/, '')
  if (url.startsWith('git@github.com:')) {
    url = url.replace('git@github.com:', 'https://github.com/')
  }
  if (!url.includes('://') && !url.includes('@')) {
    url = `https://github.com/${url}`
  }
  if (url.startsWith('github.com')) {
    url = `https://${url}`
  }
  const parts = new URL(url).pathname.replace(/^\/+/, '').split('/')
  if (parts.length < 2) throw new Error(`Invalid GitHub URL: ${input}`)
  return { owner: parts[0], repo: parts[1] }
}

async function apiFetch<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(token) })
  if (res.status === 401 || res.status === 403) throw new Error('Authentication failed. Check your token or repository access.')
  if (res.status === 404) throw new Error('Repository not found. Check the URL.')
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export const githubApi = {
  parseUrl,

  async fetchTree(owner: string, repo: string, branch: string, token?: string): Promise<TreeEntry[]> {
    const cacheKey = `${owner}/${repo}/${branch}`
    if (_treeCache.has(cacheKey)) return _treeCache.get(cacheKey)!

    const data = await apiFetch<{ tree: TreeEntry[] }>(
      `${API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      token
    )

    const entries = data.tree.filter(e => e.type === 'blob')
    _treeCache.set(cacheKey, entries)
    _owner = owner
    _repo = repo
    return entries
  },

  async fetchFileContent(path: string, branch: string, token?: string): Promise<string | null> {
    try {
      const data = await apiFetch<{ content: string; encoding: string }>(
        `${API}/repos/${_owner}/${_repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
        token
      )
      if (data.encoding === 'base64' && data.content) {
        return atob(data.content.replace(/\n/g, ''))
      }
      return data.content
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('not found') || msg.includes('404')) return null
      throw err
    }
  },

  async fetchBinaryFile(path: string, branch: string, token?: string): Promise<Uint8Array | null> {
    try {
      const data = await apiFetch<{ content: string; encoding: string }>(
        `${API}/repos/${_owner}/${_repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
        token
      )
      if (data.encoding === 'base64' && data.content) {
        const binary = atob(data.content.replace(/\n/g, ''))
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        return bytes
      }
      return null
    } catch {
      return null
    }
  },

  async listBranches(owner: string, repo: string, token?: string): Promise<string[]> {
    const data = await apiFetch<Array<{ name: string }>>(
      `${API}/repos/${owner}/${repo}/branches?per_page=100`,
      token
    )
    return data.map(b => b.name)
  },

  async getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
    const data = await apiFetch<{ default_branch: string }>(
      `${API}/repos/${owner}/${repo}`,
      token
    )
    return data.default_branch
  },

  getTree(owner: string, repo: string, branch: string): TreeEntry[] | null {
    return _treeCache.get(`${owner}/${repo}/${branch}`) ?? null
  },

  setContext(owner: string, repo: string): void {
    _owner = owner
    _repo = repo
  },

  clearCache(): void {
    _treeCache.clear()
  },
}
