// The demo used to live on pagewright.pp.ua (at the root, then at /demo/),
// and browsers kept its content API worker registered there. The demo is
// dock.pagewright.pp.ua now (with a worker of its own); pagewright.pp.ua is
// Pagewright's own site, which needs none. A browser that still has the old
// one fetches this file on its next update check (worker.js answers both
// addresses with it): it lets itself go.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil(self.registration.unregister())
})
