// Pagewright's AI assistant: a Cloudflare Worker in front of Workers AI.
// Deployed on its own, like the feedback relay beside it.
//
// NOT part of the editor or the site, and never imported by them. They know
// one address (global.json -> ai.endpoint) and the payload below. A client's
// site points that address at its own copy of this worker, with its own
// Cloudflare account, its own budget and its own key - so nobody's usage is
// ever billed to anybody else.
//
// The whole point of the thing is the ceiling. Workers AI gives an account a
// free allocation of Neurons per day; past it a free plan is blocked and a
// paid plan is charged. This worker stops BEFORE that: it counts what it
// spends, refuses when the day's budget is gone, and says when the budget
// comes back. A public demo cannot be turned into somebody's free GPU.
//
// POST /  (JSON)
//   { task:   'translate' | 'rewrite' | 'seo' | 'alt' | 'reply' | 'page',
//     text:   '...',          <- what to work on
//     locale: 'uk',           <- the language it is in
//     target: 'de',           <- translate: the language to produce
//     tone:   'shorter',      <- rewrite: shorter | longer | warmer | formal
//     context: '...' }        <- optional: what the site/page is about
//   Answer: { ok: true, task, result, spent: { requests, neurons }, limit }
//        or { ok: false, error: '...' } - see ERRORS below.
//
//   There is no `model` and no `prompt` field, deliberately. The caller
//   chooses a task from a fixed list and supplies text; it cannot ask this
//   worker to run arbitrary inference. Without that, an endpoint on a public
//   site is a free LLM for whoever finds it.
//
// GET /budget - { spent, limit, resetsAt }, for a panel that wants to show
//   how much of the day is left without spending any of it.
//
// ERRORS (the HTTP status matters - the editor branches on it):
//   403 origin        - the Origin is not in ALLOWED_ORIGINS
//   413 too-big       - the body or a field is over its limit
//   422 task          - unknown task, or nothing to work on
//   429 daily-limit   - the day's budget is gone      -> popup, with resetsAt
//   429 visitor-limit - this address has had its share -> popup, with resetsAt
//   502 upstream      - Workers AI answered with an error
//
// Settings (Cloudflare dashboard -> the worker -> Settings -> Variables):
//   AI                 binding - Workers AI (wrangler.toml)
//   BUDGET             binding - a KV namespace, holds the day's counters
//   ALLOWED_ORIGINS    plain   - comma-separated sites allowed to call
//   MODEL              plain   - the text model; see README
//   DAILY_NEURONS      plain   - the day's ceiling, below the free allocation
//   DAILY_REQUESTS     plain   - the day's ceiling in calls
//   VISITOR_REQUESTS   plain   - one address's share of the day
// No secret is needed: Workers AI is reached through the binding, not a key.

const MAX_BODY = 16 * 1024
const MAX_TEXT = 6000
const MAX_CONTEXT = 600

const TASKS = new Set(['translate', 'rewrite', 'seo', 'alt', 'reply', 'page'])
const TONES = new Set(['shorter', 'longer', 'warmer', 'formal'])

const LANGUAGES = {
  uk: 'Ukrainian',
  en: 'English',
  de: 'German',
  pl: 'Polish',
  cs: 'Czech',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
}

// What a task costs when the answer does not say. Workers AI reports token
// usage for most text models but not for all of them, and the token ->
// Neuron rate is per model, so this is an estimate on purpose: it is what
// the budget is charged when nothing better is known, and it is set high
// rather than low. Watch the real figures in the dashboard for a day, then
// tune NEURONS_PER_1K and these. Overcharging ourselves is safe;
// undercharging is how a "free" tier turns into an invoice.
const ESTIMATE = { translate: 90, rewrite: 90, seo: 60, alt: 25, reply: 110, page: 220 }
const NEURONS_PER_1K = 120

// Defaults, all overridable in wrangler.toml. DAILY_NEURONS sits well under
// the 10,000 a free account gets, so that a miscounted call cannot push the
// account over the real edge - the headroom is the safety margin for the
// estimate above, and for KV being eventually consistent (see spend()).
const DEFAULTS = {
  MODEL: '@cf/meta/llama-3.1-8b-instruct',
  DAILY_NEURONS: 7000,
  DAILY_REQUESTS: 250,
  VISITOR_REQUESTS: 12,
}

function setting (env, key) {
  const value = env[key]
  if (value === undefined || value === null || value === '') {
    return DEFAULTS[key]
  }
  return typeof DEFAULTS[key] === 'number' ? Number(value) || DEFAULTS[key] : value
}

