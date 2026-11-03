// Pagewright demo's own feedback relay: the site's feedback form -> a private
// Telegram channel. A Cloudflare Worker, deployed on its own.
//
// NOT part of the editor or the site, and never imported by them. The site
// only knows an address (global.json -> feedback.endpoint) and the payload
// below; a real client's site points that address at its own API instead.
//
// Payload (POST, JSON):
//   { kind: 'message' | 'call-request' | ..., locale: 'uk', page: '/site/...',
//     fields: { name?, phone?, email?, date?, rating?, message? },
//     website?: ''  <- a hidden field people never fill; bots do }
// Answer: { ok: true } or { ok: false, error: '...' }.
//
// Settings (Cloudflare dashboard -> the worker -> Settings -> Variables):
//   TELEGRAM_BOT_TOKEN  secret - the bot's token from @BotFather
//   TELEGRAM_CHAT_ID    secret - the private channel's id (-100...)
//   ALLOWED_ORIGINS     plain  - comma-separated sites allowed to post (wrangler.toml)

const MAX_BODY = 8 * 1024
const LIMITS = { name: 100, phone: 40, email: 120, date: 40, message: 3000 }
const LABELS = { name: '👤', phone: '📞', email: '✉️', date: '📅' }

// A few messages a minute per address. Best effort: it lives in one worker
// instance's memory, which is enough to stop a script hammering one form.
const WINDOW_MS = 60_000
const PER_WINDOW = 5
const recent = new Map()

function tooMany (ip) {
  const now = Date.now()
  const times = (recent.get(ip) || []).filter(time => now - time < WINDOW_MS)
  times.push(now)
  recent.set(ip, times)
  if (recent.size > 5000) {
    recent.clear()
  }
  return times.length > PER_WINDOW
}

function reply (body, status, headers) {
  return Response.json(body, { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function clip (value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function escape (text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function telegramText (body, fields) {
  const lines = [`📨 <b>${escape(clip(body.kind, 40) || 'message')}</b>`]
  for (const [key, icon] of Object.entries(LABELS)) {
    if (fields[key]) {
      lines.push(`${icon} ${escape(fields[key])}`)
    }
  }
  const rating = Number(body.fields?.rating)
  if (rating >= 1 && rating <= 5) {
    lines.push('⭐'.repeat(Math.round(rating)))
  }
  if (fields.message) {
    lines.push('', escape(fields.message))
  }
  const where = [clip(body.page, 200), clip(body.locale, 5)].filter(Boolean).join(' · ')
  if (where) {
    lines.push('', `🌐 ${escape(where)}`)
  }
  return lines.join('\n')
}

export default {
  async fetch (request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean)
    const known = allowed.includes(origin)
    const cors = known ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: known ? 204 : 403,
        headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' },
      })
    }
    if (request.method !== 'POST') {
      return reply({ ok: false, error: 'method' }, 405, cors)
    }
    if (!known) {
      return reply({ ok: false, error: 'origin' }, 403, cors)
    }
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return reply({ ok: false, error: 'not-configured' }, 503, cors)
    }
    if (tooMany(request.headers.get('CF-Connecting-IP') || 'unknown')) {
      return reply({ ok: false, error: 'too-many' }, 429, cors)
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY) {
      return reply({ ok: false, error: 'too-large' }, 413, cors)
    }
    let body
    try {
      body = JSON.parse(raw)
    } catch {
      return reply({ ok: false, error: 'json' }, 400, cors)
    }
    // A bot filled the field no person sees: say "sent" and drop it.
    if (body.website) {
      return reply({ ok: true }, 200, cors)
    }

    const fields = Object.fromEntries(Object.entries(LIMITS).map(([key, max]) => [key, clip(body.fields?.[key], max)]))
    const phoneDigits = (fields.phone.match(/\d/g) || []).length
    if (phoneDigits < 7) {
      fields.phone = ''
    }
    if (!fields.message && !fields.phone && !fields.email) {
      return reply({ ok: false, error: 'empty' }, 400, cors)
    }

    const sent = await fetch(`https://api.telegram.org/bot${String(env.TELEGRAM_BOT_TOKEN).trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(env.TELEGRAM_CHAT_ID).trim(), text: telegramText(body, fields), parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!sent.ok) {
      // Telegram's own reason ("chat not found", "Unauthorized", "bot is not
      // a member...") - no token or message text in it, and it is what tells
      // a misconfigured channel from a wrong token. Also in the worker's logs.
      const reason = await sent.json().then(answer => answer?.description || '').catch(() => '')
      console.error('telegram:', sent.status, reason)
      return reply({ ok: false, error: 'telegram', detail: reason }, 502, cors)
    }
    return reply({ ok: true }, 200, cors)
  },
}
