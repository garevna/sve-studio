import type { Ref } from 'vue'
import { onBeforeUnmount, watch } from 'vue'

// «Хвиля» (the site's style, configs/site-style.ts) for a panel that slides
// in - the phone's menu: its inner edge is a wave. The panel is clipped
// along a Bézier curve (clip-path), so the edge is the panel itself - its
// own fill, gradient or not, its own content - and the curve flows while
// the panel comes in, then settles into a calm wave. The motion is the one
// of the side menu in Iryna's js-lessons, redone for a Vue panel.
//
// `edge` is the side the wave is on: the panel's inner side ('left' for a
// panel at the right of the screen, 'right' for one at the left, 'top' for
// one at the bottom). The panel keeps WAVE_DEPTH px of room on that side.

export type WaveEdge = 'left' | 'right' | 'top'

export const WAVE_DEPTH = 52

const FLOW_MS = 1100

// The curve across the edge, in its own terms: `at` 0..1 along the edge,
// `depth` 0..1 into the panel (0 the outer line, 1 WAVE_DEPTH in).
interface Curve { start: number, c1: [number, number], c2: [number, number], end: number }

// The calm wave it settles into.
const CALM: Curve = { start: 0.9, c1: [0.3, 0], c2: [0.7, 1], end: 0.1 }

function flowing (t: number, phase: number): Curve {
  // a swing that dies away as the panel arrives
  const swing = (1 - t) ** 2
  const s = (shift: number) => Math.sin(t * Math.PI * 3 + phase + shift)
  const mix = (calm: number, shift: number) => Math.min(1, Math.max(0, calm + swing * 0.5 * s(shift)))
  return {
    start: mix(CALM.start, 0),
    c1: [CALM.c1[0] + swing * 0.15 * s(1), mix(CALM.c1[1], 2)],
    c2: [CALM.c2[0] - swing * 0.15 * s(3), mix(CALM.c2[1], 4)],
    end: mix(CALM.end, 5),
  }
}

// The panel's outline with the wave on `edge`, as a clip-path.
function clipPath (edge: WaveEdge, width: number, height: number, curve: Curve): string {
  const d = WAVE_DEPTH
  const n = (value: number) => Math.round(value * 10) / 10
  if (edge === 'top') {
    // along x, depth down from the top
    const y = (depth: number) => n(depth * d)
    const x = (at: number) => n(at * width)
    return `path("M 0 ${y(curve.start)} C ${x(curve.c1[0])} ${y(curve.c1[1])}, ${x(curve.c2[0])} ${y(curve.c2[1])}, ${width} ${y(curve.end)} L ${width} ${height} L 0 ${height} Z")`
  }
  // along y; depth to the right of the left edge, or to the left of the right one
  const x = (depth: number) => n(edge === 'left' ? depth * d : width - depth * d)
  const y = (at: number) => n(at * height)
  const far = edge === 'left' ? width : 0
  return `path("M ${x(curve.start)} 0 C ${x(curve.c1[1])} ${y(curve.c1[0])}, ${x(curve.c2[1])} ${y(curve.c2[0])}, ${x(curve.end)} ${height} L ${far} ${height} L ${far} 0 Z")`
}

export function useWaveEdge (panel: Ref<HTMLElement | null>, edge: () => WaveEdge | null) {
  let frame = 0
  let resizeObserver: ResizeObserver | null = null

  function draw (curve: Curve) {
    const element = panel.value
    const side = edge()
    if (!element || !side) {
      return
    }
    const { width, height } = element.getBoundingClientRect()
    element.style.clipPath = clipPath(side, width, height, curve)
  }

  function flow () {
    cancelAnimationFrame(frame)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(CALM)
      return
    }
    const phase = Math.random() * Math.PI * 2
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / FLOW_MS)
      draw(flowing(t, phase))
      if (t < 1) {
        frame = requestAnimationFrame(step)
      }
    }
    frame = requestAnimationFrame(step)
  }

  function stop () {
    cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  watch([panel, edge], ([element, side]) => {
    stop()
    if (!element) {
      return
    }
    if (!side) {
      element.style.clipPath = ''
      return
    }
    flow()
    resizeObserver = new ResizeObserver(() => draw(CALM))
    resizeObserver.observe(element)
  }, { flush: 'post' })

  onBeforeUnmount(stop)
}
