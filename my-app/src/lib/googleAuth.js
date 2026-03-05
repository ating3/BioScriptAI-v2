/**
 * Google OAuth via chrome.identity
 * Scopes: openid, email, profile, Google Docs, Drive (file-level)
 */

const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

/**
 * Launch interactive OAuth flow and return the access token.
 * Throws on failure or user cancellation.
 */
export async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(token)
      }
    })
  })
}

/**
 * Revoke cached token and remove it from chrome.identity cache.
 */
export async function revokeAuthToken(token) {
  await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve)
  })
}

/**
 * Fetch Google user profile using the given access token.
 * Returns { name, email, picture, sub }
 */
export async function fetchUserInfo(token) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user info')
  return res.json()
}

/**
 * Full sign-in: get token + fetch user profile.
 * Returns { token, user: { name, email, picture, sub } }
 */
export async function signInWithGoogle() {
  const token = await getAuthToken(true)
  const user = await fetchUserInfo(token)
  return { token, user }
}

/**
 * Silent sign-in (non-interactive) — used to restore session on extension open.
 * Returns null if no cached session exists.
 */
export async function silentSignIn() {
  try {
    const token = await getAuthToken(false)
    if (!token) return null
    const user = await fetchUserInfo(token)
    return { token, user }
  } catch {
    return null
  }
}

/**
 * Sign out: revoke token and clear cached token.
 */
export async function signOut(token) {
  if (token) await revokeAuthToken(token)
}
