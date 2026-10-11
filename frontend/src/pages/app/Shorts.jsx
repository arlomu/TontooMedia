import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  apiFeedShorts,
  apiLikeShort,
  apiLikeShortComment,
  apiPostShortComment,
  apiShortComments,
  apiViewShort,
  avatarSrc,
  mediaSrc,
} from '../../lib/api.js'
import ShareSheet from '../../components/ShareSheet.jsx'

const fmtNum = (n) => Number(n || 0).toLocaleString('de-DE')
const needLogin = (msg) => (/eingeloggt/i.test(msg || '') ? 'Bitte zuerst einloggen.' : (msg || 'Das hat nicht geklappt.'))
const MUTE_KEY = 'tontoo_shorts_muted'
// Ton-Wahl merken (Standard: an). Ein Reload ohne Klick davor blockt der
// Browser trotzdem kurz – die erste Interaktion irgendwo entstummt dann sofort.
const readMutedPref = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

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
  const [muted, setMuted] = useState(readMutedPref)
  const setMutedPref = (m) => {
    setMuted(m)
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    } catch {
      /* egal */
    }
  }
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
  const [replyTo, setReplyTo] = useState(null) // Kommentar-id (nur 1 Stufe, kein Reply-auf-Reply)
  const [shareOpen, setShareOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const playingRef = useRef(true)
  playingRef.current = playing
  const mutedRef = useRef(muted)
  mutedRef.current = muted
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
    setReplyTo(null)
  }, [idx])

  // Aktives Video steuern: läuft mit Ton los; blockt der Browser den Ton
  // wirklich (NotAllowedError), startet es stumm + Hinweis-Pille ("Ton an").
  // Andere Fehler (z. B. abgebrochener Play-Versuch) stummen NICHT – onCanPlay
  // versucht es dann erneut, sobald Daten da sind.
  const shortId = short?.id
  const tryPlay = (v) => {
    v.muted = mutedRef.current
    const p = v.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        // Ton läuft -> Hinweis weg (auch wenn ein früherer Short blockt war)
        if (!v.muted) setSndBlocked(false)
      }).catch((err) => {
        if (err && err.name === 'NotAllowedError' && !v.muted) {
          v.muted = true
          setSndBlocked(true)
          v.play().catch(() => {})
        }
      })
    }
  }
  useEffect(() => {
    const v = videoRef.current
    if (!v || !shortId) return
    setProgress(0)
    if (!playing) {
      v.pause()
      return
    }
    tryPlay(v)
  }, [idx, shortId, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stumm-Schalter (User-Geste -> Ton darf wieder an)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = muted
    if (!muted) {
      setSndBlocked(false)
      if (playing) tryPlay(v)
    }
  }, [muted, playing]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Erste Interaktion irgendwo (Klick/Taste) entstummt sofort, falls Ton
  // gewollt ist, der Browser ihn nach Reload aber erst mal blockt hat
  useEffect(() => {
    const onFirst = () => {
      if (mutedRef.current) return // manuell stumm -> bleibt stumm
      const v = videoRef.current
      if (v && v.muted) {
        v.muted = false
        setSndBlocked(false)
        if (playingRef.current) v.play().catch(() => {})
      }
    }
    window.addEventListener('pointerdown', onFirst)
    window.addEventListener('keydown', onFirst)
    return () => {
      window.removeEventListener('pointerdown', onFirst)
      window.removeEventListener('keydown', onFirst)
    }
  }, [])

  // Escape schließt offene Menüs
  useEffect(() => {
    if (!commentsOpen && !shareOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setCommentsOpen(false)
      setShareOpen(false)
      setReplyTo(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commentsOpen, shareOpen])

  const closeComments = () => {
    setCommentsOpen(false)
    setReplyTo(null)
  }

  // Daten da, aber Effect lief zu früh: sobald abspielbar, los (falls Pause gewollt ist, passiert nichts)
  const onCanPlay = (e) => {
    const v = e.currentTarget
    if (playingRef.current && v.paused) tryPlay(v)
  }

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
      const c = await apiPostShortComment(short.id, text, replyTo)
      if (replyTo) {
        setComments((m) => ({
          ...m,
          [short.id]: (m[short.id] || []).map((x) => (x.id === replyTo
            ? { ...x, replies: [...(x.replies || []), c] }
            : x)),
        }))
        showToast('Antwort gepostet.')
      } else {
        setComments((m) => ({ ...m, [short.id]: [...(m[short.id] || []), c] }))
        showToast('Kommentar gepostet.')
      }
      setFeed((f) => f.map((x) => (x.id === short.id && typeof x.comments === 'number'
        ? { ...x, comments: x.comments + 1 }
        : x)))
      setDraft('')
      setReplyTo(null)
    } catch (err) {
      showToast(needLogin(err.message))
    } finally {
      setPosting(false)
    }
  }

  // Kommentar/Reply liken (sofortiges Feedback, Server bestätigt)
  const updateComment = (cid, parentId, fn) => {
    setComments((m) => {
      const list = m[short.id] || []
      return {
        ...m,
        [short.id]: list.map((c) => {
          if (parentId == null) return c.id === cid ? fn(c) : c
          if (c.id !== parentId) return c
          return { ...c, replies: (c.replies || []).map((r) => (r.id === cid ? fn(r) : r)) }
        }),
      }
    })
  }

  const toggleCommentLike = async (cid, parentId = null) => {
    const list = comments[short.id] || []
    const target = parentId == null
      ? list.find((c) => c.id === cid)
      : (list.find((c) => c.id === parentId)?.replies || []).find((r) => r.id === cid)
    if (!target) return
    const was = !!target.liked
    const wasCount = target.likes || 0
    updateComment(cid, parentId, (c) => ({
      ...c, liked: !was, likes: Math.max(0, wasCount + (was ? -1 : 1)),
    }))
    try {
      const r = await apiLikeShortComment(cid)
      updateComment(cid, parentId, (c) => ({ ...c, liked: r.liked, likes: r.likes }))
    } catch (err) {
      updateComment(cid, parentId, (c) => ({ ...c, liked: was, likes: wasCount }))
      showToast(needLogin(err.message))
    }
  }

  const nameOfReply = (cid) => {
    const c = (comments[short.id] || []).find((x) => x.id === cid)
    return c ? c.username : ''
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
        setMutedPref(!mutedRef.current)
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
          onCanPlay={onCanPlay}
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
          <button type="button" className={`pillbtn${isMuted ? ' on' : ''}`} aria-label={isMuted ? 'Ton an' : 'Stumm'} onClick={() => setMutedPref(!mutedRef.current)}>
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
          </button>
        </div>
      </div>

      {/* Ton-Hinweis, falls der Browser Ton-Autoplay wirklich blockt */}
      {active && sndBlocked && !muted && (
        <button type="button" className="snd-hint" onClick={() => setMutedPref(false)}>
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
            {s.author.avatarUrl
              ? <img src={avatarSrc(s.author.avatarUrl)} alt="" />
              : <i className="fa-solid fa-circle-user" />}
          </Link>
          <span className="short-author"><Link to={`/u/${s.author.username}`} className="cell-link">@{s.author.username}</Link></span>
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
            key={current.id}
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
        <div className="sheet-backdrop" onClick={closeComments}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Kommentare" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Kommentare <span className="sheet-count">{typeof short.comments === 'number' ? fmtNum(short.comments) : short.comments}</span></strong>
              <button type="button" className="sheet-x" aria-label="Schließen" onClick={closeComments}>
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
                    {c.avatarUrl
                      ? <img src={avatarSrc(c.avatarUrl)} alt="" />
                      : <i className="fa-solid fa-circle-user" />}
                  </span>
                  <div className="comment-main">
                    <div className="comment-head">@{c.username} <small>{c.date}</small></div>
                    <p className="comment-text">{c.text}</p>
                    <div className="comment-actions">
                      <button
                        type="button"
                        className={`comment-btn${c.liked ? ' active' : ''}`}
                        aria-pressed={!!c.liked}
                        onClick={() => toggleCommentLike(c.id)}
                      >
                        <i className={`${c.liked ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {fmtNum(c.likes)}
                      </button>
                      <button type="button" className="comment-btn" onClick={() => setReplyTo(c.id)}>
                        <i className="fa-solid fa-reply" /> Antworten
                      </button>
                    </div>
                    {(c.replies || []).length > 0 && (
                      <div className="replies">
                        {(c.replies || []).map((r) => (
                          <div className="comment" key={r.id}>
                            <span className="comment-ava" aria-hidden="true">
                              {r.avatarUrl
                                ? <img src={avatarSrc(r.avatarUrl)} alt="" />
                                : <i className="fa-solid fa-circle-user" />}
                            </span>
                            <div className="comment-main">
                              <div className="comment-head">@{r.username} <small>{r.date}</small></div>
                              <p className="comment-text">{r.text}</p>
                              <div className="comment-actions">
                                <button
                                  type="button"
                                  className={`comment-btn${r.liked ? ' active' : ''}`}
                                  aria-pressed={!!r.liked}
                                  onClick={() => toggleCommentLike(r.id, c.id)}
                                >
                                  <i className={`${r.liked ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {fmtNum(r.likes)}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {replyTo && (
              <div className="reply-hint">
                <span>Antwort an <strong>@{nameOfReply(replyTo)}</strong></span>
                <button type="button" className="comment-btn" onClick={() => setReplyTo(null)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}
            <form className="comment-inputrow" onSubmit={submitComment}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={replyTo ? `Antworten an @${nameOfReply(replyTo)} …` : 'Kommentieren …'}
                aria-label={replyTo ? 'Antwort schreiben' : 'Kommentar schreiben'}
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
