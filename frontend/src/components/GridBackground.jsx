import { useEffect, useRef } from 'react'

// Gitter-Hintergrund: weißes Gitter auf komplett schwarzem Grund.
// Liegt fixiert hinter allem (kein Setup nötig, Wrapper bleiben transparent).
const CFG = {
  cell: 48,
  cellMobile: 36,
  minAlpha: 0.07,
  maxAlpha: 0.6,
  fade: true,
  calmCenter: true,
  calmWidth: 480,
  seed: 7,
}

function rng(s) {
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function GridBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return undefined
    const ctx = cv.getContext('2d')
    let W = 0
    let H = 0
    let blobs = []
    let timer = null

    const strength = (x, y) => {
      if (!CFG.fade) return 1
      let w = 0
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i]
        const dx = x - b.x
        const dy = y - b.y
        w += Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s))
      }
      let k = 1
      if (CFG.calmCenter) {
        k = W > 700 ? 1 - 0.6 * Math.exp(-(((x - W / 2) / (CFG.calmWidth / 2)) ** 2)) : 0.7
      }
      return Math.min(1, w) * k
    }

    const alpha = (x, y) => CFG.minAlpha + (CFG.maxAlpha - CFG.minAlpha) * strength(x, y)

    const draw = () => {
      const s = W < 600 ? CFG.cellMobile : CFG.cell
      const ox = (W % s) / 2
      const oy = (H % s) / 2
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)
      ctx.lineWidth = 1
      for (let x = ox; x <= W + s; x += s) {
        for (let y = oy; y <= H + s; y += s) {
          ctx.strokeStyle = `rgba(255,255,255,${alpha(x, y + s / 2).toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(x + 0.5, y)
          ctx.lineTo(x + 0.5, y + s)
          ctx.stroke()
          ctx.strokeStyle = `rgba(255,255,255,${alpha(x + s / 2, y).toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(x, y + 0.5)
          ctx.lineTo(x + s, y + 0.5)
          ctx.stroke()
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha(x, y) + 0.15).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(x + 0.5, y + 0.5, 1.5, 0, 6.283)
          ctx.fill()
        }
      }
    }

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = rng(CFG.seed)
      const big = Math.max(window.innerWidth, window.innerHeight)
      W = window.innerWidth
      H = window.innerHeight
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      blobs = []
      for (let i = 0; i < 4; i++) blobs.push({ x: r() * W, y: r() * H, s: big * (0.17 + r() * 0.1) })
      draw()
    }

    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(setup, 120)
    }

    window.addEventListener('resize', onResize)
    setup()
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timer)
    }
  }, [])

  return <canvas id="gitter-bg" ref={ref} aria-hidden="true" />
}
