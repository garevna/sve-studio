// «Хвиля» on the edge of a picture or a card: at rest its outline is the
// usual one; under the pointer (or the keyboard's focus) one of its edges
// starts to move as a wave - and settles back to a straight line when the
// pointer leaves.
//
// Which element and which edge is said by CSS: an element whose own
// `--wave-edge` is top / right / bottom / left (registered as
// non-inherited in content/styles/site-styles.css, so its children do not
// answer for it). The stylesheets give it to the pictures when the
// site's pictures wear «Хвиля» (bottom by default, the site's
// `siteStyleWaveEdge`, or a picture's own wave-edge-<side> class) and to
// the cards of a «Хвиля» card style (its edge set in the UI Kit).
//
// The wave is a clip-path cut into that edge, worked out every frame. Not a
// regular sine: three waves of different lengths and speeds, the longest
// with a steep front and a gentle back, so its crests never repeat
// themselves. It fades out towards both corners, so the edge still meets
// the rounded corners where they are. An element with a border on that
// side gets a line drawn along the wave in the border's colour - it is the
// outline itself that bends, not just the fill.
//
// Someone who asked their system for less motion sees the edge waved but
// still while the pointer is on it.
//
// NOTE: src/utils/wave-edge.ts and site/src/utils/wave-edge.ts are
// identical - keep them so.

export const WAVE_EDGES = ['bottom', 'top', 'left', 'right'] as const
export type WaveEdge = typeof WAVE_EDGES[number]

const SVG_NS = 'http://www.w3.org/2000/svg'
// how far, in px, the wave cuts into the edge at most
const MAX_DEPTH = 18
// the distance between two points of the wave along the edge, px
const STEP = 6
// how far up from the pointed-at element a waving one is looked for
const SEARCH_DEPTH = 10

type Wave = {
  el: HTMLElement
  edge: WaveEdge
  amp: number // 0 straight .. 1 full wave
  goal: number
  time: number
  seed: number
  line: SVGSVGElement | null
  madeRelative: boolean
}

const waves = new Map<HTMLElement, Wave>()
let frame = 0
let last = 0
let started = false

function still (): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function edgeOf (el: Element): WaveEdge | null {
  const value = getComputedStyle(el).getPropertyValue('--wave-edge').trim()
  return (WAVE_EDGES as readonly string[]).includes(value) ? value as WaveEdge : null
}

function waving (node: EventTarget | null): HTMLElement | null {
  let el = node instanceof Element ? node : null
  for (let depth = 0; el && el !== document.body && depth < SEARCH_DEPTH; depth++) {
    if (el instanceof HTMLElement && edgeOf(el)) {
      return el
    }
    el = el.parentElement
  }
  return null
}

