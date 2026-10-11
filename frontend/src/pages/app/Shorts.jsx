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
  const [dir, setDir] = useState('down') // Slide-Richtung beim Wechseln
  const stageRef = useRef(null)
  const touchY = useRef(null)
  const wheelCool = useRef(0)

  const short = DEMO_SHORTS[idx]
  const demo = (msg) => showToast(msg || 'Das ist nur ein Beispiel.')

  const prev = useCallback(() => {
    setDir('up')
    setIdx((i) => Math.max(0, i - 1))
  }, [])
  const next = useCallback(() => {
    setDir('down')
    setIdx((i) => Math.min(DEMO_SHORTS.length - 1, i + 1))
  }, [])

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

  return (
    <div className="app-page shorts-page">
      <div className="shorts-center">
      <div
        className="shorts-stage"
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="short-player">
          <div key={short.id} className={`short-anim${dir === 'down' ? ' from-bottom' : ' from-top'}`}>
          {/* Platzhalter statt Video */}
          <div className="short-screen">
            <i className={`fa-solid ${short.icon} ${short.color}`} />
            <small>{short.title}</small>
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
              aria-pressed={!!liked[short.id]}
              onClick={() => setLiked((s) => ({ ...s, [short.id]: !s[short.id] }))}
            >
              <i className={`${liked[short.id] ? 'fa-solid liked' : 'fa-regular'} fa-heart`} />
            </button>
            <span className="rail-count">{short.likes}</span>
            <button type="button" className="rail-btn" aria-label="Kommentare" onClick={() => demo('Kommentare kommen später (Beispiel).')}>
              <i className="fa-regular fa-comment" />
            </button>
            <span className="rail-count">{short.comments}</span>
            <button type="button" className="rail-btn" aria-label="Teilen" onClick={() => demo('Link kopiert (Beispiel).')}>
              <i className="fa-solid fa-share" />
            </button>
            <span className="rail-count">Teilen</span>
          </div>

          {/* Info unten links */}
          <div className="short-info">
            <div className="short-userrow">
              <Link to={`/u/${short.author}`} className="short-avatar" aria-label={`Profil von ${short.author}`}>
                <i className="fa-solid fa-circle-user" />
              </Link>
              <span className="short-author">@{short.author}</span>
              <button
                type="button"
                className={`btn btn-sm ${followed[short.author] ? 'btn-ghost' : 'btn-brand'} follow-btn`}
                onClick={() => setFollowed((s) => ({ ...s, [short.author]: !s[short.author] }))}
              >
                {followed[short.author] ? (
                  <><i className="fa-solid fa-check" /> Gefolgt</>
                ) : (
                  'Follow'
                )}
              </button>
            </div>
            <div className="short-title">{short.title}</div>
          </div>
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
