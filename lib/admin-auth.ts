// Uses Web Crypto API — compatible with both Edge Runtime (middleware) and Node.js (API routes)

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'Clubdrafter@2025'
export const ADMIN_COOKIE = 'cd_admin_session'

const SECRET = process.env.ADMIN_COOKIE_SECRET || 'clubdrafter-admin-secret-2025'

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function generateAdminToken(): Promise<string> {
  const payload = `admin:${Date.now()}`
  const key = await getKey()
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return btoa(`${payload}:${sigHex}`)
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const decoded = atob(token)
    const lastColon = decoded.lastIndexOf(':')
    const payload = decoded.slice(0, lastColon)
    const sigHex = decoded.slice(lastColon + 1)
    const sigBytes = new Uint8Array(
      (sigHex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)),
    )
    const key = await getKey()
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
  } catch {
    return false
  }
}

export function checkAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}
