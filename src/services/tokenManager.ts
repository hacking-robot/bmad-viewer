
const STORAGE_KEY = 'bmad-github-token-encrypted'
const SALT = new TextEncoder().encode('bmad-viewer-github-token-salt-v1')
const KEY_MATERIAL = new TextEncoder().encode('bmad-viewer-encryption-key-v1')

async function getKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    KEY_MATERIAL,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function saveToken(token: string): Promise<void> {
  if (!token) {
    removeToken()
    return
  }
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token),
  )
  const payload = {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export async function loadToken(): Promise<string | null> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    const payload = JSON.parse(stored)
    const key = await getKey()
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
      key,
      new Uint8Array(payload.data),
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

export function removeToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function testToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.github.com/repos/octocat/Hello-World/branches?per_page=1', {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Token test failed' }
  }
}
