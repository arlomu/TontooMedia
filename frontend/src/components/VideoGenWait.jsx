import { forwardRef, useImperativeHandle, useRef } from 'react'

// Wartebild für die KI-Generierung (1:1 aus TontooVideo, ohne Demo-Buttons).
// Läuft in einem iframe (gleiche Origin), Phasen steuert der Parent:
// ref.goTo('search'|'cut'|'music'), ref.finish().
const VideoGenWait = forwardRef(function VideoGenWait(_, ref) {
  const frameRef = useRef(null)

  const anim = () => {
    try {
      return frameRef.current?.contentWindow?.VideoGenAnim || null
    } catch {
      return null
    }
  }

  useImperativeHandle(ref, () => ({
    goTo: (p) => {
      try {
        anim()?.goTo(p)
      } catch {
        /* iframe noch nicht bereit */
      }
    },
    finish: () => {
      try {
        anim()?.finish()
      } catch {
        /* iframe noch nicht bereit */
      }
    },
  }), [])

  return (
    <iframe
      ref={frameRef}
      title="Video wird erstellt"
      src="/vga-wait.html"
      className="vga-frame"
      aria-label="Video-Generierung läuft"
    />
  )
})

export default VideoGenWait
