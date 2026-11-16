// The demo used to live at the root of pagewright.pp.ua, and its content
// API worker was registered for the whole site. The demo is at /demo/ now
// (with a worker of its own there); the root is Pagewright's own site, which
// needs none. A browser that still has the old one fetches this file on its
// next update check: it lets itself go.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil(self.registration.unregister())
})
