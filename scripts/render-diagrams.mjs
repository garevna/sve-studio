// Draws the architecture schemes (docs/architecture/<scheme>.<locale>.mmd,
// Mermaid text, one file per language: uk, en, de) into SVG files the editor
// shows in "Як це влаштовано" (src/views/ArchitectureView.vue), in the
// editor's interface language. Run it after changing a scheme:
//
//   pnpm diagrams
//
// The text is the source; the SVGs are its output and are committed, so the
// editor needs no diagram library and no request anywhere.
//
// How: a headless Chrome draws each scheme with Mermaid (pinned, from
// jsDelivr - only this script fetches it, on the developer's machine), in
// marker colours that are then swapped for the editor's own colour variables
// (--sve-*), so a scheme follows the editor's look, light or dark. A colour
// left over that is not a marker is reported - it would not follow the look.
//
// Chrome: CHROME_PATH, else the usual place on Windows / macOS / Linux.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SOURCE = join(ROOT, 'docs', 'architecture')
const OUT = join(ROOT, 'src', 'assets', 'architecture')
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs'

// marker -> the editor's variable
const MARKERS = {
  '#0a0a01': 'var(--sve-surface)',
  '#0a0a02': 'var(--sve-surface-muted)',
  '#0a0a03': 'var(--sve-border-strong)',
  '#0a0a04': 'var(--sve-border)',
  '#0a0a05': 'var(--sve-text)',
  '#0a0a06': 'var(--sve-text-muted)',
  '#0a0a07': 'var(--sve-primary)',
  '#0a0a08': 'var(--sve-primary-soft)',
  '#0a0a09': 'transparent',
  // a marker Mermaid wrote as rgba
  'rgba\\(10, 10, 1, 0\\.5\\)': 'var(--sve-surface)',
  // Mermaid's own fixed colours, which no theme variable reaches
  '#eaeaea': 'var(--sve-surface)',
  '#666\\b': 'var(--sve-border-strong)',
  '#999\\b': 'var(--sve-border)',
  '#EDF2AE': 'var(--sve-primary-soft)',
  '#000000': 'var(--sve-text-muted)',
  '#000\\b': 'var(--sve-text)',
  '#f5f5f6': 'var(--sve-text-muted)',
  '#f5f5f5': 'var(--sve-surface)',
  '#e0e0e0': 'var(--sve-surface-muted)',
}
const M = Object.fromEntries(Object.entries({
  surface: '#0a0a01', muted: '#0a0a02', border: '#0a0a03', borderSoft: '#0a0a04', text: '#0a0a05', textMuted: '#0a0a06', primary: '#0a0a07', primarySoft: '#0a0a08', none: '#0a0a09',
}))

const THEME = {
  theme: 'base',
  themeVariables: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    background: M.none,
    primaryColor: M.surface,
    primaryTextColor: M.text,
    primaryBorderColor: M.border,
    secondaryColor: M.muted,
    secondaryTextColor: M.text,
    secondaryBorderColor: M.borderSoft,
    tertiaryColor: M.muted,
    tertiaryTextColor: M.text,
    tertiaryBorderColor: M.borderSoft,
    mainBkg: M.surface,
    textColor: M.text,
    nodeTextColor: M.text,
    titleColor: M.text,
    lineColor: M.textMuted,
    clusterBkg: M.muted,
    clusterBorder: M.borderSoft,
    edgeLabelBackground: M.surface,
    noteBkgColor: M.primarySoft,
    noteTextColor: M.text,
    noteBorderColor: M.primary,
    actorBkg: M.surface,
    actorBorder: M.border,
    actorTextColor: M.text,
    actorLineColor: M.borderSoft,
    signalColor: M.textMuted,
    signalTextColor: M.text,
    labelBoxBkgColor: M.primarySoft,
    labelBoxBorderColor: M.primary,
    labelTextColor: M.text,
    loopTextColor: M.text,
    activationBkgColor: M.muted,
    activationBorderColor: M.border,
    sequenceNumberColor: M.surface,
    attributeBackgroundColorOdd: M.surface,
    attributeBackgroundColorEven: M.muted,
    stateBkg: M.surface,
    stateLabelColor: M.text,
    transitionColor: M.textMuted,
    transitionLabelColor: M.text,
    compositeBackground: M.muted,
    compositeTitleBackground: M.muted,
    altBackground: M.muted,
    innerEndBackground: M.text,
    specialStateColor: M.text,
    labelBackgroundColor: M.surface,
    errorBkgColor: M.primarySoft,
    errorTextColor: M.text,
  },
  // SVG text, not HTML inside the SVG: the editor's own CSS (line height,
  // <small>) reached HTML labels and clipped their second line.
  htmlLabels: false,
  flowchart: { htmlLabels: false, curve: 'basis' },
  securityLevel: 'loose',
}

