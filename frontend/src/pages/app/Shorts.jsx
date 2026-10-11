import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_SHORTS } from './demoData.js'

// Shorts-Viewer wie auf YouTube: Hochkant-Player, Overlays, Action-Rail,
// Follow-Button, Up/Down-Navigation. Alles Beispiel, kein echtes Video.
export default function Shorts({ showToast }) {
  const [idx, setIdx] = useState(0) // man startet ganz oben
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [liked, setLiked] = useState({})
  const [followed, setFollowed] = useState({})
  const [slide, setSlide] = useState(null) // { from, to, dir } während der Wechsel-Animation
  const stageRef = useRef(null)
  const touchY = useRef(null)
  const wheelCool = useRef(0)
  const busyRef = useRef(false)
  const timerRef = useRef(null)

  const short = DEMO_SHORTS[idx]
  const demo = (msg) => showToast(msg || 'Das ist nur ein Beispiel.')

  useEffect(() => () => clearTimeout(timerRef.current), [])

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
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      busyRef.current = false
      setSlide(null)
    }, 400)
  }, [idx])
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

  // Touch: hoch wischen = nächster Short, runter wischen = vorheriger
  const onTouchStart = (e) => {
    touchY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchY.current == null) return
    const dy = e.changedTouches[0].clientY - touchY.current
    touchY.current = null
    if (Math.abs(dy) < 50) return
    if (dy < 0) next()
    else prev()
  }

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
        <button type="button" className="rail-btn" aria-label="Kommentare" onClick={() => demo('Kommentare kommen später (Beispiel).')}>
          <i className="fa-regular fa-comment" />
        </button>
        <span className="rail-count">{s.comments}</span>
        <button type="button" className="rail-btn" aria-label="Teilen" onClick={() => demo('Link kopiert (Beispiel).')}>
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
    </div>
  )
}
