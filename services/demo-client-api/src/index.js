// "Kalyna Hotels" - a made-up client for the Pagewright demo (invented: no
// real company, no real data). It stands where a real client's system would:
// on its own address, apart from the site. The site's docking block
// (packages/dock, content/settings/client-api.json) talks to it exactly as it
// would to a real client's API.
//
// The API - called from the visitor's browser, so CORS for ALLOWED_ORIGINS:
//   GET  /hotel/destinations?lang=uk                  cities for "Куди"
//   GET  /hotel/availability?destination=lviv&month=2026-12
//                                                     free days, price a night
//   GET  /hotel/rooms?destination&checkin&checkout&adults&children&rooms&lang
//                                                     room categories free then: photo, points, price
//   POST /hotel/sessions                              a booking session -> { token }
//   GET  /hotel/sessions/<token>                      what it was made with
//   POST /hotel/bookings                              a confirmed booking -> { id }
//
// The client's own pages (same origin, no CORS):
//   GET  /hotel/book?...  or  /hotel/book?session=<token>
//        its request intake: shows what the site handed over, confirms a booking
//   GET  /admin           its admin: bookings, sessions, every request, live
//   GET  /admin/feed      what the admin shows
//   DELETE /admin/feed    starts the demo over
//   GET  /                what this is
import { adminPage, bookPage, homePage } from './pages.js'

const DESTINATIONS = [
  { id: 'lviv', city: { uk: 'Львів', en: 'Lviv', de: 'Lwiw' }, country: { uk: 'Україна', en: 'Ukraine', de: 'Ukraine' }, base: 62 },
  { id: 'kyiv', city: { uk: 'Київ', en: 'Kyiv', de: 'Kyjiw' }, country: { uk: 'Україна', en: 'Ukraine', de: 'Ukraine' }, base: 74 },
  { id: 'odesa', city: { uk: 'Одеса', en: 'Odesa', de: 'Odessa' }, country: { uk: 'Україна', en: 'Ukraine', de: 'Ukraine' }, base: 68 },
  { id: 'krakow', city: { uk: 'Краків', en: 'Kraków', de: 'Krakau' }, country: { uk: 'Польща', en: 'Poland', de: 'Polen' }, base: 81 },
  { id: 'vienna', city: { uk: 'Відень', en: 'Vienna', de: 'Wien' }, country: { uk: 'Австрія', en: 'Austria', de: 'Österreich' }, base: 124 },
  { id: 'berlin', city: { uk: 'Берлін', en: 'Berlin', de: 'Berlin' }, country: { uk: 'Німеччина', en: 'Germany', de: 'Deutschland' }, base: 109 },
]

// Room categories: the same in every city, priced from the city's nights.
// Photos are the client's own (public/rooms, credits in README.md).
const ROOMS = [
  {
    id: 'standard', price: 1, sleeps: 2, size: 18,
    name: { uk: 'Стандарт', en: 'Standard', de: 'Standard' },
    perks: {
      uk: ['двоспальне ліжко', 'робочий стіл', 'душ'],
      en: ['double bed', 'work desk', 'shower'],
      de: ['Doppelbett', 'Schreibtisch', 'Dusche'],
    },
  },
  {
    id: 'deluxe', price: 1.45, sleeps: 2, size: 28,
    name: { uk: 'Делюкс', en: 'Deluxe', de: 'Deluxe' },
    perks: {
      uk: ['ліжко king-size', 'вид на місто', 'кавомашина'],
      en: ['king-size bed', 'city view', 'coffee machine'],
      de: ['Kingsize-Bett', 'Stadtblick', 'Kaffeemaschine'],
    },
  },
  {
    id: 'family', price: 1.7, sleeps: 4, size: 36,
    name: { uk: 'Сімейний', en: 'Family', de: 'Familienzimmer' },
    perks: {
      uk: ['ліжко й розкладний диван', 'до 4 гостей', 'дитяче ліжечко за запитом'],
      en: ['bed and sofa bed', 'up to 4 guests', 'cot on request'],
      de: ['Bett und Schlafsofa', 'bis zu 4 Gäste', 'Babybett auf Anfrage'],
    },
  },
  {
    id: 'suite', price: 2.6, sleeps: 3, size: 64,
    name: { uk: 'Люкс', en: 'Suite', de: 'Suite' },
    perks: {
      uk: ['вітальня й спальня', 'панорамні вікна', 'сніданок у номері'],
      en: ['living room and bedroom', 'panoramic windows', 'breakfast in the room'],
      de: ['Wohn- und Schlafzimmer', 'Panoramafenster', 'Frühstück im Zimmer'],
    },
  },
]