function chromePath () {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH
  }
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  const found = candidates.find(path => existsSync(path))
  if (!found) {
    throw new Error('Chrome not found - set CHROME_PATH')
  }
  return found
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function main () {
  const sources = readdirSync(SOURCE).filter(name => name.endsWith('.mmd'))
  const port = 9400 + Math.floor(Math.random() * 400)
  const profile = mkdtempSync(join(tmpdir(), 'diagrams-'))
  const chrome = spawn(chromePath(), ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
  try {
    let target
    for (let i = 0; i < 60 && !target; i++) {
      await sleep(250)
      try {
        target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === 'page')
      } catch {
        // not listening yet
      }
    }
    if (!target) {
      throw new Error('Chrome did not start')
    }
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise(resolve => ws.addEventListener('open', resolve))
    let id = 0
    const waiting = new Map()
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id && waiting.has(message.id)) {
        waiting.get(message.id)(message)
        waiting.delete(message.id)
      }
    })
    const send = (method, params = {}) => new Promise(resolve => {
      const next = ++id
      waiting.set(next, resolve)
      ws.send(JSON.stringify({ id: next, method, params }))
    })
    const evaluate = async expression => {
      const answer = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (answer.result?.exceptionDetails) {
        throw new Error(answer.result.exceptionDetails.exception?.description || answer.result.exceptionDetails.text)
      }
      return answer.result?.result?.value
    }

    await evaluate(`(async () => {
      const { default: mermaid } = await import(${JSON.stringify(MERMAID)})
      mermaid.initialize(${JSON.stringify({ startOnLoad: false, ...THEME })})
      window.__mermaid = mermaid
      return 'ready'
    })()`)

    mkdirSync(OUT, { recursive: true })
    for (const name of sources) {
      const text = readFileSync(join(SOURCE, name), 'utf8')
      // containers.en.mmd -> containers.en.svg, drawn under the id
      // arch-containers-en (a dot would break the SVG's own CSS selectors)
      const key = name.replace(/\.mmd$/, '')
      let svg = await evaluate(`(async () => (await window.__mermaid.render(${JSON.stringify(`arch-${key.replaceAll('.', '-')}`)}, ${JSON.stringify(text)})).svg)()`)
      // Its own size, not the column's: a scheme shrunk to fit has words too
      // small to read; the editor scrolls it sideways instead.
      svg = svg.replace(/<svg\b[^>]*>/, root => {
        const natural = root.match(/max-width:\s*([\d.]+)px/)?.[1]
        return natural ? root.replace(/\swidth="100%"/, ` width="${Math.ceil(Number(natural))}"`).replace(/\sstyle="max-width:\s*[\d.]+px;?"/, '') : root
      })
      for (const [marker, variable] of Object.entries(MARKERS)) {
        svg = svg.replaceAll(new RegExp(marker, 'gi'), variable)
      }
      // (black shadows are the actor menu's, which these schemes never open)
      const left = [...new Set(svg.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi))]
        .filter(colour => !/^rgba?\(0[, ]+0[, ]+0\b/.test(colour))
      writeFileSync(join(OUT, `${key}.svg`), svg)
      console.log(`${key}.svg${left.length > 0 ? `  - colours that will not follow the look: ${left.join(', ')}` : ''}`)
    }
    ws.close()
  } finally {
    chrome.kill()
    await sleep(300)
    try {
      rmSync(profile, { recursive: true, force: true })
    } catch {
      // Chrome may still hold the folder; the system's temp cleans it up
    }
  }
}

await main()