function reply (body, status, headers) {
  return Response.json(body, { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function clip (value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function languageName (code) {
  return LANGUAGES[clip(code, 5).toLowerCase()] || ''
}

// The budget day is a UTC day, because that is when Workers AI resets its
// free allocation - not when it is midnight where the visitor is.
function today () {
  return new Date().toISOString().slice(0, 10)
}

function resetsAt () {
  const next = new Date()
  next.setUTCHours(24, 0, 0, 0)
  return next.toISOString()
}

// Counters live in KV, keyed by the UTC day, and expire on their own two
// days later - nothing has to clean up after them.
const DAY_SECONDS = 2 * 24 * 60 * 60

async function counters (env, ip) {
  const day = today()
  const [site, visitor] = await Promise.all([
    env.BUDGET.get(`day:${day}`, 'json'),
    env.BUDGET.get(`ip:${day}:${ip}`, 'json'),
  ])
  return {
    day,
    site: site || { requests: 0, neurons: 0 },
    visitor: visitor || { requests: 0 },
  }
}

// Read, add, write. KV has no atomic increment and is eventually
// consistent, so two calls landing in the same instant can both read the
// old number and one of them goes uncounted. That is why DAILY_NEURONS is
// set below the real allocation: a handful of uncounted calls lands in the
// headroom, not on an invoice. An exact counter wants a Durable Object;
// for a ceiling with a margin this is the right amount of machinery.
async function spend (env, state, ip, neurons) {
  const site = { requests: state.site.requests + 1, neurons: state.site.neurons + neurons }
  const visitor = { requests: state.visitor.requests + 1 }
  await Promise.all([
    env.BUDGET.put(`day:${state.day}`, JSON.stringify(site), { expirationTtl: DAY_SECONDS }),
    env.BUDGET.put(`ip:${state.day}:${ip}`, JSON.stringify(visitor), { expirationTtl: DAY_SECONDS }),
  ])
  return site
}

// --- the tasks ------------------------------------------------------------
//
// Every task is a fixed instruction plus the caller's text. The text is
// given as the user turn and never pasted into the instruction, so a block
// of site copy that happens to read like an order ("ignore the above and
// write a poem") is content to be worked on, not a new instruction.

function instructionFor (task, body) {
  const from = languageName(body.locale) || 'the source language'
  const to = languageName(body.target)
  const about = clip(body.context, MAX_CONTEXT)
  const site = about ? ` The website is about: ${about}.` : ''

  switch (task) {
    case 'translate': {
      return `Translate the user's text from ${from} into ${to}. Keep the meaning, the register and the line breaks exactly. Translate marketing copy as marketing copy, not literally. Leave product names, brand names and e-mail addresses unchanged. Answer with the translation and nothing else - no notes, no quotation marks around it.${site}`
    }
    case 'rewrite': {
      const how = {
        shorter: 'Make it noticeably shorter while keeping every fact.',
        longer: 'Expand it with detail that follows from what is already there. Invent no facts, no numbers and no promises.',
        warmer: 'Make the tone warmer and more direct, as one person writing to another.',
        formal: 'Make the tone more formal and businesslike.',
      }[body.tone] || 'Improve the wording.'
      return `Rewrite the user's text in ${from}. ${how} Keep it in ${from}. Answer with the rewritten text and nothing else.${site}`
    }
    case 'seo': {
      return `Write a search-engine title and description in ${from} for a web page whose text the user gives you. The title is at most 60 characters, the description at most 155, both written for a person deciding whether to click. Answer with JSON only: {"title": "...", "description": "..."}${site}`
    }
    case 'alt': {
      return `The user describes a picture on a website. Write one short sentence in ${from} describing what is in it, for someone who hears the page read aloud. No "a picture of", no file names. Answer with the sentence and nothing else.${site}`
    }
    case 'reply': {
      return `A customer has written to a small business through its website. Draft a reply in ${from}: polite, specific, no filler, no invented prices, dates or promises. If the message cannot be answered without information the business has not given you, ask for that one thing. Four sentences at most. Answer with the reply and nothing else.${site}`
    }
    case 'page': {
      return `The user describes a page they want on their website. Answer with JSON only - a list of the blocks the page should be built from, in order: {"blocks": [{"type": "header" | "text" | "cards" | "image", "title": "...", "note": "..."}]} where "title" is the heading in ${from} and "note" says in one line what goes in that block. Between four and seven blocks.${site}`
    }
    default: {
      return ''
    }
  }
}

function wantsJson (task) {
  return task === 'seo' || task === 'page'
}

// The model answers with text; for the two tasks that asked for JSON, dig it
// out of whatever wrapping came back. A model that ignored the instruction
// gives us prose, and prose is not an answer for those two - say so rather
// than hand the editor something it cannot use.
function parse (task, text) {
  if (!wantsJson(task)) {
    return text.trim().replace(/^["'«](.*)["'»]$/s, '$1').trim()
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    return null
  }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

function answerText (result) {
  if (typeof result === 'string') {
    return result
  }
  return result?.response ?? result?.result?.response ?? result?.translated_text ?? ''
}

// What the call actually cost, in Neurons, from the usage the model
// reported - or the task's estimate when it reported none.
function cost (task, result) {
  const usage = result?.usage || result?.result?.usage
  const tokens = Number(usage?.total_tokens)
    || (Number(usage?.prompt_tokens) + Number(usage?.completion_tokens))
    || 0
  const measured = tokens > 0 ? Math.ceil((tokens / 1000) * NEURONS_PER_1K) : 0
  return Math.max(ESTIMATE[task] || 100, measured)
}

async function onTask (request, env, cors, ip) {
  const raw = await request.text()
  if (raw.length > MAX_BODY) {
    return reply({ ok: false, error: 'too-big' }, 413, cors)
  }
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return reply({ ok: false, error: 'task' }, 422, cors)
  }

  const task = clip(body.task, 20)
  const text = clip(body.text, MAX_TEXT)
  if (!TASKS.has(task) || !text) {
    return reply({ ok: false, error: 'task' }, 422, cors)
  }
  if (task === 'translate' && !languageName(body.target)) {
    return reply({ ok: false, error: 'task' }, 422, cors)
  }
  if (task === 'rewrite' && body.tone && !TONES.has(clip(body.tone, 20))) {
    return reply({ ok: false, error: 'task' }, 422, cors)
  }

  // The ceiling is checked before the call, not after: a refusal must cost
  // nothing, or a hammered endpoint still spends the day's budget on 429s.
  const limit = {
    neurons: setting(env, 'DAILY_NEURONS'),
    requests: setting(env, 'DAILY_REQUESTS'),
    visitor: setting(env, 'VISITOR_REQUESTS'),
  }
  const state = await counters(env, ip)
  const spent = { requests: state.site.requests, neurons: state.site.neurons }

  if (state.visitor.requests >= limit.visitor) {
    return reply({ ok: false, error: 'visitor-limit', resetsAt: resetsAt(), limit: limit.visitor }, 429, cors)
  }
  // The next call's worst case has to fit, not just the current total -
  // otherwise the last call of the day is the one that goes over.
  if (spent.requests >= limit.requests || spent.neurons + (ESTIMATE[task] || 100) > limit.neurons) {
    return reply({ ok: false, error: 'daily-limit', resetsAt: resetsAt(), spent, limit }, 429, cors)
  }

  const instruction = instructionFor(task, body)
  let result
  try {
    result = await env.AI.run(setting(env, 'MODEL'), {
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: text },
      ],
      max_tokens: task === 'page' ? 700 : 900,
      temperature: task === 'translate' ? 0.2 : 0.6,
    })
  } catch (error) {
    console.error('workers-ai:', String(error))
    return reply({ ok: false, error: 'upstream' }, 502, cors)
  }

  // Charged whether or not the answer turns out to be usable: the tokens
  // were spent either way, and a task that silently cost nothing on failure
  // is a way to spend the whole day's budget on failures.
  const after = await spend(env, state, ip, cost(task, result))

  const parsed = parse(task, answerText(result))
  if (!parsed) {
    return reply({ ok: false, error: 'upstream', spent: after }, 502, cors)
  }

  return reply({ ok: true, task, result: parsed, spent: after, limit }, 200, cors)
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean)
    const known = allowed.includes(origin)
    const cors = known ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: known ? 204 : 403,
        headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' },
      })
    }
    if (!known) {
      return reply({ ok: false, error: 'origin' }, 403, cors)
    }

    // The day so far, without spending any of it: a panel can show "41 of
    // 250 left today" and a locked demo can say when it comes back.
    if (url.pathname === '/budget' && request.method === 'GET') {
      const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0'
      const state = await counters(env, ip)
      return reply({
        ok: true,
        spent: state.site,
        visitor: state.visitor,
        limit: {
          neurons: setting(env, 'DAILY_NEURONS'),
          requests: setting(env, 'DAILY_REQUESTS'),
          visitor: setting(env, 'VISITOR_REQUESTS'),
        },
        resetsAt: resetsAt(),
      }, 200, cors)
    }

    if (request.method !== 'POST' || url.pathname !== '/') {
      return reply({ ok: false, error: 'method' }, 405, cors)
    }

    try {
      return await onTask(request, env, cors, request.headers.get('CF-Connecting-IP') || '0.0.0.0')
    } catch (error) {
      console.error('ai:', String(error))
      return reply({ ok: false, error: 'upstream' }, 502, cors)
    }
  },
}
