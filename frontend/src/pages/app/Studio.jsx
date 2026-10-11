import { useEffect, useRef, useState } from 'react'
import {
  COMMUNITIES,
  DEMO_PLANNED,
  DEMO_STUDIO_OVERVIEW,
  DEMO_STUDIO_POSTS,
  DEMO_STUDIO_SHORTS,
  commIdOf,
  postUrlOf,
} from './demoData.js'
import ShareSheet from '../../components/ShareSheet.jsx'

const TABS = [
  { id: 'shorts', label: 'Shorts', icon: 'fa-clapperboard' },
  { id: 'posts', label: 'Posts', icon: 'fa-pen-to-square' },
  { id: 'geplant', label: 'Geplant', icon: 'fa-calendar-clock' },
]
const PERIODS = [
  { id: 7, label: '7 Tage' },
  { id: 28, label: '28 Tage' },
  { id: 90, label: '90 Tage' },
]
const VISIBILITIES = ['Öffentlich', 'Ungelisted', 'Privat']

const fmt = (n) => Number(n || 0).toLocaleString('de-DE')
const fmtDelta = (d) => `+${String(d).replace('.', ',')} %`
const shortUrl = (id) => `${window.location.origin}/shorts/${id}`

// Sichtbarkeits-Pille: Entwurf schlägt Sichtbarkeit
const visPill = (s) => {
  if (s.status === 'draft') return { label: 'Entwurf', cls: 'draft' }
  if (s.visibility === 'Öffentlich') return { label: 'Öffentlich', cls: 'live' }
  if (s.visibility === 'Ungelisted') return { label: 'Ungelisted', cls: 'plan' }
  return { label: 'Privat', cls: 'private' }
}