function smooth (x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

// 0 (on the edge) .. 1 (deepest), along the edge at u of its length.
function shape (u: number, length: number, time: number, seed: number): number {
  const long = Math.min(260, Math.max(90, length / 2.3))
  const a = 2 * Math.PI * u / long - 2.1 * time + seed
  const b = 2 * Math.PI * u / (long * 0.57) + 1.3 * time + seed * 1.7
  const c = 2 * Math.PI * u / (long * 0.31) - 3.4 * time + seed * 0.6
  // sin(a + 0.6 sin a): a crest steeper in front than behind
  const sum = 0.55 * Math.sin(a + 0.6 * Math.sin(a)) + 0.3 * Math.sin(b) + 0.15 * Math.sin(c)
  return 0.5 + 0.5 * sum
}

function radiusOf (style: CSSStyleDeclaration, edge: WaveEdge): number {
  const corner = {
    bottom: style.borderBottomLeftRadius,
    top: style.borderTopLeftRadius,
    left: style.borderTopLeftRadius,
    right: style.borderTopRightRadius,
  }[edge]
  return Number.parseFloat(corner) || 0
}

function draw (wave: Wave) {
  const { el, edge } = wave
  const width = el.offsetWidth
  const height = el.offsetHeight
  if (!width || !height) {
    return
  }
  const style = getComputedStyle(el)
  const across = edge === 'bottom' || edge === 'top'
  const length = across ? width : height
  const depth = Math.min(MAX_DEPTH, Math.max(6, 0.08 * Math.min(width, height))) * wave.amp
  const fade = Math.max(radiusOf(style, edge) + 6, length * 0.08)

  const line: [number, number][] = []
  const count = Math.max(2, Math.ceil(length / STEP))
  for (let i = 0; i <= count; i++) {
    const u = length * i / count
    const d = depth * smooth(u / fade) * smooth((length - u) / fade) * shape(u, length, wave.time, wave.seed)
    const point: [number, number] = {
      bottom: [u, height - d],
      top: [u, d],
      left: [d, u],
      right: [width - d, u],
    }[edge] as [number, number]
    line.push(point)
  }

  const corners: [number, number][] = {
    bottom: [[width, 0], [0, 0]],
    top: [[width, height], [0, height]],
    left: [[width, height], [width, 0]],
    right: [[0, height], [0, 0]],
  }[edge] as [number, number][]
  const px = ([x, y]: [number, number]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`
  el.style.clipPath = `polygon(${[...line, ...corners].map(point => px(point)).join(', ')})`

  drawLine(wave, style, line)
}

// The border of the waving side, bent along the wave. Drawn twice as wide
// as the border: the clip-path takes the outer half away.
function drawLine (wave: Wave, style: CSSStyleDeclaration, line: [number, number][]) {
  const side = { bottom: 'Bottom', top: 'Top', left: 'Left', right: 'Right' }[wave.edge] as 'Bottom'
  const width = Number.parseFloat(style[`border${side}Width`]) || 0
  if (!width || style[`border${side}Style`] === 'none') {
    return
  }
  if (!wave.line) {
    if (style.position === 'static') {
      wave.el.style.position = 'relative'
      wave.madeRelative = true
    }
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('class', 'wave-edge-line')
    svg.style.cssText = `position:absolute;left:-${style.borderLeftWidth};top:-${style.borderTopWidth};width:${wave.el.offsetWidth}px;height:${wave.el.offsetHeight}px;overflow:visible;pointer-events:none;z-index:1`
    const path = document.createElementNS(SVG_NS, 'polyline')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-linejoin', 'round')
    svg.append(path)
    wave.el.append(svg)
    wave.line = svg
  }
  const path = wave.line.firstElementChild as SVGPolylineElement
  path.setAttribute('stroke', style[`border${side}Color`])
  path.setAttribute('stroke-width', String(width * 2))
  path.setAttribute('points', line.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '))
}

function settle (wave: Wave) {
  wave.el.style.clipPath = ''
  wave.line?.remove()
  if (wave.madeRelative) {
    wave.el.style.position = ''
  }
  waves.delete(wave.el)
}

function tick (now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const calm = still()
  for (const wave of waves.values()) {
    wave.amp = calm ? wave.goal : wave.amp + (wave.goal - wave.amp) * Math.min(1, dt * 4)
    if (!calm) {
      wave.time += dt
    }
    if (wave.goal === 0 && wave.amp < 0.01) {
      settle(wave)
      continue
    }
    draw(wave)
  }
  // Still motion: drawn once, nothing moves until the pointer leaves.
  frame = waves.size > 0 && !calm ? requestAnimationFrame(tick) : 0
}

function run () {
  if (!frame) {
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }
}

function enter (el: HTMLElement) {
  const edge = edgeOf(el)
  if (!edge) {
    return
  }
  const wave = waves.get(el) ?? { el, edge, amp: 0, goal: 1, time: 0, seed: Math.random() * 6.28, line: null, madeRelative: false }
  wave.edge = edge
  wave.goal = 1
  waves.set(el, wave)
  run()
}

// What the pointer and the keyboard's focus are on - each may be waving.
let hovered: HTMLElement | null = null
let focused: HTMLElement | null = null
let moved: PointerEvent | null = null

// An element that lets the pointer through to the look of what lies under
// it: the editor's shield over a block not being edited
// (PageBlockFrame.vue) - it catches the click that picks the block, but the
// block should still answer the pointer as on the site.
const SEE_THROUGH = '[data-wave-through]'

function under (event: PointerEvent): HTMLElement | null {
  const own = waving(event.target)
  if (own || !(event.target instanceof Element) || !event.target.closest(SEE_THROUGH)) {
    return own
  }
  const below = document.elementsFromPoint(event.clientX, event.clientY).find(el => !el.closest(SEE_THROUGH))
  return below ? waving(below) : null
}

// The waves follow: the one pointed at and the focused one rise, the
// others settle.
function aim () {
  for (const wave of waves.values()) {
    if (wave.el !== hovered && wave.el !== focused) {
      wave.goal = 0
    }
  }
  for (const el of [hovered, focused]) {
    if (el) {
      enter(el)
    }
  }
  run()
}

function point (event: PointerEvent) {
  // looked at once a frame, however fast the pointer moves
  const first = !moved
  moved = event
  if (first) {
    requestAnimationFrame(() => {
      const next = moved ? under(moved) : null
      moved = null
      if (next !== hovered) {
        hovered = next
        aim()
      }
    })
  }
}

// Once per page: the site's App and the editor's plugin call it.
export function startWaveEdges () {
  if (started || typeof document === 'undefined') {
    return
  }
  started = true
  document.addEventListener('pointerover', point, { passive: true })
  document.addEventListener('pointermove', point, { passive: true })
  // out of the window (or a finger lifted)
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) {
      moved = null
      hovered = null
      aim()
    }
  }, { passive: true })
  document.addEventListener('focusin', event => {
    focused = waving(event.target)
    aim()
  })
  document.addEventListener('focusout', event => {
    focused = waving(event.relatedTarget)
    aim()
  })
}
