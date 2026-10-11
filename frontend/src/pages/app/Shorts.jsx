import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DEMO_COMMENTS, DEMO_SHORTS } from './demoData.js'

// Jeder Short hat seine eigene URL: /shorts/:id (zieht beim Scrollen mit).
const indexFromId = (id) => {
  const j = DEMO_SHORTS.findIndex((s) => String(s.id) === String(id))
  return j === -1 ? 0 : j
}

// Shorts-Viewer wie auf YouTube: Hochkant-Player, Overlays, Action-Rail,
// Follow-Button, Up/Down-Navigation. Alles Beispiel, kein echtes Video.
export default function Shorts({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [idx, setIdx] = useState(() => indexFromId(id)) // man startet ganz oben
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [liked, setLiked] = useState({})
  const [followed, setFollowed] = useState({})
  const [slide, setSlide] = useState(null) // { from, to, dir } während der Wechsel-Animation
  const [drag, setDrag] = useState(0) // Live-Finger-Offset beim Ziehen (mobil)
  const [snapping, setSnapping] = useState(false) // true = weich zurückschnappen
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [extraComments, setExtraComments] = useState({}) // selbst gepostet, pro Short-id
  const [extraReplies, setExtraReplies] = useState({}) // selbst gepostet, pro Kommentar-id
  const [likedComments, setLikedComments] = useState({}) // Kommentar-id -> bool
  const [replyTo, setReplyTo] = useState(null) // Kommentar-id oder null
  const [draft, setDraft] = useState('')
  const stageRef = useRef(null)
  const dragRef = useRef(null)
  const wheelCool = useRef(0)
  const busyRef = useRef(false)
  const timerRef = useRef(null)
  const snapTimer = useRef(null)

  const short = DEMO_SHORTS[idx]
  const shareUrl = `${window.location.origin}/shorts/${short.id}`

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    clearTimeout(snapTimer.current)
  }, [])

  // URL <-> Short synchron halten: /shorts ohne/unbekannte id -> erster Short,
  // externe URL-Wechsel (Direktlink, Zurück/Vor) springen ohne Animation hin
  useEffect(() => {
    if (!id || DEMO_SHORTS.findIndex((s) => String(s.id) === String(id)) === -1) {
      navigate(`/shorts/${DEMO_SHORTS[0].id}`, { replace: true })
      return
    }
    setIdx(indexFromId(id))
  }, [id, navigate])

  // Menüs beim Short-Wechsel schließen
  useEffect(() => {
    setCommentsOpen(false)
    setShareOpen(false)
    setReplyTo(null)
  }, [idx])

  // Escape schließt offene Menüs
  useEffect(() => {
    if (!commentsOpen && !shareOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setCommentsOpen(false)
        setShareOpen(false)
        setReplyTo(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commentsOpen, shareOpen])

  const closeComments = () => {
    setCommentsOpen(false)
    setReplyTo(null)
  }

  // Alle Kommentare zum aktuellen Short: Demo + selbst gepostete
  const allComments = [...(DEMO_COMMENTS[short.id] || []), ...(extraComments[short.id] || [])]
  const repliesOf = (c) => [...(c.replies || []), ...(extraReplies[c.id] || [])]
  const commentLikes = (c) => c.likes + (likedComments[c.id] ? 1 : 0)
  const toggleCommentLike = (cid) => setLikedComments((m) => ({ ...m, [cid]: !m[cid] }))
  const nameOf = (cid) => {
    for (const c of allComments) {
      if (c.id === cid) return c.author
      for (const r of repliesOf(c)) if (r.id === cid) return r.author
    }
    return ''
  }

  const submitComment = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    const entry = { id: `u-${Date.now()}`, author: 'du', time: 'jetzt', text, likes: 0, replies: [] }
    if (replyTo) {
      setExtraReplies((m) => ({ ...m, [replyTo]: [...(m[replyTo] || []), entry] }))
      showToast('Antwort gepostet (Beispiel).')
    } else {
      setExtraComments((m) => ({ ...m, [short.id]: [...(m[short.id] || []), entry] }))
      showToast('Kommentar gepostet (Beispiel).')
    }
    setDraft('')
    setReplyTo(null)
  }

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link kopiert.')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        showToast('Link kopiert.')
      } catch {
        showToast('Kopieren geht hier nicht (Beispiel).')
      }
      ta.remove()
    }
  }

  // Wechseln mit Push-Animation: neue Karte kommt vom Screen-Boden,
  // alte geht oben hinter der Suche weg (wie auf YouTube)
  const goTo = useCallback((d) => {
    if (busyRef.current) return
    const j = d === 'down'
      ? Math.min(DEMO_SHORTS.length - 1, idx + 1)
      : Math.max(0, idx - 1)
    if (j === idx) return
    busyRef.current = true
    setSlide({ from: idx, to: j, dir: d })
    setIdx(j)
    navigate(`/shorts/${DEMO_SHORTS[j].id}`, { replace: true })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      busyRef.current = false
      setSlide(null)
    }, 400)
  }, [idx, navigate])
  const prev = useCallback(() => goTo('up'), [goTo])
  const next = useCallback(() => goTo('down'), [goTo])

  // Hoch/Runter-Tasten wechseln den Short
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        next()
      } else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
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
    if ((idx === 0 && dy > 0) || (idx === DEMO_SHORTS.length - 1 && dy < 0)) dy *= 0.3
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

  // Kompletter Karten-Inhalt (slidet als Ganzes, Buttons inklusive)
  const renderCard = (s) => (
    <>
      {/* Platzhalter statt Video */}
      <div className="short-screen">
        <i className={`fa-solid ${s.icon} ${s.color}`} />
        <small>{s.title}</small>
      </div>
      {!playing && (
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
          <button type="button" className="pillbtn" aria-label={muted ? 'Ton an' : 'Stumm'} onClick={() => setMuted((m) => !m)}>
            <i className={`fa-solid ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
          </button>
        </div>
      </div>

      {/* Action-Rail rechts */}
      <div className="short-rail">
        <button
          type="button"
          className="rail-btn"
          aria-label="Liken"
          aria-pressed={!!liked[s.id]}
          onClick={() => setLiked((st) => ({ ...st, [s.id]: !st[s.id] }))}
        >
          <i className={`${liked[s.id] ? 'fa-solid liked' : 'fa-regular'} fa-heart`} />
        </button>
        <span className="rail-count">{s.likes}</span>
        <button type="button" className="rail-btn" aria-label="Kommentare" onClick={() => setCommentsOpen(true)}>
          <i className="fa-regular fa-comment" />
        </button>
        <span className="rail-count">{s.comments}</span>
        <button type="button" className="rail-btn" aria-label="Teilen" onClick={() => setShareOpen(true)}>
          <i className="fa-solid fa-share" />
        </button>
        <span className="rail-count">Teilen</span>
      </div>

      {/* Info unten links */}
      <div className="short-info">
        <div className="short-userrow">
          <Link to={`/u/${s.author}`} className="short-avatar" aria-label={`Profil von ${s.author}`}>
            <i className="fa-solid fa-circle-user" />
          </Link>
          <span className="short-author">@{s.author}</span>
          <button
            type="button"
            className={`btn btn-sm ${followed[s.author] ? 'btn-ghost' : 'btn-brand'} follow-btn`}
            onClick={() => setFollowed((st) => ({ ...st, [s.author]: !st[s.author] }))}
          >
            {followed[s.author] ? (
              <><i className="fa-solid fa-check" /> Gefolgt</>
            ) : (
              'Follow'
            )}
          </button>
        </div>
        <div className="short-title">{s.title}</div>
      </div>
    </>
  )

  const current = slide ? DEMO_SHORTS[slide.to] : short

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
        <div className="shorts-stack">
          {slide && (
            <div className={`short-player is-out slide-out-${slide.dir}`} aria-hidden="true">
              {renderCard(DEMO_SHORTS[slide.from])}
            </div>
          )}
          <div
            key={slide ? `in-${slide.to}` : current.id}
            className={`short-player${slide ? ` slide-in-${slide.dir}` : ''}`}
            style={dragStyle}
          >
            {renderCard(current)}
          </div>
        </div>

        {/* Up / Down Navigation */}
        <div className="short-nav">
          <button type="button" className="iconbtn" aria-label="Vorheriger Short" onClick={prev} disabled={idx === 0}>
            <i className="fa-solid fa-arrow-up" />
          </button>
          <button
            type="button"
            className="iconbtn"
            aria-label="Nächster Short"
            onClick={next}
            disabled={idx === DEMO_SHORTS.length - 1}
          >
            <i className="fa-solid fa-arrow-down" />
          </button>
        </div>
      </div>
      </div>

      {/* Kommentare-Menü */}
      {commentsOpen && (
        <div className="sheet-backdrop" onClick={closeComments}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Kommentare" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Kommentare <span className="sheet-count">{short.comments}</span></strong>
            </div>
            <div className="sheet-body">
              {allComments.map((c) => (
                <div className="comment" key={c.id}>
                  <span className="comment-ava" aria-hidden="true">
                    <i className="fa-solid fa-circle-user" />
                  </span>
                  <div className="comment-main">
                    <div className="comment-head">@{c.author} <small>{c.time}</small></div>
                    <p className="comment-text">{c.text}</p>
                    <div className="comment-actions">
                      <button
                        type="button"
                        className={`comment-btn${likedComments[c.id] ? ' active' : ''}`}
                        aria-pressed={!!likedComments[c.id]}
                        onClick={() => toggleCommentLike(c.id)}
                      >
                        <i className={`${likedComments[c.id] ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {commentLikes(c)}
                      </button>
                      <button type="button" className="comment-btn" onClick={() => setReplyTo(c.id)}>
                        <i className="fa-solid fa-reply" /> Antworten
                      </button>
                    </div>
                    {repliesOf(c).length > 0 && (
                      <div className="replies">
                        {repliesOf(c).map((r) => (
                          <div className="comment" key={r.id}>
                            <span className="comment-ava" aria-hidden="true">
                              <i className="fa-solid fa-circle-user" />
                            </span>
                            <div className="comment-main">
                              <div className="comment-head">@{r.author} <small>{r.time}</small></div>
                              <p className="comment-text">{r.text}</p>
                              <div className="comment-actions">
                                <button
                                  type="button"
                                  className={`comment-btn${likedComments[r.id] ? ' active' : ''}`}
                                  aria-pressed={!!likedComments[r.id]}
                                  onClick={() => toggleCommentLike(r.id)}
                                >
                                  <i className={`${likedComments[r.id] ? 'fa-solid' : 'fa-regular'} fa-heart`} /> {commentLikes(r)}
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
                <span>Antwort an <strong>@{nameOf(replyTo)}</strong></span>
                <button type="button" className="comment-btn" onClick={() => setReplyTo(null)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}
            <form className="comment-inputrow" onSubmit={submitComment}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={replyTo ? `Antworten an @${nameOf(replyTo)} …` : 'Kommentieren …'}
                aria-label={replyTo ? 'Antwort schreiben' : 'Kommentar schreiben'}
                maxLength={280}
              />
              <button type="submit" className="btn btn-brand btn-sm" disabled={!draft.trim()} aria-label="Absenden">
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={closeComments}>Abbrechen</button>
              <button type="button" className="btn btn-brand" onClick={closeComments}>Fertig</button>
            </div>
          </div>
        </div>
      )}

      {/* Teilen-Menü */}
      {shareOpen && (
        <div className="sheet-backdrop" onClick={() => setShareOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Teilen" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <strong className="sheet-title">Teilen</strong>
            </div>
            <div className="sheet-body">
              <p className="sheet-sub">@{short.author} · {short.title}</p>
              <div className="sheet-url">
                <span className="sheet-urltext">{shareUrl}</span>
                <button type="button" className="btn btn-brand btn-sm" onClick={copyShareUrl}>
                  <i className="fa-solid fa-copy" /> Kopieren
                </button>
              </div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setShareOpen(false)}>Abbrechen</button>
              <button type="button" className="btn btn-brand" onClick={() => setShareOpen(false)}>Fertig</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