// Creator-Studio (Demo): Kennzahlen, Shorts/Post-Verwaltung mit Bearbeiten,
// Hochladen, Planen und Löschen. Alles Beispiel, kein Backend.
export default function Studio({ showToast }) {
  const notify = (msg) => showToast?.(msg)
  const [tab, setTab] = useState('shorts')
  const [period, setPeriod] = useState(28)
  const [shorts, setShorts] = useState(DEMO_STUDIO_SHORTS)
  const [posts, setPosts] = useState(DEMO_STUDIO_POSTS)
  const [planned, setPlanned] = useState(DEMO_PLANNED)
  const [dragging, setDragging] = useState(false)
  const [createAt, setCreateAt] = useState(null) // { x, y } Erstellen-Menü
  const [ctx, setCtx] = useState(null) // { x, y, kind, id } Zeilen-Menü
  const [armDelete, setArmDelete] = useState(null)
  const [shareItem, setShareItem] = useState(null) // { url, sub }
  const [copiedShare, setCopiedShare] = useState(false)
  // Short bearbeiten
  const [esId, setEsId] = useState(null)
  const [esTitle, setEsTitle] = useState('')
  const [esDesc, setEsDesc] = useState('')
  const [esVis, setEsVis] = useState('Öffentlich')
  // Post bearbeiten / erstellen
  const [epId, setEpId] = useState(null)
  const [npOpen, setNpOpen] = useState(false)
  const [npComm, setNpComm] = useState(COMMUNITIES[0].id)
  const [npTitle, setNpTitle] = useState('')
  const [npText, setNpText] = useState('')
  const [npWhen, setNpWhen] = useState('jetzt')
  const [npDate, setNpDate] = useState('')
  const fileRef = useRef(null)
  const armTimer = useRef(null)
  const copyTimer = useRef(null)

  useEffect(() => () => {
    clearTimeout(armTimer.current)
    clearTimeout(copyTimer.current)
  }, [])

  // Escape schließt Menüs und Dialoge
  useEffect(() => {
    if (!ctx && !createAt && esId === null && epId === null && !npOpen && !shareItem) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setCtx(null)
      setCreateAt(null)
      setEsId(null)
      setEpId(null)
      setNpOpen(false)
      setShareItem(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctx, createAt, esId, epId, npOpen, shareItem])

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

  // Dateien → neue Short-Entwürfe (Demo: nur Liste, kein Upload)
  const addFiles = (files) => {
    const list = [...files].filter((f) => f && f.name)
    if (!list.length) return
    const fresh = list.map((f, i) => ({
      id: `up-${Date.now()}-${i}`,
      author: 'du',
      title: f.name.replace(/\.[^.]+$/, '') || 'Unbenannter Short',
      likes: '0',
      comments: '0',
      remixes: '0',
      icon: 'fa-clapperboard',
      color: 'ic-teal',
      dur: '–',
      views: 0,
      date: 'heute',
      status: 'draft',
      visibility: 'Privat',
      desc: '',
    }))
    setShorts((s) => [...fresh, ...s])
    setTab('shorts')
    notify(`${fresh.length === 1 ? 'Datei' : `${fresh.length} Dateien`} hinzugefügt (Demo-Entwurf).`)
  }

  // Löschen mit 2-Klick-Bestätigung (kein Browser-Dialog)
  const askDelete = (kind, id) => {
    const key = `${kind}:${id}`
    if (armDelete === key) {
      clearTimeout(armTimer.current)
      setArmDelete(null)
      if (kind === 'short') setShorts((s) => s.filter((x) => String(x.id) !== String(id)))
      else if (kind === 'post') setPosts((s) => s.filter((x) => String(x.id) !== String(id)))
      else setPlanned((s) => s.filter((x) => String(x.id) !== String(id)))
      notify('Gelöscht (Demo).')
    } else {
      setArmDelete(key)
      clearTimeout(armTimer.current)
      armTimer.current = setTimeout(() => setArmDelete(null), 3000)
    }
  }

  // Geplanten Inhalt sofort veröffentlichen
  const publishPlanned = (item) => {
    setPlanned((s) => s.filter((x) => String(x.id) !== String(item.id)))
    if (item.kind === 'short') {
      setShorts((s) => [{
        id: `pub-${Date.now()}`, author: 'du', title: item.title,
        likes: '0', comments: '0', remixes: '0', icon: item.icon, color: item.color,
        dur: item.dur || '–', views: 0, date: 'heute', status: 'live',
        visibility: 'Öffentlich', desc: '',
      }, ...s])
    } else {
      const c = COMMUNITIES.find((x) => x.id === item.commId) || COMMUNITIES[0]
      setPosts((s) => [{
        id: `pub-${Date.now()}`, author: 'du', community: c.name, commId: c.id,
        title: item.title, text: item.text || '', time: 'jetzt', date: 'heute',
        likes: 0, comments: 0, views: 0, status: 'live', icon: c.icon, color: c.color,
      }, ...s])
    }
    notify(`„${item.title}“ ist jetzt live (Demo).`)
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

  // Short-Edit öffnen / speichern
  const openEditShort = (s) => {
    setCtx(null)
    setEsId(s.id)
    setEsTitle(s.title)
    setEsDesc(s.desc || '')
    setEsVis(s.visibility || 'Öffentlich')
  }
  const saveShort = () => {
    if (!esTitle.trim()) return
    setShorts((list) => list.map((x) =>
      String(x.id) === String(esId)
        ? { ...x, title: esTitle.trim(), desc: esDesc.trim(), visibility: esVis }
        : x
    ))
    setEsId(null)
    notify('Short gespeichert (Demo).')
  }

  // Post-Edit öffnen / speichern
  const openEditPost = (p) => {
    setCtx(null)
    setEpId(p.id)
    setNpComm(commIdOf(p))
    setNpTitle(p.title || '')
    setNpText(p.text || '')
  }
  const savePost = () => {
    if (!npTitle.trim()) return
    const c = COMMUNITIES.find((x) => x.id === npComm) || COMMUNITIES[0]
    setPosts((list) => list.map((x) =>
      String(x.id) === String(epId)
        ? { ...x, title: npTitle.trim(), text: npText.trim(), community: c.name, commId: c.id, icon: c.icon, color: c.color }
        : x
    ))
    setEpId(null)
    notify('Post gespeichert (Demo).')
  }

  // Neuen Post anlegen (jetzt oder geplant)
  const resetNp = () => {
    setNpOpen(false)
    setNpTitle('')
    setNpText('')
    setNpWhen('jetzt')
    setNpDate('')
    setNpComm(COMMUNITIES[0].id)
  }
  const saveNewPost = () => {
    if (!npTitle.trim()) return
    const c = COMMUNITIES.find((x) => x.id === npComm) || COMMUNITIES[0]
    if (npWhen === 'planen') {
      const when = npDate ? new Date(npDate).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Geplant'
      setPlanned((s) => [{
        id: `plan-${Date.now()}`, kind: 'post', author: 'du',
        community: c.name, commId: c.id, title: npTitle.trim(), text: npText.trim(),
        plannedFor: when, icon: c.icon, color: c.color,
      }, ...s])
      setTab('geplant')
      notify('Post eingeplant (Demo).')
    } else {
      setPosts((s) => [{
        id: `new-${Date.now()}`, author: 'du', community: c.name, commId: c.id,
        title: npTitle.trim(), text: npText.trim(), time: 'jetzt', date: 'heute',
        likes: 0, comments: 0, views: 0, status: 'live', icon: c.icon, color: c.color,
      }, ...s])
      setTab('posts')
      notify('Post veröffentlicht (Demo).')
    }
    resetNp()
  }

  const findRow = (kind, id) => {
    const pool = kind === 'short' ? shorts : kind === 'post' ? posts : planned
    return pool.find((x) => String(x.id) === String(id))
  }

  // Kennzahlen-Karten
  const ov = DEMO_STUDIO_OVERVIEW
  const factor = period / 28
  const scale = (n) => Math.round(n * factor)
  const stats = [
    { label: 'Aufrufe', icon: 'fa-eye', color: 'ic-yellow', value: fmt(scale(ov.views)), delta: ov.delta.views, bars: ov.daily.views },
    { label: 'Wiedergabezeit', icon: 'fa-clock', color: 'ic-teal', value: `${fmt(scale(ov.watchHours))} Std.`, delta: ov.delta.watchHours, bars: ov.daily.watch },
    { label: 'Follower', icon: 'fa-users', color: 'ic-violet', value: fmt(ov.subs), delta: ov.delta.subs, bars: ov.daily.subs },
    { label: 'Likes', icon: 'fa-heart', color: 'ic-yellow', value: fmt(scale(ov.likes)), delta: ov.delta.likes, bars: ov.daily.likes },
  ]

  const counts = { shorts: shorts.length, posts: posts.length, geplant: planned.length }

  const delBtn = (kind, id, label) => {
    const armed = armDelete === `${kind}:${id}`
    return (
      <button
        type="button"
        className={`iconbtn sm${armed ? ' danger-arm' : ''}`}
        title={armed ? 'Wirklich löschen? Nochmal klicken.' : (label || 'Löschen')}
        aria-label={armed ? 'Wirklich löschen? Nochmal klicken.' : (label || 'Löschen')}
        onClick={() => askDelete(kind, id)}
      >
        <i className={`fa-solid ${armed ? 'fa-triangle-exclamation' : 'fa-trash'}`} />
      </button>
    )
  }

  return (
    <div className="app-page studio-page">
      <div className="studio-head">
        <div>
          <h2 className="app-title">Studio</h2>
          <p className="app-sub">Verwalten, bearbeiten, hochladen und planen – alles Demo.</p>
        </div>
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
          const max = Math.max(...s.bars)
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

      {/* Tabs */}
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

      {/* Shorts */}
      {tab === 'shorts' && (
        <>
          <button
            type="button"
            className={`dropzone${dragging ? ' dragging' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          >
            <i className="fa-solid fa-cloud-arrow-up dropic ic-teal" />
            <strong>Dateien hierher ziehen oder klicken</strong>
            <small>MP4, MOV – landet als Entwurf in der Liste (Demo)</small>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*,image/*"
            multiple
            className="file-hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
          />

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
                {shorts.map((s) => {
                  const pill = visPill(s)
                  return (
                    <tr key={s.id} onContextMenu={(e) => openCtx(e, 'short', s.id)}>
                      <td>
                        <span className="cell-main">
                          <span className="thumb-mini" aria-hidden="true">
                            <i className={`fa-solid ${s.icon} ${s.color}`} />
                            <span className="thumb-dur">{s.dur}</span>
                          </span>
                          <span className="cell-text">
                            <strong className="cell-title">{s.title}</strong>
                            <small className="cell-sub">@{s.author}</small>
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
                {shorts.length === 0 && (
                  <tr><td colSpan={7} className="cell-sub">Keine Shorts – lade oben welche hoch.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Posts */}
      {tab === 'posts' && (
        <>
          <div className="posts-bar">
            <button type="button" className="btn btn-brand" onClick={() => { setNpOpen(true); setNpWhen('jetzt') }}>
              <i className="fa-solid fa-plus" /> Neuer Post
            </button>
          </div>
          <div className="table-scroll">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Status</th>
                  <th>Datum</th>
                  <th className="num-h">Aufrufe</th>
                  <th className="num-h">Likes</th>
                  <th className="num-h">Kommis</th>
                  <th><span className="sr-only">Aktionen</span></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} onContextMenu={(e) => openCtx(e, 'post', p.id)}>
                    <td>
                      <span className="cell-main">
                        <span className="thumb-mini square" aria-hidden="true">
                          <i className={`fa-solid ${p.icon} ${p.color}`} />
                        </span>
                        <span className="cell-text">
                          <strong className="cell-title">{p.title || p.text}</strong>
                          <small className="cell-sub">t/{p.community} · {p.time}</small>
                        </span>
                      </span>
                    </td>
                    <td><span className="pill live">Live</span></td>
                    <td className="cell-sub nowrap">{p.date || '–'}</td>
                    <td className="num">{fmt(p.views)}</td>
                    <td className="num">{fmt(p.likes)}</td>
                    <td className="num">{fmt(p.comments)}</td>
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
                {posts.length === 0 && (
                  <tr><td colSpan={7} className="cell-sub">Keine Posts – erstelle oben einen neuen.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Geplant */}
      {tab === 'geplant' && (
        <div className="table-scroll">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Inhalt</th>
                <th>Typ</th>
                <th>Geplant für</th>
                <th><span className="sr-only">Aktionen</span></th>
              </tr>
            </thead>
            <tbody>
              {planned.map((p) => (
                <tr key={p.id} onContextMenu={(e) => openCtx(e, 'plan', p.id)}>
                  <td>
                    <span className="cell-main">
                      <span className={`thumb-mini${p.kind === 'post' ? ' square' : ''}`} aria-hidden="true">
                        <i className={`fa-solid ${p.icon} ${p.color}`} />
                        {p.kind === 'short' && <span className="thumb-dur">{p.dur}</span>}
                      </span>
                      <span className="cell-text">
                        <strong className="cell-title">{p.title}</strong>
                        <small className="cell-sub">
                          {p.kind === 'post' ? `t/${p.community}` : 'Short'} · von {p.author === 'du' ? 'dir' : p.author}
                        </small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="pill plan">{p.kind === 'short' ? 'Short' : 'Post'}</span>
                  </td>
                  <td className="cell-sub nowrap">
                    <i className="fa-regular fa-clock" /> {p.plannedFor}
                  </td>
                  <td>
                    <span className="row-actions">
                      <button type="button" className="iconbtn sm go-live" title="Jetzt veröffentlichen" aria-label="Jetzt veröffentlichen" onClick={() => publishPlanned(p)}>
                        <i className="fa-solid fa-paper-plane" />
                      </button>
                      {delBtn('plan', p.id)}
                    </span>
                  </td>
                </tr>
              ))}
              {planned.length === 0 && (
                <tr><td colSpan={4} className="cell-sub">Nichts geplant – erstelle einen Post und wähle „Planen“.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Erstellen-Menü */}
      {createAt && (
        <div className="ctx-backdrop" onClick={() => setCreateAt(null)} onContextMenu={(e) => { e.preventDefault(); setCreateAt(null) }}>
          <div className="ctx-menu" role="menu" aria-label="Erstellen" style={{ top: createAt.y, left: createAt.x }} onClick={(e) => e.stopPropagation()}>
            <div className="ctx-title">Erstellen</div>
            {/* Demo-Einträge ohne Funktion */}
            <button type="button" onClick={() => setCreateAt(null)}>
              <i className="fa-solid fa-clapperboard ic-yellow" /> Short hochladen
            </button>
            <button type="button" onClick={() => setCreateAt(null)}>
              <i className="fa-solid fa-pen-to-square ic-teal" /> Post erstellen
            </button>
          </div>
        </div>
      )}

      {/* Zeilen-Menü (Rechtsklick) */}
      {ctx && (() => {
        const row = findRow(ctx.kind, ctx.id)
        if (!row) return null
        const isPlan = ctx.kind === 'plan'
        const url = ctx.kind === 'short' ? shortUrl(row.id) : ctx.kind === 'post' ? postUrlOf(row) : null
        return (
          <div className="ctx-backdrop" onClick={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null) }}>
            <div className="ctx-menu" role="menu" aria-label="Zeilen-Menü" style={{ top: ctx.y, left: ctx.x }} onClick={(e) => e.stopPropagation()}>
              <div className="ctx-title">{row.title || row.text}</div>
              {isPlan ? (
                <button type="button" onClick={() => { setCtx(null); publishPlanned(row) }}>
                  <i className="fa-solid fa-paper-plane ic-teal" /> Jetzt veröffentlichen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => (ctx.kind === 'short' ? openEditShort(row) : openEditPost(row))}
                >
                  <i className="fa-solid fa-pen ic-yellow" /> Bearbeiten
                </button>
              )}
              {url && (
                <button type="button" onClick={() => openShare(url, row.title || row.text)}>
                  <i className="fa-solid fa-share-nodes ic-teal" /> Teilen
                </button>
              )}
              <button type="button" onClick={() => { setCtx(null); askDelete(ctx.kind, ctx.id) }}>
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
                <label className="field"><span>Beschreibung</span>
                  <textarea value={esDesc} onChange={(e) => setEsDesc(e.target.value)} rows={3} maxLength={500} aria-label="Beschreibung" />
                </label>
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
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEsId(null)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" disabled={!esTitle.trim()} onClick={saveShort}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Post bearbeiten */}
      {epId !== null && (
        <div className="sheet-backdrop" onClick={() => setEpId(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Post bearbeiten" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post bearbeiten</strong></div>
            <div className="sheet-body">
              <div className="post-form">
                <label className="field"><span>Community</span>
                  <span className="chipwrap">
                    {COMMUNITIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={npComm === c.id}
                        className={`chipbtn${npComm === c.id ? ' active' : ''}`}
                        onClick={() => setNpComm(c.id)}
                      >
                        <i className={`fa-solid ${c.icon} ${c.color}`} /> t/{c.name}
                      </button>
                    ))}
                  </span>
                </label>
                <label className="field"><span>Titel</span>
                  <input value={npTitle} onChange={(e) => setNpTitle(e.target.value)} maxLength={120} aria-label="Titel" />
                </label>
                <label className="field"><span>Text</span>
                  <textarea value={npText} onChange={(e) => setNpText(e.target.value)} rows={4} maxLength={1000} aria-label="Text" />
                </label>
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEpId(null)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" disabled={!npTitle.trim()} onClick={savePost}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Post erstellen (jetzt oder planen) */}
      {npOpen && (
        <div className="sheet-backdrop" onClick={() => setNpOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Post erstellen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong className="sheet-title">Post erstellen</strong></div>
            <div className="sheet-body">
              <div className="post-form">
                <label className="field"><span>Community</span>
                  <span className="chipwrap">
                    {COMMUNITIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={npComm === c.id}
                        className={`chipbtn${npComm === c.id ? ' active' : ''}`}
                        onClick={() => setNpComm(c.id)}
                      >
                        <i className={`fa-solid ${c.icon} ${c.color}`} /> t/{c.name}
                      </button>
                    ))}
                  </span>
                </label>
                <label className="field"><span>Titel</span>
                  <input value={npTitle} onChange={(e) => setNpTitle(e.target.value)} maxLength={120} placeholder="Worum geht's?" aria-label="Titel" />
                </label>
                <label className="field"><span>Text</span>
                  <textarea value={npText} onChange={(e) => setNpText(e.target.value)} rows={4} maxLength={1000} placeholder="Text (optional)" aria-label="Text" />
                </label>
                <div className="field"><span>Wann?</span>
                  <div className="toolbar" role="radiogroup" aria-label="Zeitpunkt">
                    <button type="button" role="radio" aria-checked={npWhen === 'jetzt'} className={`toolbtn${npWhen === 'jetzt' ? ' active' : ''}`} onClick={() => setNpWhen('jetzt')}>
                      <i className="fa-solid fa-bolt" /> Jetzt
                    </button>
                    <button type="button" role="radio" aria-checked={npWhen === 'planen'} className={`toolbtn${npWhen === 'planen' ? ' active' : ''}`} onClick={() => setNpWhen('planen')}>
                      <i className="fa-solid fa-calendar-clock" /> Planen
                    </button>
                  </div>
                </div>
                {npWhen === 'planen' && (
                  <label className="field"><span>Datum &amp; Uhrzeit</span>
                    <input type="datetime-local" value={npDate} onChange={(e) => setNpDate(e.target.value)} aria-label="Datum und Uhrzeit" />
                  </label>
                )}
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setNpOpen(false)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" disabled={!npTitle.trim()} onClick={saveNewPost}>
                <i className="fa-solid fa-paper-plane" /> {npWhen === 'planen' ? 'Einplanen' : 'Posten'}
              </button>
            </div>
          </div>
        </div>
      )}

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
