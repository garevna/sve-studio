// The made-up client's own pages: its request intake (booking page) and its
// admin. Plain HTML with inline script - they belong to the client, not to
// Pagewright, and must look like someone else's system.

const STYLE = `
  :root {
    --ink: #1D2433; --muted: #5B6476; --line: #DCE1EA; --page: #F4F1EC;
    --card: #FFFFFF; --brand: #8C2F39; --brand-ink: #FFFFFF; --fresh: #FFF4D6;
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; min-height: 100vh; background: var(--page); color: var(--ink);
    font: 16px/1.5 Georgia, 'Times New Roman', serif; }
  header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px;
    padding: 14px max(16px, calc((100vw - 1040px) / 2)); background: var(--brand); color: var(--brand-ink); }
  header strong { font-size: 1.25rem; letter-spacing: 0.02em; }
  header nav { display: flex; gap: 6px; font: 13px/1 system-ui, sans-serif; }
  header nav a { padding: 5px 9px; border-radius: 999px; color: inherit; text-decoration: none; opacity: 0.75; }
  header nav a[aria-current] { background: rgb(255 255 255 / 0.18); opacity: 1; }
  .stamp { padding: 2px 10px; border: 1px solid rgb(255 255 255 / 0.6); border-radius: 999px;
    font: 12px/1.6 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
  main { max-width: 1072px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 4vw, 2rem); font-weight: normal; }
  .lead { margin: 0 0 24px; max-width: 720px; color: var(--muted); font-family: system-ui, sans-serif; }
  .card { padding: 20px 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
  .card + .card { margin-top: 16px; }
  h2 { margin: 0 0 12px; font: 600 0.8rem/1.4 system-ui, sans-serif; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.08em; }
  dl { display: grid; grid-template-columns: minmax(0, max-content) minmax(0, 1fr); gap: 6px 20px; margin: 0;
    font: 0.88rem/1.5 ui-monospace, Consolas, monospace; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .button { display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border: 0;
    border-radius: 999px; background: var(--brand); color: var(--brand-ink); font: 600 1rem system-ui, sans-serif;
    text-decoration: none; cursor: pointer; }
  .button.quiet { background: transparent; color: var(--brand); box-shadow: inset 0 0 0 1px var(--brand); }
  .button[disabled], .button[aria-disabled="true"] { opacity: 0.4; pointer-events: none; }
  .note { margin-top: 24px; color: var(--muted); font: 0.85rem/1.5 system-ui, sans-serif; }
  .done { margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: var(--fresh);
    font: 0.95rem/1.5 system-ui, sans-serif; }
  .done a { color: var(--brand); }
`

