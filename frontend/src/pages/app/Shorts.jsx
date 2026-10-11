import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_SHORTS } from './demoData.js'

// Shorts-Viewer wie auf YouTube: Hochkant-Player, Overlays, Action-Rail,
// Follow-Button, Up/Down-Navigation. Alles Beispiel, kein echtes Video.
export default function Shorts({ showToast }) {
  const [idx, setIdx] = useState(0) // man startet ganz oben
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [cc, setCc] = useState(false)
  const [liked, setLiked] = useState({})
  const [followed, setFollowed] = useState({})
  const playerRef = useRef(null)

  const short = DEMO_SHORTS[idx]
  const demo = (msg) => showToast(msg || 'Das ist nur ein Beispiel.')

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIdx((i) => Math.min(DEMO_SHORTS.length - 1, i + 1)), [])

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

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await playerRef.current?.requestFullscreen()
      }
    } catch {
      demo('Vollbild geht hier nicht (Beispiel).')
    }
  }

  return (
    <div className="app-page">
      <div className="shorts-head">
        <div>
          <h2 className="app-title">Shorts</h2>
          <p className="app-sub nomargin">Beispiel-Player – keine echten Videos.</p>
        </div>
        <span className="pill">
          {idx + 1} / {DEMO_SHORTS.length} · Beispiel
        </span>
      </div>

      <div className="shorts-stage">
        <div className="short-player" ref={playerRef}>
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

          {/* Fortschritt: 1 Segment pro Short */}
          <div className="short-progress" aria-hidden="true">
            {DEMO_SHORTS.map((s, i) => (
              <span key={s.id} className={i < idx ? 'done' : i === idx ? 'now' : ''} />
            ))}
          </div>

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
            <div className="short-topgroup">
              <button type="button" className={`pillbtn${cc ? ' on' : ''}`} aria-label="Untertitel" aria-pressed={cc} onClick={() => setCc((v) => !v)}>
                <i className="fa-solid fa-closed-captioning" />
              </button>
              <button type="button" className="pillbtn" aria-label="Mehr Optionen" onClick={() => demo('Mehr Optionen kommen später (Beispiel).')}>
                <i className="fa-solid fa-ellipsis-vertical" />
              </button>
              <button type="button" className="pillbtn" aria-label="Vollbild" onClick={toggleFullscreen}>
                <i className="fa-solid fa-expand" />
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
            <button type="button" className="rail-btn" aria-label="Remixen" onClick={() => demo('Remix kommt später (Beispiel).')}>
              <i className="fa-solid fa-repeat" />
            </button>
            <span className="rail-count">{short.remixes}</span>
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
  )
}
