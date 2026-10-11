// Echter API-Client fürs TontooMedia-Backend (Port 3001).
// Token liegt in localStorage, wird als Bearer-Header mitgeschickt.
const API_BASE = 'http://localhost:3001'
const TOKEN_KEY = 'tontoo_token'

export const apiBase = API_BASE

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* egal */
  }
}

// Baut aus einer relativen Avatar-URL (/api/avatar/...) die volle URL.
export const avatarSrc = (path) => (path ? `${API_BASE}${path}` : null)

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Server nicht erreichbar. Läuft das Backend?')
  }
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* egal */
  }
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`)
  return data
}

export const apiRegister = async (name, username, password) => {
  const { user, token } = await request('/api/register', {
    method: 'POST',
    body: { name, username, password },
  })
  setToken(token)
  return user
}

export const apiLogin = async (username, password) => {
  const { user, token } = await request('/api/login', {
    method: 'POST',
    body: { username, password },
  })
  setToken(token)
  return user
}

export const apiLogout = async () => {
  try {
    await request('/api/session', { method: 'DELETE', auth: true })
  } catch {
    /* egal – Token wird trotzdem verworfen */
  }
  setToken(null)
}

export const apiMe = () => request('/api/me', { auth: true }).then((d) => d.user)

export const apiUpdateMe = (patch) =>
  request('/api/me', { method: 'PATCH', auth: true, body: patch }).then((d) => d.user)

export const apiUploadAvatar = (dataUrl) =>
  request('/api/me/avatar', { method: 'POST', auth: true, body: { data: dataUrl } }).then(
    (d) => d.user
  )

export const apiResetAvatar = () =>
  request('/api/me/avatar', { method: 'DELETE', auth: true }).then((d) => d.user)