function nightsOf (checkin, checkout) {
  const nights = []
  for (let day = new Date(`${checkin}T00:00:00Z`); day < new Date(`${checkout}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    nights.push(day.toISOString().slice(0, 10))
    if (nights.length > 60) {
      break
    }
  }
  return nights
}

// The categories free for these dates and guests, with their price.
function roomsOf (destination, { checkin, checkout, adults, children, rooms, lang }) {
  const nights = nightsOf(checkin, checkout)
  if (nights.length === 0) {
    return []
  }
  const prices = new Map()
  for (const month of new Set(nights.map(night => night.slice(0, 7)))) {
    for (const day of daysOf(destination, month)) {
      prices.set(day.date, day.price)
    }
  }
  const night = nights.reduce((sum, date) => sum + (prices.get(date) ?? destination.base), 0) / nights.length
  const perRoom = Math.ceil((adults + children) / Math.max(rooms, 1))
  // now and then one category is sold out for these dates (never Standard)
  const soldOut = ['deluxe', 'family', 'suite'][hash(`${destination.id}:${checkin}`) % 5]
  return ROOMS
    .filter(room => room.sleeps >= perRoom && room.id !== soldOut)
    .map(room => {
      const perNight = Math.round(night * room.price)
      return {
        id: room.id,
        name: room.name[lang],
        size: room.size,
        perks: [`${room.size} m²`, ...room.perks[lang]],
        image: `/rooms/${room.id}.jpg`,
        perNight,
        nights: nights.length,
        total: perNight * nights.length * Math.max(rooms, 1),
        currency: 'EUR',
      }
    })
}

// How much the demo keeps: it is a shop window, not an archive.
const KEEP_REQUESTS = 300
const KEEP_BOOKINGS = 100
const KEEP_DAYS = 14
const MAX_BODY = 8 * 1024

function langOf (value) {
  return value === 'en' || value === 'de' ? value : 'uk'
}

// The same days and prices on every visit: a calendar that reshuffles on
// each click reads as broken.
function hash (text) {
  let value = 2_166_136_261
  for (const char of text) {
    value = Math.imul(value ^ char.codePointAt(0), 16_777_619)
  }
  return value >>> 0
}

function daysOf (destination, month) {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber || monthNumber > 12) {
    return []
  }
  const today = new Date().toISOString().slice(0, 10)
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const days = []
  for (let day = 1; day <= length; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const roll = hash(`${destination.id}:${date}`)
    // about one day in six is sold out; days past are never offered
    if (date < today || roll % 6 === 0) {
      continue
    }
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const weekend = weekday === 5 || weekday === 6 ? 1.25 : 1
    days.push({ date, price: Math.round(destination.base * weekend * (0.85 + (roll % 40) / 100)), currency: 'EUR' })
  }
  return days
}

function allowedOrigin (request, env) {
  const origin = request.headers.get('Origin')
  const allowed = String(env.ALLOWED_ORIGINS ?? '').split(',').map(item => item.trim()).filter(Boolean)
  return origin && allowed.includes(origin) ? origin : null
}

function corsOf (origin) {
  return origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      }
    : {}
}

function json (body, status, headers = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function html (body) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      // Cloudflare's own Web Analytics beacon is injected into every page of
      // the zone - let it load rather than leave a red line in the console.
      'Content-Security-Policy': 'default-src \'self\'; script-src \'unsafe-inline\' https://static.cloudflareinsights.com; style-src \'unsafe-inline\'; img-src data:; connect-src \'self\' https://cloudflareinsights.com; base-uri \'none\'; frame-ancestors \'none\'',
    },
  })
}

// Where a request came from, as the admin shows it: the site's address.
function originOf (request) {
  const origin = request.headers.get('Origin')
  if (origin) {
    return origin
  }
  try {
    return new URL(request.headers.get('Referer') ?? '').origin
  } catch {
    return null
  }
}

async function note (env, request, url, status, body) {
  const query = Object.fromEntries(url.searchParams)
  await env.DB.batch([
    env.DB.prepare('INSERT INTO journal (at, method, path, query, body, status, origin) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(new Date().toISOString(), request.method, url.pathname,
        Object.keys(query).length > 0 ? JSON.stringify(query) : null,
        body === undefined ? null : JSON.stringify(body),
        status, originOf(request)),
    env.DB.prepare('DELETE FROM journal WHERE id <= (SELECT MAX(id) FROM journal) - ?').bind(KEEP_REQUESTS),
  ])
}

async function readJson (request) {
  const text = await request.text()
  if (text.length > MAX_BODY) {
    return { error: 'too-large' }
  }
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? { value } : { error: 'json' }
  } catch {
    return { error: 'json' }
  }
}

function tokenOf () {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return `s${[...bytes].map(byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 14)}`
}

async function session (env, token) {
  if (!/^s[a-z0-9]{6,20}$/.test(token)) {
    return null
  }
  const row = await env.DB.prepare('SELECT at, body FROM sessions WHERE token = ?').bind(token).first()
  return row ? { at: row.at, body: JSON.parse(row.body) } : null
}

async function roomsAnswer (request, env, url, cors) {
  const query = url.searchParams
  const destination = DESTINATIONS.find(item => item.id === query.get('destination'))
  const day = /^\d{4}-\d{2}-\d{2}$/
  const checkin = query.get('checkin') ?? ''
  const checkout = query.get('checkout') ?? ''
  if (!destination || !day.test(checkin) || !day.test(checkout) || checkout <= checkin) {
    await note(env, request, url, 400)
    return json({ error: 'destination, checkin and checkout (YYYY-MM-DD, checkout after checkin) are required' }, 400, cors)
  }
  const count = (name, fallback) => Math.min(Math.max(Number.parseInt(query.get(name) ?? '', 10) || fallback, 0), 20)
  await note(env, request, url, 200)
  return json({
    items: roomsOf(destination, {
      checkin,
      checkout,
      adults: count('adults', 1),
      children: count('children', 0),
      rooms: count('rooms', 1) || 1,
      lang: langOf(query.get('lang')),
    }),
  }, 200, cors)
}

async function api (request, env, url, cors) {
  const path = url.pathname

  if (request.method === 'GET' && path === '/hotel/destinations') {
    const lang = langOf(url.searchParams.get('lang'))
    await note(env, request, url, 200)
    return json({ items: DESTINATIONS.map(item => ({ id: item.id, name: item.city[lang], country: item.country[lang] })) }, 200, cors)
  }

  if (request.method === 'GET' && path === '/hotel/availability') {
    const destination = DESTINATIONS.find(item => item.id === url.searchParams.get('destination'))
    const month = url.searchParams.get('month') ?? ''
    if (!destination || !/^\d{4}-\d{2}$/.test(month)) {
      await note(env, request, url, 400)
      return json({ error: 'destination and month (YYYY-MM) are required' }, 400, cors)
    }
    await note(env, request, url, 200)
    return json({ days: daysOf(destination, month) }, 200, cors)
  }

  if (request.method === 'GET' && path === '/hotel/rooms') {
    return roomsAnswer(request, env, url, cors)
  }

  if (request.method === 'POST' && path === '/hotel/sessions') {
    const { value, error } = await readJson(request)
    if (error) {
      await note(env, request, url, error === 'too-large' ? 413 : 400)
      return json({ error }, error === 'too-large' ? 413 : 400, cors)
    }
    const token = tokenOf()
    await env.DB.batch([
      env.DB.prepare('INSERT INTO sessions (token, at, body) VALUES (?, ?, ?)').bind(token, new Date().toISOString(), JSON.stringify(value)),
      env.DB.prepare('DELETE FROM sessions WHERE at < ?').bind(new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()),
    ])
    await note(env, request, url, 201, value)
    return json({ token }, 201, cors)
  }

  const sessionPath = path.match(/^\/hotel\/sessions\/([^/]+)$/)
  if (request.method === 'GET' && sessionPath) {
    const found = await session(env, decodeURIComponent(sessionPath[1]))
    return found ? json(found, 200, cors) : json({ error: 'no such session' }, 404, cors)
  }

  if (request.method === 'POST' && path === '/hotel/bookings') {
    const { value, error } = await readJson(request)
    let data = null
    if (!error && value.via === 'session') {
      data = (await session(env, String(value.token ?? '')))?.body ?? null
    } else if (!error && value.via === 'link' && value.data && typeof value.data === 'object') {
      data = value.data
    }
    if (!data) {
      await note(env, request, url, 400, value)
      return json({ error: 'a session token or the handed-over values are required' }, 400, cors)
    }
    const at = new Date().toISOString()
    const [inserted] = await env.DB.batch([
      env.DB.prepare('INSERT INTO bookings (at, via, data) VALUES (?, ?, ?) RETURNING id').bind(at, value.via, JSON.stringify(data)),
      env.DB.prepare('DELETE FROM bookings WHERE id <= (SELECT MAX(id) FROM bookings) - ?').bind(KEEP_BOOKINGS),
    ])
    await note(env, request, url, 201, value)
    return json({ id: inserted.results[0].id }, 201, cors)
  }

  return null
}

async function feed (env) {
  const [requests, sessions, bookings] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM journal ORDER BY id DESC LIMIT 100'),
    env.DB.prepare('SELECT * FROM sessions ORDER BY at DESC LIMIT 50'),
    env.DB.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 50'),
  ])
  const parse = text => (text ? JSON.parse(text) : null)
  return {
    requests: requests.results.map(row => ({ ...row, query: parse(row.query), body: parse(row.body) })),
    sessions: sessions.results.map(row => ({ ...row, body: parse(row.body) })),
    bookings: bookings.results.map(row => ({ ...row, data: parse(row.data) })),
  }
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    const origin = allowedOrigin(request, env)
    const cors = corsOf(origin)
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: origin ? 204 : 403, headers: cors })
      }
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
        return html(homePage())
      }
      if (request.method === 'GET' && url.pathname === '/hotel/book') {
        return html(bookPage())
      }
      if (request.method === 'GET' && url.pathname === '/admin') {
        return html(adminPage())
      }
      if (url.pathname === '/admin/feed') {
        if (request.method === 'GET') {
          return json(await feed(env), 200)
        }
        if (request.method === 'DELETE') {
          await env.DB.batch(['journal', 'sessions', 'bookings'].map(table => env.DB.prepare(`DELETE FROM ${table}`)))
          return json(null, 204)
        }
      }
      if (url.pathname === '/favicon.ico') {
        return new Response(null, { status: 204 })
      }
      return (await api(request, env, url, cors)) ?? json({ error: 'not found' }, 404, cors)
    } catch (error) {
      return json({ error: 'server', detail: String(error?.message ?? error) }, 500, cors)
    }
  },
}
