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

// Baut aus einer relativen Media-URL (/api/media/...) die volle URL.
export const mediaSrc = (path) => (path ? `${API_BASE}${path}` : '')

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

export const apiChangePassword = (current, next) =>
  request('/api/me/password', { method: 'POST', auth: true, body: { current, new: next } })

export const apiDeleteAccount = (username) =>
  request('/api/me', { method: 'DELETE', auth: true, body: { username } })

// ---- Studio / Shorts (echt, Port 3001) ----

export const apiListShorts = () =>
  request('/api/shorts', { auth: true }).then((d) => d.shorts || [])

export const apiStudioOverview = () =>
  request('/api/studio/overview', { auth: true }).then((d) => d.overview)

export const apiUpdateShort = (id, patch) =>
  request(`/api/shorts/${id}`, { method: 'PATCH', auth: true, body: patch }).then(
    (d) => d.short
  )

export const apiUploadShortThumb = (id, dataUrl) =>
  request(`/api/shorts/${id}/thumb`, { method: 'POST', auth: true, body: { data: dataUrl } }).then(
    (d) => d.short
  )

export const apiDeleteShort = (id) =>
  request(`/api/shorts/${id}`, { method: 'DELETE', auth: true })

// ---- /shorts-Viewer (Feed öffentlich, Liken/Kommentieren mit Login) ----

export const apiFeedShorts = () =>
  request('/api/feed/shorts', { auth: true }).then((d) => d.shorts || [])

export const apiLikeShort = (id) =>
  request(`/api/shorts/${id}/like`, { method: 'POST', auth: true })

export const apiShortComments = (id) =>
  request(`/api/shorts/${id}/comments`).then((d) => d.comments || [])

export const apiPostShortComment = (id, text, parentId = null) =>
  request(`/api/shorts/${id}/comments`, {
    method: 'POST',
    auth: true,
    body: { text, parent_id: parentId },
  }).then((d) => d.comment)

export const apiLikeShortComment = (commentId) =>
  request(`/api/comments/${commentId}/like`, { method: 'POST', auth: true })

export const apiViewShort = (id) =>
  request(`/api/shorts/${id}/view`, { method: 'POST' }).catch(() => null)

// ---- Öffentliches Profil /u/:user (404 wenn unbekannt) ----

export const apiGetUser = (username) =>
  request(`/api/users/${encodeURIComponent(username)}`, { auth: true }).then((d) => ({
    user: d.user,
    followers: d.followers || 0,
    followed: !!d.followed,
    posts: d.posts || 0,
    shorts: d.shorts || [],
  }))

export const apiToggleFollow = (username) =>
  request(`/api/users/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
    auth: true,
  })

export const apiFollowed = () =>
  request('/api/followed', { auth: true }).then((d) => ({
    users: d.users || [],
    communities: d.communities || [],
  }))

// ---- Communities (echt, DB) ----

export const apiListCommunities = () =>
  request('/api/communities', { auth: true }).then((d) => d.communities || [])

export const apiGetCommunity = (slug) =>
  request(`/api/communities/${encodeURIComponent(slug)}`, { auth: true }).then(
    (d) => d.community
  )

export const apiToggleCommunityFollow = (slug) =>
  request(`/api/communities/${encodeURIComponent(slug)}/follow`, {
    method: 'POST',
    auth: true,
  })

export const apiVisitCommunity = (slug) =>
  request(`/api/communities/${encodeURIComponent(slug)}/visit`, {
    method: 'POST',
    auth: true,
  }).catch(() => null)

export const apiRecentCommunities = () =>
  request('/api/communities/recent', { auth: true })
    .then((d) => d.communities || [])
    .catch(() => [])

// Community-Erstellung per XHR (Bild als Datei, kein Data-URL-Umweg).
export const apiCreateCommunity = ({ name, description, imageFile }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/communities`)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* egal */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.community)
      else reject(new Error(data.error || `Fehler ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Server nicht erreichbar. Läuft das Backend?'))
    const fd = new FormData()
    fd.append('name', name)
    fd.append('description', description || '')
    if (imageFile) fd.append('image', imageFile)
    xhr.send(fd)
  })

// Multipart-Upload per XHR (damit es echten Fortschritt gibt).
export const apiUploadShort = ({
  file,
  thumbFile,
  title,
  tags,
  visibility,
  commentsOff,
  onProgress,
}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/shorts/upload`)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* egal */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.short)
      else reject(new Error(data.error || `Fehler ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Server nicht erreichbar. Läuft das Backend?'))
    const fd = new FormData()
    fd.append('video', file)
    if (thumbFile) fd.append('thumb', thumbFile)
    fd.append('title', title)
    fd.append('tags', JSON.stringify(tags || []))
    fd.append('visibility', visibility)
    fd.append('commentsOff', commentsOff ? '1' : '0')
    xhr.send(fd)
  })
