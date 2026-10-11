import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ShareSheet from '../../components/ShareSheet.jsx'
import PostEditor from '../../components/PostEditor.jsx'
import ShortUpload from '../../components/ShortUpload.jsx'
import {
  apiCreatePost,
  apiDeletePost,
  apiDeleteShort,
  apiListCommunities,
  apiListShorts,
  apiMyPosts,
  apiStudioOverview,
  apiUpdatePost,
  apiUpdateShort,
  apiUploadShortThumb,
  mediaSrc,
} from '../../lib/api.js'

const TABS = [
  { id: 'shorts', label: 'Shorts', icon: 'fa-clapperboard' },
  { id: 'posts', label: 'Posts', icon: 'fa-pen-to-square' },
]
const PERIODS = [
  { id: 7, label: '7 Tage' },
  { id: 28, label: '28 Tage' },
  { id: 90, label: '90 Tage' },
]
const VISIBILITIES = ['Öffentlich', 'Privat']

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')
const fmtDelta = (d) => `+${String(d).replace('.', ',')} %`
const shortUrl = (id) => `${window.location.origin}/shorts/${id}`

// Sichtbarkeits-Pille: nur Öffentlich oder Privat
const visPill = (s) => s.visibility === 'Privat'
  ? { label: 'Privat', cls: 'private' }
  : { label: 'Öffentlich', cls: 'live' }

// Creator-Studio: Kennzahlen + Shorts + Posts sind echt (Backend Port 3001).
const rowOf = (s) => ({
  id: s.id,
  title: s.title,
  tags: s.tags || [],
  visibility: s.visibility || 'Öffentlich',
  commentsOff: !!s.commentsOff,
  dur: s.dur || '–',
  date: s.date || '–',
  views: s.views || 0,
  likes: s.likes || 0,
  comments: s.comments ?? 0,
  thumb: mediaSrc(s.thumbUrl),
  videoUrl: mediaSrc(s.videoUrl),
  icon: 'fa-clapperboard',
  color: 'ic-teal',
})

// API-Post -> Studio-Zeile (mit Community + absoluten Bild-URLs).
const postRowOf = (p) => ({
  id: p.id,
  title: p.title || '',
  text: p.text || '',
  tags: p.tags || [],
  images: (p.images || []).map(mediaSrc),
  date: p.date || '–',
  community: p.community?.name || '',
  communitySlug: p.community?.slug || '',
})

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  try {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  } catch (e) {
    reject(e)
  }
})

