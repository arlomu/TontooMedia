import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  apiFeedShorts,
  apiLikeShort,
  apiPostShortComment,
  apiShortComments,
  apiViewShort,
  avatarSrc,
  mediaSrc,
} from '../../lib/api.js'
import ShareSheet from '../../components/ShareSheet.jsx'

const fmtNum = (n) => Number(n || 0).toLocaleString('de-DE')
const needLogin = (msg) => (/eingeloggt/i.test(msg || '') ? 'Bitte zuerst einloggen.' : (msg || 'Das hat nicht geklappt.'))

// Shorts-Viewer wie auf YouTube: echtes Hochkant-Video mit Ton (Standard an),
// roter Fortschritt unten, Action-Rail (Like/Kommentare/Teilen), User-Zeile
// mit Profilbild (Follow kommt später). Runter = älter, oben das Neueste.
export default function Shorts({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedError, setFeedError] = useState('')
  const [idx, setIdx] = useState(0) // man startet ganz oben (neuste)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [sndBlocked, setSndBlocked] = useState(false) // Browser blockt Ton-Autoplay
  const [progress, setProgress] = useState(0)
  const [slide, setSlide] = useState(null) // { from, to, dir } während der Wechsel-Animation
  const [drag, setDrag] = useState(0) // Live-Finger-Offset beim Ziehen (mobil)
  const [snapping, setSnapping] = useState(false) // true = weich zurückschnappen
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState({}) // shortId -> [...]
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const dragRef = useRef(null)
  const wheelCool = useRef(0)
  const busyRef = useRef(false)
  const timerRef = useRef(null)
  const snapTimer = useRef(null)
  const copyTimer = useRef(null)
  const viewedRef = useRef(new Set())

  const short = feed[idx]
  const shareUrl = short ? `${window.location.origin}/shorts/${short.id}` : ''

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    clearTimeout(snapTimer.current)
    clearTimeout(copyTimer.current)
  }, [])

  // Feed laden (öffentlich, neueste zuerst)
  const loadFeed = async () => {
    setLoading(true)
    setFeedError('')
    try {
      const list = await apiFeedShorts()
      setFeed(list || [])
      setIdx(0)
      setProgress(0)
    } catch (e) {
      setFeedError(e.message || 'Laden fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [])

  // URL <-> Short synchron halten: /shorts ohne/unbekannte id -> neuster Short,
  // externe URL-Wechsel (Direktlink, Zurück/Vor) springen ohne Animation hin
  useEffect(() => {
    if (loading || !feed.length) return
    if (!id || feed.findIndex((s) => String(s.id) === String(id)) === -1) {
      navigate(`/shorts/${feed[0].id}`, { replace: true })
    }
  }, [loading, feed, id, navigate])

  useEffect(() => {
    if (!id || !feed.length) return
    const j = feed.findIndex((s) => String(s.id) === String(id))
    if (j !== -1 && j !== idx) {
      setIdx(j)
      setProgress(0)
    }
  }, [id, feed, idx])

  // Menüs beim Short-Wechsel schließen
  useEffect(() => {
    setCommentsOpen(false)
    setShareOpen(false)
    setDraft('')
  }, [idx])

  // Aktives Video steuern: läuft mit Ton los; blockt der Browser den Ton,
  // startet es stumm + Hinweis-Pille ("Ton an") erscheint
  const shortId = short?.id
  useEffect(() => {
    const v = videoRef.current
    if (!v || !shortId) return
    setProgress(0)
    if (!playing) {
      v.pause()
      return
    }
    v.muted = muted
    const p = v.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (!v.muted) {
          v.muted = true
          setSndBlocked(true)
          v.play().catch(() => {})
        }
      })
    }
  }, [idx, shortId, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stumm-Schalter (User-Geste -> Ton darf wieder an)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = muted
    if (!muted) {
      setSndBlocked(false)
      if (playing) v.play().catch(() => {})
    }
  }, [muted, playing])

  // Aufruf zählen (einmal pro Short und Seitenaufruf)
  useEffect(() => {
    if (!shortId || !short || viewedRef.current.has(shortId)) return
    viewedRef.current.add(shortId)
    apiViewShort(shortId).then((d) => {
      if (d && typeof d.views === 'number') {
        setFeed((f) => f.map((x) => (x.id === shortId ? { ...x, views: d.views } : x)))
      }
    })
  }, [shortId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape schließt offene Menüs
  useEffect(() => {
    if (!commentsOpen && !shareOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setCommentsOpen(false)
      setShareOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commentsOpen, shareOpen])

  const onTimeUpdate = (e) => {
    const v = e.currentTarget
    if (v.duration) setProgress(v.currentTime / v.duration)
  }

  // Klick auf den roten Balken = springen
  const seek = (e) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const r = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    v.currentTime = ratio * v.duration
    setProgress(ratio)
  }

  // Tippen aufs Video = Pause / Weiter
  const tapVideo = () => setPlaying((p) => !p)

  // Like mit sofortigem Feedback, Server bestätigt (Rollback bei Fehler)
  const toggleLike = async (s) => {
    const was = !!s.liked
    setFeed((f) => f.map((x) => (x.id === s.id
      ? { ...x, liked: !was, likes: Math.max(0, (x.likes || 0) + (was ? -1 : 1)) }
      : x)))
    try {
      const r = await apiLikeShort(s.id)
      setFeed((f) => f.map((x) => (x.id === s.id ? { ...x, liked: r.liked, likes: r.likes } : x)))
    } catch (e) {
      setFeed((f) => f.map((x) => (x.id === s.id
        ? { ...x, liked: was, likes: Math.max(0, (x.likes || 0) + (was ? 1 : -1)) }
        : x)))
      showToast(needLogin(e.message))
    }
  }

  // Kommentare laden + posten
  const openComments = async (s) => {
    if (s.commentsOff || comments[s.id]) {
      setCommentsOpen(true)
      return
    }
    setCommentsOpen(true)
    setCommentsLoading(true)
    try {
      const list = await apiShortComments(s.id)
      setComments((m) => ({ ...m, [s.id]: list }))
    } catch (e) {
      showToast(e.message || 'Kommentare konnten nicht geladen werden.')
    } finally {
      setCommentsLoading(false)
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !short || posting) return
    setPosting(true)
    try {
      const c = await apiPostShortComment(short.id, text)
      setComments((m) => ({ ...m, [short.id]: [...(m[short.id] || []), c] }))
      setFeed((f) => f.map((x) => (x.id === short.id && typeof x.comments === 'number'
        ? { ...x, comments: x.comments + 1 }
        : x)))
      setDraft('')
      showToast('Kommentar gepostet.')
    } catch (err) {
      showToast(needLogin(err.message))
    } finally {
      setPosting(false)
    }
  }

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* egal */
      }
      ta.remove()
    }
    setCopiedShare(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedShare(false), 1600)
  }

  // Wechseln mit Push-Animation: neue Karte kommt vom Screen-Boden,
  // alte geht oben hinter der Suche weg (wie auf YouTube)
  const goTo = useCallback((d) => {
    if (busyRef.current || !feed.length) return
    const j = d === 'down'
      ? Math.min(feed.length - 1, idx + 1)
      : Math.max(0, idx - 1)
    if (j === idx) return
    busyRef.current = true
    setSlide({ from: idx, to: j, dir: d })
    setIdx(j)
    setProgress(0)
    setPlaying(true)
    navigate(`/shorts/${feed[j].id}`, { replace: true })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      busyRef.current = false
      setSlide(null)
    }, 400)
  }, [idx, feed, navigate])
  const prev = useCallback(() => goTo('up'), [goTo])
  const next = useCallback(() => goTo('down'), [goTo])

  // Hoch/Runter-Tasten wechseln den Short, Leertaste = Pause, M = stumm
  // (nicht, während man in ein Eingabefeld tippt)
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        next()
      } else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted((m) => !m)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  // Mausrad wie auf YouTube: scrollen = Short wechseln (mit Cooldown,
  // damit eine Geste nicht mehrere Shorts überspringt)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const now = Date.now()
      if (now - wheelCool.current < 800) return
      if (Math.abs(e.deltaY) < 20) return
      wheelCool.current = now
      if (e.deltaY > 0) next()
      else prev()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [prev, next])

  // Touch: Karte folgt live dem Finger (hoch/runter ziehen),
  // loslassen ab 80px = Short wechseln, sonst zurückschnappen
  const onTouchStart = (e) => {
    if (!busyRef.current && !slide && e.touches.length === 1) {
      dragRef.current = { startY: e.touches[0].clientY }
    }
  }
  const onTouchMove = (e) => {
    const d = dragRef.current
    if (!d || e.touches.length !== 1) return
    let dy = e.touches[0].clientY - d.startY
    // Gummiband an Anfang/Ende der Liste
    if ((idx === 0 && dy > 0) || (idx === feed.length - 1 && dy < 0)) dy *= 0.3
    setSnapping(false)
    setDrag(dy)
  }
  const onTouchEnd = (e) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    const dy = e.changedTouches[0].clientY - d.startY
    if (dy <= -80) {
      setDrag(0)
      next()
    } else if (dy >= 80) {
      setDrag(0)
      prev()
    } else {
      // zu kurz gezogen: weich zurückschnappen lassen
      setSnapping(true)
      setDrag(0)
      clearTimeout(snapTimer.current)
      snapTimer.current = setTimeout(() => setSnapping(false), 220)
    }
  }

  const dragStyle = !slide && (drag !== 0 || snapping)
    ? { transform: drag !== 0 ? `translateY(${drag}px)` : undefined, transition: snapping ? 'transform 0.2s ease' : undefined }
    : undefined

  const isMuted = muted || sndBlocked

  // Kompletter Karten-Inhalt (slidet als Ganzes, Buttons inklusive).
  // Nur die aktive Karte spielt Video ab, die weggehende zeigt Standbild.
  const renderCard = (s, active) => (
    <>
      {active ? (
        <video
          ref={videoRef}
          className="short-video"
          src={mediaSrc(s.videoUrl)}
          poster={mediaSrc(s.thumbUrl) || undefined}
          loop
          playsInline
          preload="auto"
          onClick={tapVideo}
          onTimeUpdate={onTimeUpdate}
        />
      ) : (
        <div className="short-screen">
          {mediaSrc(s.thumbUrl)
            ? <img className="short-video" src={mediaSrc(s.thumbUrl)} alt="" />
            : <i className="fa-solid fa-clapperboard" />}
        </div>
      )}
      {active && !playing && (
        <button type="button" className="short-bigplay" aria-label="Abspielen" onClick={() => setPlaying(true)}>
          <i className="fa-solid fa-play" />
        </button>
      )}

      {/* Obere Overlay-Leiste */}
      <div className="short-top">
        <div className="short-topgroup">
          <button type="button" className="pillbtn" aria-label={playing ? 'Pause' : 'Abspielen'} onClick={() => setPlaying((p) => !p)}>
            <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} />
          </button>
          <button type="button" className={`pillbtn${isMuted ? ' on' : ''}`} aria-label={isMuted ? 'Ton an' : 'Stumm'} onClick={() => setMuted((m) => !m)}>
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
          </button>
        </div>
      </div>

      {/* Ton-Hinweis, falls der Browser Ton-Autoplay blockt */}
      {active && sndBlocked && (
        <button type="button" className="snd-hint" onClick={() => setMuted(false)}>
          <i className="fa-solid fa-volume-xmark" /> Ton an
        </button>
      )}

      {/* Action-Rail rechts */}
      <div className="short-rail">
        <button
          type="button"
          className="rail-btn"
          aria-label="Liken"
          aria-pressed={!!s.liked}
          onClick={() => toggleLike(s)}
        >
          <i className={`${s.liked ? 'fa-solid liked' : 'fa-regular'} fa-heart`} />
        </button>
        <span className="rail-count">{fmtNum(s.likes)}</span>
        {!s.commentsOff && (
          <>
            <button type="button" className="rail-btn" aria-label="Kommentare" onClick={() => openComments(s)}>
              <i className="fa-regular fa-comment" />
            </button>
            <span className="rail-count">{typeof s.comments === 'number' ? fmtNum(s.comments) : s.comments}</span>
          </>
        )}
        <button type="button" className="rail-btn" aria-label="Teilen" onClick={() => { setCopiedShare(false); setShareOpen(true) }}>
          <i className="fa-solid fa-share" />
        </button>
        <span className="rail-count">Teilen</span>
      </div>

      {/* Info unten links: User mit Profilbild (Follow kommt später) */}
      <div className="short-info">
        <div className="short-userrow">
          <Link to={`/u/${s.author.username}`} className="short-avatar" aria-label={`Profil von ${s.author.username}`}>
            {s.author.avatarUrl && s.author.avatarUrl !== '/api/avatar/default'
              ? <img src={avatarSrc(s.author.avatarUrl)} alt="" />
              : <i className="fa-solid fa-circle-user" />}
          </Link>
          <span className="short-author">@{s.author.username}</span>
        </div>
        <div className="short-title">{s.title}</div>
        {!!s.tags?.length && (
          <div className="short-tags">{s.tags.map((t) => `#${t}`).join(' ')}</div>
        )}
        <div className="short-meta">{fmtNum(s.views)} Aufrufe</div>
      </div>

      {/* Roter Fortschritt unten (Klick = springen) */}
      {active && (
        <div className="short-progress" onClick={seek} role="slider" aria-label="Position" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}
          onKeyDown={(e) => {
            const v = videoRef.current
            if (!v || !v.duration) return
            if (e.key === 'ArrowRight') v.currentTime = Math.min(v.duration, v.currentTime + 5)
            if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5)
          }}
        >
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </>
  )

  const current = slide ? feed[slide.to] : short
  const sheetComments = short ? (comments[short.id] || []) : []

  return (
    <div className="app-page shorts-page">
      <div className="shorts-center">
      <div
        className="shorts-stage"
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading ? (
          <div className="shorts-status">
            <i className="fa-solid fa-circle-notch fa-spin" /> Shorts werden geladen …
          </div>
        ) : feedError ? (
          <div className="shorts-status">
            <p>{feedError}</p>
            <button type="button" className="btn btn-brand btn-sm" onClick={loadFeed}>
              <i className="fa-solid fa-rotate-right" /> Erneut versuchen
            </button>
          </div>
        ) : !feed.length ? (
          <div className="shorts-status">
            <p>Noch keine Shorts da.</p>
            <Link to="/studio" className="btn btn-brand btn-sm">
              <i className="fa-solid fa-cloud-arrow-up" /> Im Studio hochladen
            </Link>
          </div>
        ) : (
        <div className="shorts-stack">
          {slide && feed[slide.from] && (
            <div className={`short-player is-out slide-out-${slide.dir}`} aria-hidden="true">
              {renderCard(feed[slide.from], false)}
            </div>
          )}
          {current && (
          <div
            key={slide ? `in-${slide.to}` : current.id}
            className={`short-player${slide ? ` slide-in-${slide.dir}` : ''}`}
            style={dragStyle}
          >
            {renderCard(current, true)}
          </div>
          )}
        </div>
        )}

        {/* Up / Down Navigation */}
        {!!feed.length && (
        <div className="short-nav">
          <button type="button" className="iconbtn" aria-label="Vorheriger Short" onClick={prev} disabled={idx === 0}>
            <i className="fa-solid fa-arrow-up" />
          </button>
          <button
            type="button"
            className="iconbtn"
            aria-label="Nächster Short"
            onClick={next}
            disabled={idx === feed.length - 1}
          >
            <i className="fa-solid fa-arrow-down" />
          </button>
        </div>
        )}
      </div>
      </div>

      {/* Kommentare-Menü */}
      {commentsOpen && short && (
        <div className="sheet-backdrop" onClick={() => setCommentsOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Kommentare" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Kommentare <span className="sheet-count">{typeof short.comments === 'number' ? fmtNum(short.comments) : short.comments}</span></strong>
              <button type="button" className="sheet-x" aria-label="Schließen" onClick={() => setCommentsOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="sheet-body">
              {commentsLoading && (
                <p className="cell-sub"><i className="fa-solid fa-circle-notch fa-spin" /> Kommentare werden geladen …</p>
              )}
              {!commentsLoading && sheetComments.length === 0 && (
                <p className="cell-sub">Noch keine Kommentare – schreib den ersten!</p>
              )}
              {sheetComments.map((c) => (
                <div className="comment" key={c.id}>
                  <span className="comment-ava" aria-hidden="true">
                    {c.avatarUrl && c.avatarUrl !== '/api/avatar/default'
                      ? <img src={avatarSrc(c.avatarUrl)} alt="" />
                      : <i className="fa-solid fa-circle-user" />}
                  </span>
                  <div className="comment-main">
                    <div className="comment-head">@{c.username} <small>{c.date}</small></div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form className="comment-inputrow" onSubmit={submitComment}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Kommentieren …"
                aria-label="Kommentar schreiben"
                maxLength={280}
              />
              <button type="submit" className="btn btn-brand btn-sm" disabled={!draft.trim() || posting} aria-label="Absenden">
                <i className={`fa-solid ${posting ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Teilen-Menü */}
      {shareOpen && short && (
        <ShareSheet
          sub={`@${short.author.username} · ${short.title}`}
          url={shareUrl}
          copied={copiedShare}
          onCopy={copyShareUrl}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
