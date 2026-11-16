// The demo's ship on an address of its own (demo.pagewright.pp.ua) and the
// Верф on another (dock.pagewright.pp.ua): the ship shows what the visitor
// built, which lives in the browser's database of the dock's address only.
// The ship reads it through a bridge (db/bridge.ts): a hidden frame of the
// dock's own site answering the ship's requests from the dock's database.
//
//   VITE_DOCK_ORIGIN - set in the ship's build: the dock it reads from;
//   VITE_SHIP_ORIGIN - set in the dock's build: the only ship its bridge
//                      answers.
// Neither is set in development or on GitHub Pages: there the ship is the
// dock's own <root>site/ and reads the database directly.
declare global {
  interface ImportMetaEnv {
    readonly VITE_DOCK_ORIGIN?: string
    readonly VITE_SHIP_ORIGIN?: string
  }
}

export const DOCK_ORIGIN = import.meta.env.VITE_DOCK_ORIGIN || ''
export const SHIP_ORIGIN = import.meta.env.VITE_SHIP_ORIGIN || ''

// This page is the bridge: the dock's site opened by a ship, in a frame.
export function isBridgePage (): boolean {
  return !!SHIP_ORIGIN && typeof location !== 'undefined' && new URLSearchParams(location.search).has('sve-bridge')
}