export default function Studio({ showToast }) {
  const notify = (msg) => showToast?.(msg)
  const [tab, setTab] = useState('shorts')
  const [period, setPeriod] = useState(28)
  const [query, setQuery] = useState('')
  const [shorts, setShorts] = useState([])
  const [shortsLoading, setShortsLoading] = useState(true)
  const [shortsError, setShortsError] = useState('')
  const [ovApi, setOvApi] = useState(null)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [createAt, setCreateAt] = useState(null) // { x, y } Erstellen-Menü
  const [ctx, setCtx] = useState(null) // { x, y, kind, id } Zeilen-Menü
  const [deleteTarget, setDeleteTarget] = useState(null) // { kind, id } fürs Lösch-Modal
  const [deleting, setDeleting] = useState(false)
  const [shareItem, setShareItem] = useState(null) // { url, sub }
  const [copiedShare, setCopiedShare] = useState(false)
  // Short bearbeiten
  const [esId, setEsId] = useState(null)
  const [esTitle, setEsTitle] = useState('')
  const [esThumb, setEsThumb] = useState('')
  const [esThumbFile, setEsThumbFile] = useState(null)
  const [esHadThumb, setEsHadThumb] = useState(false)
  const [esVis, setEsVis] = useState('Öffentlich')
  const [esComments, setEsComments] = useState(true)
  const [esSaving, setEsSaving] = useState(false)
  const esThumbRef = useRef(null)
  // Post bearbeiten / erstellen
  const [epId, setEpId] = useState(null)
  const [npOpen, setNpOpen] = useState(false)
  const [npComm, setNpComm] = useState('')
  // Echte Communities für den Picker (Anzeige only – Posten bleibt Demo).
  const [comms, setComms] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const copyTimer = useRef(null)

  useEffect(() => () => {
    clearTimeout(copyTimer.current)
  }, [])

  // Escape schließt Menüs und Dialoge
  useEffect(() => {
    if (!ctx && !createAt && esId === null && epId === null && !npOpen && !shareItem && !uploadOpen && !deleteTarget) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setCtx(null)
      setCreateAt(null)
      setEsId(null)
      setEpId(null)
      setNpOpen(false)
      setShareItem(null)
      setUploadOpen(false)
      setDeleteTarget(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctx, createAt, esId, epId, npOpen, shareItem, uploadOpen, deleteTarget])

  // Short-Upload abschließen → oben in die Liste (echt vom Server)
  const finishUpload = (short) => {
    setShorts((s) => [rowOf(short), ...s])
    setUploadOpen(false)
    setTab('shorts')
    notify('Short hochgeladen.')
  }

  // Shorts + Kennzahlen + eigene Posts laden
  const loadShorts = async () => {
    setShortsLoading(true)
    setShortsError('')
    setPostsLoading(true)
    setPostsError('')
    try {
      const [list, overview] = await Promise.all([apiListShorts(), apiStudioOverview()])
      setShorts((list || []).map(rowOf))
      setOvApi(overview)
    } catch (e) {
      setShortsError(e.message || 'Laden fehlgeschlagen.')
    } finally {
      setShortsLoading(false)
    }
    try {
      setPosts((await apiMyPosts()).map(postRowOf))
    } catch (e) {
      setPostsError(e.message || 'Laden fehlgeschlagen.')
    } finally {
      setPostsLoading(false)
    }
    // Echte Communities für den Picker (ohne Login einfach leer).
    try {
      setComms(await apiListCommunities())
    } catch {
      setComms([])
    }
  }

  useEffect(() => {
    loadShorts()
  }, [])

  const placeMenu = (e) => ({
    x: Math.max(8, Math.min(e.clientX, window.innerWidth - 240)),
    y: Math.max(8, Math.min(e.clientY, window.innerHeight - 260)),
  })

  const openCtx = (e, kind, id) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({ ...placeMenu(e), kind, id })
  }

  const openCreate = (e) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setCreateAt({
      x: Math.max(8, Math.min(r.right - 224, window.innerWidth - 240)),
      y: Math.min(r.bottom + 8, window.innerHeight - 260),
    })
  }

  // Löschen erst nach Bestätigung im Modal (Shorts + Posts echt)
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    const { kind, id } = deleteTarget
    setDeleting(true)
    try {
      if (kind === 'short') {
        await apiDeleteShort(id)
        setShorts((s) => s.filter((x) => String(x.id) !== String(id)))
        notify('Short gelöscht.')
      } else {
        await apiDeletePost(id)
        setPosts((s) => s.filter((x) => String(x.id) !== String(id)))
        notify('Post gelöscht.')
      }
      setDeleteTarget(null)
    } catch (e) {
      notify(e.message || 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
    }
  }

  const openShare = (url, sub) => {
    setCtx(null)
    setShareItem({ url, sub })
    setCopiedShare(false)
  }

  const copyShare = async () => {
    if (!shareItem) return
    try {
      await navigator.clipboard.writeText(shareItem.url)
    } catch {
      /* Demo: egal */
    }
    setCopiedShare(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedShare(false), 1600)
  }

  // Short-Edit öffnen / speichern (Titel, Sichtbarkeit, Kommentare, Thumbnail)
  const openEditShort = (s) => {
    setCtx(null)
    setEsId(s.id)
    setEsTitle(s.title)
    setEsThumb(s.thumb || '')
    setEsThumbFile(null)
    setEsHadThumb(!!s.thumb)
    setEsVis(s.visibility || 'Öffentlich')
    setEsComments(!s.commentsOff)
  }
  const saveShort = async () => {
    if (!esTitle.trim() || esSaving) return
    setEsSaving(true)
    try {
      const patch = {
        title: esTitle.trim(),
        visibility: esVis,
        commentsOff: !esComments,
      }
      if (!esThumbFile && esHadThumb && !esThumb) patch.removeThumb = true
      let updated = await apiUpdateShort(esId, patch)
      if (esThumbFile) {
        updated = await apiUploadShortThumb(esId, await fileToDataUrl(esThumbFile))
      }
      const row = rowOf(updated)
      setShorts((list) => list.map((x) =>
        String(x.id) === String(esId)
          ? { ...row, icon: x.icon, color: x.color }
          : x
      ))
      setEsId(null)
      notify('Short gespeichert.')
    } catch (e) {
      notify(e.message || 'Speichern fehlgeschlagen.')
    } finally {
      setEsSaving(false)
    }
  }
  const takeEsThumb = (files) => {
    const f = [...(files || [])].find((x) => x.type.startsWith('image/'))
    if (!f) return
    if (esThumb.startsWith('blob:')) {
      try { URL.revokeObjectURL(esThumb) } catch { /* egal */ }
    }
    setEsThumbFile(f)
    setEsThumb(URL.createObjectURL(f))
  }
  const clearEsThumb = () => {
    if (esThumb.startsWith('blob:')) {
      try { URL.revokeObjectURL(esThumb) } catch { /* egal */ }
    }
    setEsThumbFile(null)
    setEsThumb('')
  }

  // Post-Edit öffnen / speichern (gleicher Editor, Community fest, Bilder bleiben)
  const openEditPost = (p) => {
    setCtx(null)
    setEpId(p.id)
  }
  const saveEditPost = async (data) => {
    try {
      const updated = await apiUpdatePost(epId, {
        title: data.title,
        text: data.text,
        tags: data.tags,
      })
      const row = postRowOf(updated)
      setPosts((list) => list.map((x) =>
        String(x.id) === String(epId) ? { ...row, images: x.images } : x
      ))
      setEpId(null)
      notify('Post gespeichert.')
    } catch (e) {
      notify(e.message || 'Speichern fehlgeschlagen.')
    }
  }
  // Post erstellen (echt in die gewählte Community, Bilder bleiben lokal als Vorschau)
  const createPost = async (data) => {
    const slug = data.commId
    if (!slug) {
      notify('Wähle zuerst eine Community.')
      return
    }
    try {
      const files = await Promise.all(
        (data.images || [])
          .filter((u) => typeof u === 'string' && u.startsWith('blob:'))
          .slice(0, 2)
          .map(async (u, i) => {
            const res = await fetch(u)
            const blob = await res.blob()
            return new File([blob], `bild${i + 1}.jpg`, { type: blob.type || 'image/jpeg' })
          })
      )
      const created = await apiCreatePost({
        slug,
        title: data.title,
        text: data.text,
        tags: data.tags,
        imageFiles: files,
      })
      setPosts((list) => [postRowOf(created), ...list])
      setNpOpen(false)
      setTab('posts')
      notify('Post veröffentlicht.')
    } catch (e) {
      notify(e.message || 'Posten fehlgeschlagen.')
    }
  }
  const editPost = epId !== null ? posts.find((x) => String(x.id) === String(epId)) : null
  const editComm = editPost
    ? (comms.find((c) => (c.slug || c.id) === editPost.communitySlug) || null)
    : null

  const findRow = (kind, id) => {
    const pool = kind === 'short' ? shorts : posts
    return pool.find((x) => String(x.id) === String(id))
  }

  // Kennzahlen-Karten (echt vom Server; alles 0 bis was passiert)
  const Z7 = [0, 0, 0, 0, 0, 0, 0]
  const ov = ovApi || {
    views: 0, watchHours: 0, subs: 0, likes: 0,
    delta: { views: 0, watchHours: 0, subs: 0, likes: 0 },
    daily: { views: Z7, watch: Z7, subs: Z7, likes: Z7 },
  }
  const factor = period / 28
  const scale = (n) => Math.round(n * factor)
  const stats = [
    { label: 'Aufrufe', icon: 'fa-eye', color: 'ic-yellow', value: fmt(scale(ov.views)), delta: ov.delta.views, bars: ov.daily.views },
    { label: 'Wiedergabezeit', icon: 'fa-clock', color: 'ic-teal', value: `${fmt(scale(ov.watchHours))} Std.`, delta: ov.delta.watchHours, bars: ov.daily.watch },
    { label: 'Follower', icon: 'fa-users', color: 'ic-violet', value: fmt(ov.subs), delta: ov.delta.subs, bars: ov.daily.subs },
    { label: 'Likes', icon: 'fa-heart', color: 'ic-yellow', value: fmt(scale(ov.likes)), delta: ov.delta.likes, bars: ov.daily.likes },
  ]

  const counts = { shorts: shorts.length, posts: posts.length }

  // Suche neben den Tabs: filtert Titel, Tags, Text, Community
  const q = query.trim().toLowerCase()
  const matches = (...parts) =>
    !q || parts.some((p) => String(p || '').toLowerCase().includes(q))
  const visibleShorts = shorts.filter((s) => matches(s.title, ...(s.tags || [])))
  const visiblePosts = posts.filter((p) => matches(p.title, p.text, p.community, ...(p.tags || [])))

  const delBtn = (kind, id, label) => (
    <button
      type="button"
      className="iconbtn sm"
      title={label || 'Löschen'}
      aria-label={label || 'Löschen'}
      onClick={() => setDeleteTarget({ kind, id })}
    >
      <i className="fa-solid fa-trash" />
    </button>
  )

  return (
    <div className="app-page studio-page">
      <div className="studio-head">
        <div className="studio-head-actions">
          <div className="toolbar" role="tablist" aria-label="Zeitraum">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={period === p.id}
                className={`toolbtn${period === p.id ? ' active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-brand" onClick={openCreate}>
            <i className="fa-solid fa-plus" /> Erstellen
          </button>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="stat-grid">
        {stats.map((s) => {
          const max = Math.max(...s.bars, 1)
          return (
            <div className="stat-card" key={s.label}>
              <span className="stat-label">
                <i className={`fa-solid ${s.icon} ${s.color}`} /> {s.label}
              </span>
              <div className="stat-row">
                <strong className="stat-value">{s.value}</strong>
                <span className="stat-delta up">{fmtDelta(s.delta)}</span>
              </div>
              <div className="minibar" aria-hidden="true">
                {s.bars.map((v, i) => (
                  <span
                    key={i}
                    style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%` }}
                    className={i === s.bars.length - 1 ? `hot ${s.color}` : undefined}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs + Suche */}
      <div className="studio-bar">
        <div className="toolbar studio-tabs" role="tablist" aria-label="Studio-Bereich">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`toolbtn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
              <span className="tab-count">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <label className="mini-search studio-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'shorts' ? 'Shorts durchsuchen' : 'Posts durchsuchen'}
            aria-label={tab === 'shorts' ? 'Shorts durchsuchen' : 'Posts durchsuchen'}
          />
        </label>
      </div>

      {/* Shorts */}
      {tab === 'shorts' && (
        <>
          <div className="table-scroll">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Short</th>
                  <th>Status</th>
                  <th>Datum</th>
                  <th className="num-h">Aufrufe</th>
                  <th className="num-h">Likes</th>
                  <th className="num-h">Kommis</th>
                  <th><span className="sr-only">Aktionen</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleShorts.map((s) => {
                  const pill = visPill(s)
                  return (
                    <tr key={s.id} onContextMenu={(e) => openCtx(e, 'short', s.id)}>
                      <td>
                        <span className="cell-main">
                          <Link to={`/shorts/${s.id}`} className="thumb-mini cell-link" aria-label={`Short ${s.title} ansehen`}>
                            {s.thumb ? (
                              <img className="thumb-img" src={s.thumb} alt="" />
                            ) : (
                              <i className={`fa-solid ${s.icon} ${s.color}`} />
                            )}
                            <span className="thumb-dur">{s.dur}</span>
                          </Link>
                          <span className="cell-text">
                            <Link to={`/shorts/${s.id}`} className="cell-title cell-link">{s.title}</Link>
                            {!!s.tags?.length && (
                              <small className="cell-sub">{s.tags.map((t) => `#${t}`).join(' ')}</small>
                            )}
                          </span>
                        </span>
                      </td>
                      <td><span className={`pill ${pill.cls}`}>{pill.label}</span></td>
                      <td className="cell-sub nowrap">{s.date}</td>
                      <td className="num">{fmt(s.views)}</td>
                      <td className="num">{s.likes}</td>
                      <td className="num">{s.comments}</td>
                      <td>
                        <span className="row-actions">
                          <button type="button" className="iconbtn sm" title="Bearbeiten" aria-label="Short bearbeiten" onClick={() => openEditShort(s)}>
                            <i className="fa-solid fa-pen" />
                          </button>
                          {delBtn('short', s.id)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {visibleShorts.length === 0 && !shortsLoading && !shortsError && (
                  <tr><td colSpan={7} className="cell-sub">{q ? `Keine Shorts für „${query.trim()}“ gefunden.` : 'Keine Shorts – lade oben welche hoch.'}</td></tr>
                )}
                {shortsLoading && (
                  <tr><td colSpan={7} className="cell-sub">
                    <i className="fa-solid fa-circle-notch fa-spin" /> Shorts werden geladen …
                  </td></tr>
                )}
                {shortsError && (
                  <tr><td colSpan={7} className="cell-sub">
                    {shortsError}{' '}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={loadShorts}>
                      <i className="fa-solid fa-rotate-right" /> Erneut versuchen
                    </button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Posts (echt aus den eigenen Communities) */}
      {tab === 'posts' && (
        <>
          <div className="table-scroll">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Community</th>
                  <th>Datum</th>
                  <th className="num-h">Bilder</th>
                  <th><span className="sr-only">Aktionen</span></th>
                </tr>
              </thead>
              <tbody>
                {visiblePosts.map((p) => (
                  <tr key={p.id} onContextMenu={(e) => openCtx(e, 'post', p.id)}>
                    <td>
                      <span className="cell-main">
                        <span className="thumb-mini square" aria-hidden="true">
                          {p.images?.[0] ? (
                            <img className="thumb-img" src={p.images[0]} alt="" />
                          ) : (
                            <i className="fa-solid fa-pen-to-square" />
                          )}
                        </span>
                        <span className="cell-text">
                          <strong className="cell-title">{p.title}</strong>
                          {!!p.tags?.length && (
                            <small className="cell-sub">{p.tags.map((t) => `#${t}`).join(' ')}</small>
                          )}
                        </span>
                      </span>
                    </td>
                    <td>
                      {p.communitySlug ? (
                        <Link to={`/t/${p.communitySlug}`} className="cell-link">t/{p.community}</Link>
                      ) : (
                        <span className="cell-sub">t/{p.community}</span>
                      )}
                    </td>
                    <td className="cell-sub nowrap">{p.date}</td>
                    <td className="num">{p.images?.length || 0}</td>
                    <td>
                      <span className="row-actions">
                        <button type="button" className="iconbtn sm" title="Bearbeiten" aria-label="Post bearbeiten" onClick={() => openEditPost(p)}>
                          <i className="fa-solid fa-pen" />
                        </button>
                        {delBtn('post', p.id)}
                      </span>
                    </td>
                  </tr>
                ))}
                {visiblePosts.length === 0 && !postsLoading && !postsError && (
                  <tr><td colSpan={5} className="cell-sub">{q ? `Keine Posts für „${query.trim()}“ gefunden.` : 'Keine Posts – erstelle oben einen neuen.'}</td></tr>
                )}
                {postsLoading && (
                  <tr><td colSpan={5} className="cell-sub">
                    <i className="fa-solid fa-circle-notch fa-spin" /> Posts werden geladen …
                  </td></tr>
                )}
                {postsError && (
                  <tr><td colSpan={5} className="cell-sub">
                    {postsError}{' '}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={loadShorts}>
                      <i className="fa-solid fa-rotate-right" /> Erneut versuchen
                    </button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Erstellen-Menü */}
      {createAt && (
        <div className="ctx-backdrop" onClick={() => setCreateAt(null)} onContextMenu={(e) => { e.preventDefault(); setCreateAt(null) }}>
          <div className="ctx-menu" role="menu" aria-label="Erstellen" style={{ top: createAt.y, left: createAt.x }} onClick={(e) => e.stopPropagation()}>
            <div className="ctx-title">Erstellen</div>
            <button type="button" onClick={() => { setCreateAt(null); setUploadOpen(true) }}>
              <i className="fa-solid fa-clapperboard ic-yellow" /> Short hochladen
            </button>
            <button type="button" onClick={() => { setCreateAt(null); setNpOpen(true) }}>
              <i className="fa-solid fa-pen-to-square ic-teal" /> Post erstellen
            </button>
          </div>
        </div>
      )}

      {/* Zeilen-Menü (Rechtsklick) */}
      {ctx && (() => {
        const row = findRow(ctx.kind, ctx.id)
        if (!row) return null
        // Echte Posts haben keine Detailseite – Teilen zeigt die Community.
        const url = ctx.kind === 'short'
          ? shortUrl(row.id)
          : `${window.location.origin}/t/${row.communitySlug || ''}`
        return (
          <div className="ctx-backdrop" onClick={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null) }}>
            <div className="ctx-menu" role="menu" aria-label="Zeilen-Menü" style={{ top: ctx.y, left: ctx.x }} onClick={(e) => e.stopPropagation()}>
              <div className="ctx-title">{row.title || row.text}</div>
              <button
                type="button"
                onClick={() => (ctx.kind === 'short' ? openEditShort(row) : openEditPost(row))}
              >
                <i className="fa-solid fa-pen ic-yellow" /> Bearbeiten
              </button>
              <button type="button" onClick={() => openShare(url, row.title || row.text)}>
                <i className="fa-solid fa-share-nodes ic-teal" /> Teilen
              </button>
              <button type="button" onClick={() => { const t = { kind: ctx.kind, id: ctx.id }; setCtx(null); setDeleteTarget(t) }}>
                <i className="fa-solid fa-trash ic-danger" /> Löschen
              </button>
            </div>
          </div>
        )
      })()}

      {/* Short bearbeiten */}
      {esId !== null && (
        <div className="sheet-backdrop" onClick={() => setEsId(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Short bearbeiten" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Short bearbeiten</strong></div>
            <div className="sheet-body">
              <div className="post-form">
                <label className="field"><span>Titel</span>
                  <input value={esTitle} onChange={(e) => setEsTitle(e.target.value)} maxLength={120} aria-label="Titel" />
                </label>
                <div className="field"><span>Thumbnail</span>
                  <div className="thumb-pick">
                    <span className="thumb-frame" aria-hidden="true">
                      {esThumb ? <img src={esThumb} alt="" /> : <i className="fa-regular fa-image" />}
                    </span>
                    <span className="thumb-meta">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => esThumbRef.current?.click()}>
                        <i className="fa-solid fa-upload" /> {esThumb ? 'Anderes wählen' : 'Bild wählen'}
                      </button>
                      {esThumb ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={clearEsThumb}>
                          <i className="fa-solid fa-rotate-left" /> Entfernen
                        </button>
                      ) : (
                        <small>Leer = Icon (Auto nur beim Upload)</small>
                      )}
                    </span>
                    <input
                      ref={esThumbRef}
                      type="file"
                      accept="image/*"
                      className="file-hidden"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={(e) => { takeEsThumb(e.target.files); e.target.value = '' }}
                    />
                  </div>
                </div>
                <div className="field"><span>Sichtbarkeit</span>
                  <div className="toolbar" role="radiogroup" aria-label="Sichtbarkeit">
                    {VISIBILITIES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={esVis === v}
                        className={`toolbtn${esVis === v ? ' active' : ''}`}
                        onClick={() => setEsVis(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="switch-row">
                  <span>Kommentare<small>Zuschauer dürfen kommentieren (Standard an)</small></span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={esComments}
                    aria-label="Kommentare"
                    className={`switch${esComments ? ' on' : ''}`}
                    onClick={() => setEsComments((v) => !v)}
                  />
                </div>
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" disabled={esSaving} onClick={() => setEsId(null)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" disabled={!esTitle.trim() || esSaving} onClick={saveShort}>
                {esSaving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Speichern …</> : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post bearbeiten – selber Editor, Community fest */}
      {epId !== null && editPost && (
        <div className="sheet-backdrop" onClick={() => setEpId(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Post bearbeiten" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post bearbeiten</strong></div>
            <PostEditor
              key={epId}
              fixedCommunity={editComm}
              initialTitle={editPost.title || ''}
              initialText={editPost.text || ''}
              initialTags={editPost.tags || []}
              initialImages={editPost.images || []}
              submitLabel="Speichern"
              onSubmit={saveEditPost}
              onCancel={() => setEpId(null)}
            />
          </div>
        </div>
      )}

      {/* Post erstellen – echt in die gewählte Community */}
      {npOpen && (
        <div className="sheet-backdrop" onClick={() => setNpOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Post erstellen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post erstellen</strong></div>
            <PostEditor
              communities={comms}
              communityId={npComm}
              onCommunity={setNpComm}
              submitLabel="Posten"
              onSubmit={createPost}
              onCancel={() => setNpOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Short-Upload (Wizard) */}
      {uploadOpen && (
        <div className="sheet-backdrop" onClick={() => setUploadOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Short hochladen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Short hochladen</strong></div>
            <ShortUpload
              key="upload"
              onDone={finishUpload}
              onCancel={() => setUploadOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Löschen bestätigen */}
      {deleteTarget && (() => {
        const row = findRow(deleteTarget.kind, deleteTarget.id)
        return (
          <div className="sheet-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="sheet sheet-slim" role="alertdialog" aria-modal="true" aria-label="Löschen bestätigen" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head"><strong className="sheet-title">Wirklich löschen?</strong></div>
              <div className="sheet-body">
                <p className="sheet-sub">
                  „{row?.title || row?.text || 'Dieser Inhalt'}“ wird endgültig entfernt
                  {deleteTarget.kind === 'short' ? ' (inkl. Video).' : ' (inkl. Bilder).'}
                </p>
              </div>
              <div className="sheet-foot">
                <button type="button" className="btn btn-ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>Abbrechen</button>
                <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
                  {deleting
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> Löschen …</>
                    : <><i className="fa-solid fa-trash" /> Löschen</>}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Teilen-Link kopieren */}
      {shareItem && (
        <ShareSheet
          sub={shareItem.sub}
          url={shareItem.url}
          copied={copiedShare}
          onCopy={copyShare}
          onClose={() => setShareItem(null)}
        />
      )}
    </div>
  )
}
