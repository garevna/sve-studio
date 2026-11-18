import { defineEventHandler, getRequestHeader, sendRedirect } from 'h3'

// Dev only. The site is meant to be seen through the editor (<editor>/site/,
// modules/site-app.ts): on the editor's origin it shares the browser
// database that holds the drafts, and the editor's server hands it the
// content files. Opened on its own port it has neither - the start of the
// app fails on a file that comes back as a page. So a page address opened
// here directly is sent over to the same address on the editor; what the
// editor's proxy brings (x-sve-editor) and every file stay as they are.
export default defineEventHandler(event => {
  const editor = process.env.SVE_EDITOR_ORIGIN
  if (!import.meta.dev || !editor || getRequestHeader(event, 'x-sve-editor')) {
    return
  }
  if (event.method !== 'GET' || !getRequestHeader(event, 'accept')?.includes('text/html')) {
    return
  }
  // the address as asked, with the site's base (/site/) - event.path has it
  // cut off
  const asked = event.node.req.originalUrl || event.node.req.url || event.path
  return sendRedirect(event, `${editor}${asked}`, 302)
})