function HEAD (title) {
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">
<title>${title}</title>
<style>${STYLE}</style>`
}

// Texts, language and the language links - shared by the pages.
const LANG_SCRIPT = `
  var params = new URLSearchParams(location.search)
  function pickLang (wanted) {
    var lang = wanted || (navigator.language || 'uk').slice(0, 2)
    return lang === 'en' || lang === 'de' ? lang : 'uk'
  }
  function el (tag, className, text) {
    var node = document.createElement(tag)
    if (className) { node.className = className }
    if (text !== undefined && text !== null) { node.textContent = text }
    return node
  }
  // {a: {b: 1}} -> [['a.b', 1]]
  function flat (value, prefix, out) {
    out = out || []
    Object.keys(value || {}).forEach(function (key) {
      var name = prefix ? prefix + '.' + key : key
      var item = value[key]
      if (item && typeof item === 'object' && !Array.isArray(item)) { flat(item, name, out) }
      else { out.push([name, Array.isArray(item) ? item.join(', ') : String(item)]) }
    })
    return out
  }
  function list (entries) {
    var dl = el('dl')
    entries.forEach(function (entry) { dl.append(el('dt', '', entry[0]), el('dd', '', entry[1])) })
    return dl
  }
`

export function homePage () {
  return `${HEAD('Kalyna Hotels · demo')}
</head>
<body>
<header><strong>Kalyna Hotels</strong><span class="stamp">demo</span></header>
<main>
  <h1>Kalyna Hotels — demo client</h1>
  <p class="lead">An invented hotel chain for the Pagewright demo: no real company, no real data.
  It plays a client's own system — its API, its booking page and its admin — on an address of its own.</p>
  <div class="actions"><a class="button" href="/admin">Admin</a></div>
</main>
</body>
</html>`
}

export function bookPage () {
  return String.raw`${HEAD('Kalyna Hotels · booking')}
</head>
<body>
<header><strong>Kalyna Hotels</strong><span class="stamp" id="stamp"></span></header>
<main>
  <h1 id="title"></h1>
  <p class="lead" id="lead"></p>
  <section class="card">
    <h2 id="received"></h2>
    <div id="content"></div>
  </section>
  <div class="done" id="done" hidden></div>
  <div class="actions">
    <button class="button" id="confirm" type="button" disabled></button>
    <a class="button quiet" id="back" aria-disabled="true"></a>
  </div>
  <p class="note" id="note"></p>
</main>
<script>
(function () {
  ${LANG_SCRIPT}
  var TEXTS = {
    uk: {
      stamp: 'демо', title: 'Запит на бронювання',
      lead: 'Це сторінка самого клієнта — його прийом запитів, не наш. Сайт передав сюди відвідувача з тим, що той вибрав.',
      link: 'Отримано в адресі', session: 'Отримано в сесії', none: 'Нічого не передано.',
      missing: 'Такої сесії немає — вона застаріла або демо почали заново.',
      confirm: 'Забронювати', sending: 'Надсилаємо…', failed: 'Не вдалося — спробуйте ще раз.',
      done: 'Бронювання № {id} прийнято. Воно вже в адмінці клієнта:', admin: 'відкрити адмінку',
      back: 'Повернутися на сайт',
      note: 'Вигадана мережа готелів для демо Pagewright. Справжня система клієнта стає на це місце — у редакторі змінюються лише адреса й назви параметрів.'
    },
    en: {
      stamp: 'demo', title: 'Booking',
      lead: 'This is the client’s own page — its checkout, not ours. The site handed the visitor over with what they chose.',
      link: 'Received in the address', session: 'Received in a session', none: 'Nothing was passed.',
      missing: 'No such session — it expired or the demo was started over.',
      confirm: 'Book', sending: 'Sending…', failed: 'That did not work — try again.',
      done: 'Booking No. {id} accepted. It is already in the client’s admin:', admin: 'open the admin',
      back: 'Back to the site',
      note: 'An invented hotel chain for the Pagewright demo. The client’s real system takes this place — in the editor only the address and the parameter names change.'
    },
    de: {
      stamp: 'Demo', title: 'Buchung abschließen',
      lead: 'Das ist die eigene Seite des Kunden — sein Buchungsabschluss, nicht unserer. Die Website hat den Besucher mit seiner Auswahl hierher übergeben.',
      link: 'In der Adresse erhalten', session: 'In einer Sitzung erhalten', none: 'Nichts übergeben.',
      missing: 'Diese Sitzung gibt es nicht — sie ist abgelaufen oder die Demo wurde neu gestartet.',
      confirm: 'Buchen', sending: 'Wird gesendet…', failed: 'Das hat nicht geklappt — bitte erneut versuchen.',
      done: 'Buchung Nr. {id} angenommen. Sie ist schon im Admin des Kunden:', admin: 'Admin öffnen',
      back: 'Zurück zur Website',
      note: 'Eine erfundene Hotelkette für die Pagewright-Demo. Das echte System des Kunden tritt an diese Stelle — im Editor ändern sich nur die Adresse und die Parameternamen.'
    }
  }

  function show (lang, received, entries, back, booking) {
    var t = TEXTS[lang]
    document.documentElement.lang = lang
    document.getElementById('stamp').textContent = t.stamp
    document.getElementById('title').textContent = t.title
    document.getElementById('lead').textContent = t.lead
    document.getElementById('received').textContent = t[received]
    document.getElementById('note').textContent = t.note
    var content = document.getElementById('content')
    if (entries === null) { content.textContent = t.missing }
    else if (entries.length === 0) { content.textContent = t.none }
    else { content.append(list(entries)) }

    var link = document.getElementById('back')
    link.textContent = t.back
    if (back && /^https?:\/\//.test(back)) {
      link.href = back
      link.removeAttribute('aria-disabled')
    }

    var confirm = document.getElementById('confirm')
    confirm.textContent = t.confirm
    if (!booking) { return }
    confirm.disabled = false
    confirm.addEventListener('click', function () {
      confirm.disabled = true
      confirm.textContent = t.sending
      fetch('/hotel/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) })
        .then(function (response) { return response.ok ? response.json() : Promise.reject(response.status) })
        .then(function (answer) {
          confirm.hidden = true
          var done = document.getElementById('done')
          done.textContent = t.done.replace('{id}', answer.id) + ' '
          var admin = el('a', '', t.admin)
          admin.href = '/admin?lang=' + lang
          admin.target = 'pw-demo-admin'
          done.append(admin)
          done.hidden = false
        })
        .catch(function () {
          confirm.disabled = false
          confirm.textContent = t.failed
        })
    })
  }

  var token = params.get('session')
  if (!token) {
    var entries = []
    var data = {}
    params.forEach(function (value, name) { entries.push([name, value]); data[name] = value })
    show(pickLang(params.get('lang')), 'link', entries, params.get('return'), entries.length ? { via: 'link', data: data } : null)
    return
  }
  fetch('/hotel/sessions/' + encodeURIComponent(token))
    .then(function (response) { return response.ok ? response.json() : null })
    .catch(function () { return null })
    .then(function (session) {
      var body = session && session.body
      show(pickLang(body && body.language), 'session', body ? flat(body) : null,
        body && body.returnUrl, body ? { via: 'session', token: token } : null)
    })
})()
</script>
</body>
</html>`
}

export function adminPage () {
  return `${HEAD('Kalyna Hotels · admin')}
<style>
  .live { display: inline-flex; align-items: center; gap: 8px; font: 13px/1 system-ui, sans-serif; }
  .live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #7BD88F; }
  .live.off::before { background: #F2B8B5; }
  .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
  @media (max-width: 760px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  .grid .card + .card { margin-top: 0; }
  .empty { color: var(--muted); font: 0.9rem system-ui, sans-serif; }
  .item { padding: 10px 0; border-top: 1px solid var(--line); transition: background 2s; }
  .item:first-of-type { border-top: 0; }
  .item.fresh { background: var(--fresh); transition: none; }
  .item-head { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin-bottom: 4px;
    font: 0.9rem/1.4 system-ui, sans-serif; }
  .item-head b { font-weight: 600; }
  .item-head span { color: var(--muted); }
  .method { font: 600 0.75rem/1 ui-monospace, Consolas, monospace; padding: 3px 6px; border-radius: 4px;
    background: var(--page); }
  .path { font-family: ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
  .bad { color: var(--brand); }
  .requests { margin-top: 16px; }
  .tools { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 20px; }
</style>
</head>
<body>
<header>
  <strong>Kalyna Hotels</strong>
  <nav id="langs"></nav>
  <span class="stamp" id="stamp"></span>
</header>
<main>
  <h1 id="title"></h1>
  <p class="lead" id="lead"></p>
  <div class="tools">
    <span class="live" id="live"></span>
    <button class="button quiet" id="clear" type="button"></button>
  </div>
  <div class="grid">
    <section class="card"><h2 id="bookingsTitle"></h2><div id="bookings"></div></section>
    <section class="card"><h2 id="sessionsTitle"></h2><div id="sessions"></div></section>
  </div>
  <section class="card requests"><h2 id="requestsTitle"></h2><div id="requests"></div></section>
</main>
<script>
(function () {
  ${LANG_SCRIPT}
  var TEXTS = {
    uk: {
      stamp: 'адмінка · демо', title: 'Адмінка клієнта',
      lead: 'Так система клієнта бачить те, що надсилає сайт: кожен запит, кожну сесію й кожне бронювання — щойно вони надходять. Тримайте це вікно поруч із сайтом.',
      live: 'оновлюється наживо', off: 'немає зв’язку', clear: 'Почати демо заново', sure: 'Стерти всі запити, сесії й бронювання демо?',
      bookings: 'Бронювання', sessions: 'Сесії', requests: 'Запити до API',
      noBookings: 'Бронювань ще немає. Вони з’являються, коли відвідувач натискає «Забронювати» на сторінці бронювання.',
      noSessions: 'Сесій ще немає. Їх створює сайт, коли передача налаштована як «Сесія».',
      noRequests: 'Запитів ще не було. Відкрийте сайт і скористайтеся пошуком готелю.',
      booking: 'Бронювання № {id}', via: { link: 'з адреси', session: 'із сесії' }, from: 'від', query: 'параметри', body: 'тіло'
    },
    en: {
      stamp: 'admin · demo', title: 'The client’s admin',
      lead: 'How the client’s system sees what the site sends: every request, every session and every booking — as they arrive. Keep this window next to the site.',
      live: 'live', off: 'no connection', clear: 'Start the demo over', sure: 'Erase all of the demo’s requests, sessions and bookings?',
      bookings: 'Bookings', sessions: 'Sessions', requests: 'API requests',
      noBookings: 'No bookings yet. One appears when a visitor presses “Book” on the booking page.',
      noSessions: 'No sessions yet. The site creates them when the handoff is set to “Session”.',
      noRequests: 'No requests yet. Open the site and use the hotel search.',
      booking: 'Booking No. {id}', via: { link: 'from the address', session: 'from a session' }, from: 'from', query: 'query', body: 'body'
    },
    de: {
      stamp: 'Admin · Demo', title: 'Admin des Kunden',
      lead: 'So sieht das System des Kunden, was die Website sendet: jede Anfrage, jede Sitzung und jede Buchung — sobald sie eintreffen. Halten Sie dieses Fenster neben der Website.',
      live: 'live', off: 'keine Verbindung', clear: 'Demo neu starten', sure: 'Alle Anfragen, Sitzungen und Buchungen der Demo löschen?',
      bookings: 'Buchungen', sessions: 'Sitzungen', requests: 'API-Anfragen',
      noBookings: 'Noch keine Buchungen. Eine erscheint, wenn ein Besucher auf der Buchungsseite „Buchen“ drückt.',
      noSessions: 'Noch keine Sitzungen. Die Website erstellt sie, wenn die Übergabe auf „Sitzung“ steht.',
      noRequests: 'Noch keine Anfragen. Öffnen Sie die Website und nutzen Sie die Hotelsuche.',
      booking: 'Buchung Nr. {id}', via: { link: 'aus der Adresse', session: 'aus einer Sitzung' }, from: 'von', query: 'Parameter', body: 'Body'
    }
  }
  var lang = pickLang(params.get('lang'))
  var t = TEXTS[lang]
  document.documentElement.lang = lang
  ;['stamp', 'title', 'lead'].forEach(function (id) { document.getElementById(id).textContent = t[id] })
  document.getElementById('bookingsTitle').textContent = t.bookings
  document.getElementById('sessionsTitle').textContent = t.sessions
  document.getElementById('requestsTitle').textContent = t.requests
  var langs = document.getElementById('langs')
  ;['uk', 'en', 'de'].forEach(function (code) {
    var a = el('a', '', code.toUpperCase())
    a.href = '?lang=' + code
    if (code === lang) { a.setAttribute('aria-current', 'true') }
    langs.append(a)
  })

  var seen = {}
  var first = true
  function time (at) {
    return new Date(at).toLocaleString(lang === 'uk' ? 'uk-UA' : lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  function item (key, head, entries) {
    var node = el('div', 'item')
    if (!first && !seen[key]) {
      node.classList.add('fresh')
      setTimeout(function () { node.classList.remove('fresh') }, 50)
    }
    seen[key] = true
    var line = el('div', 'item-head')
    head.forEach(function (part) { line.append(part) })
    node.append(line)
    if (entries.length) { node.append(list(entries)) }
    return node
  }
  function fill (id, rows, empty, make) {
    var box = document.getElementById(id)
    box.textContent = ''
    if (!rows.length) { box.append(el('p', 'empty', empty)); return }
    rows.forEach(function (row) { box.append(make(row)) })
  }
  function render (feed) {
    fill('bookings', feed.bookings, t.noBookings, function (row) {
      return item('b' + row.id, [el('b', '', t.booking.replace('{id}', row.id)), el('span', '', time(row.at) + ' · ' + (t.via[row.via] || row.via))], flat(row.data))
    })
    fill('sessions', feed.sessions, t.noSessions, function (row) {
      return item('s' + row.token, [el('b', 'path', row.token), el('span', '', time(row.at))], flat(row.body))
    })
    fill('requests', feed.requests, t.noRequests, function (row) {
      var entries = []
      if (row.query) { flat(row.query).forEach(function (e) { entries.push([t.query + ' · ' + e[0], e[1]]) }) }
      if (row.body) { flat(row.body).forEach(function (e) { entries.push([t.body + ' · ' + e[0], e[1]]) }) }
      return item('r' + row.id, [
        el('span', 'method', row.method),
        el('b', 'path', row.path),
        el('span', row.status >= 400 ? 'bad' : '', String(row.status)),
        el('span', '', time(row.at) + (row.origin ? ' · ' + t.from + ' ' + row.origin : ''))
      ], entries)
    })
    first = false
  }

  var live = document.getElementById('live')
  function poll () {
    fetch('/admin/feed', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : Promise.reject(response.status) })
      .then(function (feed) {
        render(feed)
        live.className = 'live'
        live.textContent = t.live
      })
      .catch(function () {
        live.className = 'live off'
        live.textContent = t.off
      })
      .then(function () { setTimeout(poll, document.hidden ? 10000 : 2000) })
  }
  poll()

  var clear = document.getElementById('clear')
  clear.textContent = t.clear
  clear.addEventListener('click', function () {
    if (!window.confirm(t.sure)) { return }
    fetch('/admin/feed', { method: 'DELETE' }).then(function () { seen = {}; first = true })
  })
})()
</script>
</body>
</html>`
}
