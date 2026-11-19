// While the whole site wears «Неон», its SVG pictures are asked for at
// night: "#night" on their address. An illustration with a light ground
// of its own (content/images/**.svg) carries a tiny rule for that - its
// ground hidden, its big soft disc dimmed (`#night:target ~ .pw-bg`) - so
// it stands on the dark page instead of a light slab. A picture without
// the rule simply ignores the "#night".
//
// A page's <img> is set and reset by its component, so this watches: every
// <img> that gets an SVG address, and <html>'s classes (the style switched
// in the editor).
//
// NOTE: src/utils/night-svgs.ts and site/src/utils/night-svgs.ts are
// identical - keep them so.

const NIGHT = '#night'
// an SVG's address, with its ?v= but no fragment yet
const SVG = /\.svg(?:\?[^#]*)?$/i

let started = false

function night (): boolean {
  return document.documentElement.classList.contains('site-style-neon')
}

function fix (img: HTMLImageElement, dark: boolean) {
  const src = img.getAttribute('src')
  if (!src) {
    return
  }
  if (dark && SVG.test(src)) {
    img.setAttribute('src', src + NIGHT)
  } else if (!dark && src.endsWith(NIGHT)) {
    img.setAttribute('src', src.slice(0, -NIGHT.length))
  }
}

function fixAll (root: ParentNode, dark = night()) {
  for (const img of root.querySelectorAll('img')) {
    fix(img, dark)
  }
}

// Once per page: the site's App and the editor's plugin call it.
export function startNightSvgs () {
  if (started || typeof document === 'undefined') {
    return
  }
  started = true
  fixAll(document)
  new MutationObserver(() => fixAll(document)).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  new MutationObserver(records => {
    const dark = night()
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLImageElement) {
        fix(record.target, dark)
      }
      for (const node of record.addedNodes) {
        if (node instanceof HTMLImageElement) {
          fix(node, dark)
        } else if (node instanceof Element) {
          fixAll(node, dark)
        }
      }
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] })
}
