// Pagewright demo's own feedback relay: the site's feedback form -> a private
// Telegram channel, and the channel's replies -> the visitor's account.
// A Cloudflare Worker, deployed on its own.
//
// NOT part of the editor or the site, and never imported by them. The site
// only knows an address (global.json -> feedback.endpoint) and the payload
// below; a real client's site points that address at its own API instead.
//
// POST /  - a filled-in form (JSON):
//   { kind: 'message' | 'call-request' | ..., locale: 'uk', page: '/site/...',
//     fields: { name?, phone?, email?, date?, rating?, message?,
//               contact?: { via: 'telegram' | 'viber' | 'whatsapp' | 'email', value } },
//     messageId?: '...'  <- a signed-in visitor's message, already in Firestore
//                           (messages/{id}); the post carries it as "🆔 id"
//     website?: ''       <- a hidden field people never fill; bots do }
//   Answer: { ok: true } or { ok: false, error: '...' }.
//
// GET /telegram/setup?key=<TELEGRAM_WEBHOOK_SECRET> - registers the webhook
//   below with Telegram (once).
//
// POST /telegram - Telegram's webhook. A post in the channel that replies to
//   a "🆔 id" post is the answer to that message: it is added to
//   messages/{id}.replies in Firestore, and the visitor sees it in their
//   account.
//
// GET  /admin/messages - every site message with its replies, newest first.
// POST /admin/reply     - { messageId, text }: an answer from the editor's
//   "Повідомлення" section. Saved like one from the group, and written into
//   the message's Telegram post too (⚠️ -> ✅, "🤝 time · answer").
// POST /admin/delete    - { messageId }: the message goes - from Firestore
//   (so from the visitor's account too) and its post from the Telegram chat.
//   All three need "Authorization: Bearer <Firebase ID token>" of a signed-in
//   account whose e-mail is in ADMIN_EMAILS.
//
// Settings (Cloudflare dashboard -> the worker -> Settings -> Variables):
//   TELEGRAM_BOT_TOKEN        secret - the bot's token from @BotFather
//   TELEGRAM_CHAT_ID          secret - the private channel's id (-100...)
//   TELEGRAM_WEBHOOK_SECRET   secret - any long random string, also given to
//                                      Telegram's setWebhook (secret_token)
//   FIREBASE_SERVICE_ACCOUNT  secret - the Firebase service account key (the
//                                      whole JSON) - writes the replies
//   ADMIN_EMAILS              secret - comma-separated e-mails that may read
//                                      and answer messages from the editor
//   ALLOWED_ORIGINS           plain  - comma-separated sites allowed to post (wrangler.toml)

const MAX_BODY = 8 * 1024
const LIMITS = { name: 100, phone: 40, email: 120, date: 40, message: 3000 }
const LABELS = { name: '👤', phone: '📞', email: '✉️', date: '📅' }
const CONTACTS = { telegram: 'Telegram', viber: 'Viber', whatsapp: 'WhatsApp', email: 'Email' }
const MESSAGE_ID = /^[\w-]{8,64}$/
const TAG = /🆔\s*([\w-]{8,64})/
// A Firestore id (20 letters and digits) opening a post, maybe after 🆔 or #.
const LEADING_ID = /^(?:🆔|#)?\s*([A-Za-z\d]{20})(?![\w-])[\s:,.—-]*/u

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

// The status of a post, first thing in it: waiting for an answer (a signed-in
// visitor's - answered with the button), answered (appendToPost swaps it), or
// a guest's (answered by the contact they left, outside this bot).
// "✅" carries the same invisible U+FE0F as "⚠️": both are two characters
// long, so swapping one for the other moves none of the post's formatting.
const WAITING = '⚠️'
const ANSWERED = '✅️'
const GUEST = '📩'

// Kept short: the status, the language (the one to answer in) and the
// kind of form when it is not a plain message. The message's id is not
// shown - it travels in the post's "✍️ Відповісти" button (messageIdOf).
function telegramText (body, fields, contact, messageId) {
  const kind = clip(body.kind, 40)
  const head = [messageId ? WAITING : GUEST, clip(body.locale, 5).toUpperCase(), kind && kind !== 'message' ? escape(kind) : '']
  const lines = [head.filter(Boolean).join(' ')]
  for (const [key, icon] of Object.entries(LABELS)) {
    if (fields[key]) {
      lines.push(`${icon} ${escape(fields[key])}`)
    }
  }
  if (contact) {
    lines.push(`💬 ${CONTACTS[contact.via]}: ${escape(contact.value)}`)
  }
  const rating = Number(body.fields?.rating)
  if (rating >= 1 && rating <= 5) {
    lines.push('⭐'.repeat(Math.round(rating)))
  }
  if (fields.message) {
    lines.push('', escape(fields.message))
  }
  return lines.join('\n')
}

// The site message a post is about: from its "✍️ Відповісти" button, or -
// in posts sent before the id moved there - from its "🆔 id" line.
function messageIdOf (post) {
  const button = post?.reply_markup?.inline_keyboard?.flat().find(item => item.callback_data?.startsWith('r|'))
  const id = button ? button.callback_data.slice(2) : TAG.exec(post?.text || post?.caption || '')?.[1]
  return id && MESSAGE_ID.test(id) ? id : undefined
}

// ---- Firestore, with the service account (bypasses the security rules) ----

let googleToken = { value: '', expires: 0 }

function base64url (data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let text = ''
  for (const byte of bytes) {
    text += String.fromCodePoint(byte)
  }
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function accessToken (account) {
  if (googleToken.value && Date.now() < googleToken.expires) {
    return googleToken.value
  }
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), char => char.codePointAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${base64url(signature)}` }),
  })
  const answer = await response.json()
  if (!answer.access_token) {
    throw new Error(`google token: ${answer.error || response.status}`)
  }
  googleToken = { value: answer.access_token, expires: Date.now() + 50 * 60 * 1000 }
  return googleToken.value
}

async function addReply (env, messageId, text) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const token = await accessToken(account)
  const root = `projects/${account.project_id}/databases/(default)/documents`
  const response = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      writes: [{
        transform: {
          document: `${root}/messages/${messageId}`,
          fieldTransforms: [
            { fieldPath: 'replies', appendMissingElements: { values: [{ mapValue: { fields: {
              text: { stringValue: text },
              at: { timestampValue: new Date().toISOString() },
            } } }] } },
            { fieldPath: 'repliedAt', setToServerValue: 'REQUEST_TIME' },
          ],
        },
        // Only to a message that is there - a mistyped id adds nothing.
        currentDocument: { exists: true },
      }],
    }),
  })
  if (!response.ok) {
    throw new Error(`firestore: ${response.status} ${(await response.text()).slice(0, 200)}`)
  }
}

// Which message an admin is answering right now: set by "✍️ Відповісти",
// taken by their next message in the group (answering/{telegram user id}).
// Kept in Firestore, not in the worker's memory, which a next request may
// not share. The site's rules give visitors no access to it.
const ANSWERING_MS = 15 * 60 * 1000

async function firestoreDocument (env, path, init = {}) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const token = await accessToken(account)
  return fetch(`https://firestore.googleapis.com/v1/projects/${account.project_id}/databases/(default)/documents/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
}

async function setAnswering (env, userId, { messageId, promptId, post }) {
  await firestoreDocument(env, `answering/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: {
      messageId: { stringValue: messageId },
      promptId: { integerValue: String(promptId || 0) },
      // The post the answer is for, as it stands - the answer is written
      // into it (appendToPost); Telegram has no "get message".
      post: { stringValue: JSON.stringify(threadOf(post)) },
      at: { integerValue: String(Date.now()) },
    } }),
  })
}

// What an answer needs of the post it is for: where it is, who it is from,
// and its text with formatting and buttons, to be written again with the
// answer below.
function threadOf (post) {
  return post
    ? { postId: post.message_id, who: whoOf(post.text), text: post.text || '', entities: post.entities || [], markup: post.reply_markup || null }
    : null
}

// "Тест Персонаж · test@example.com" - who a message from the site is from,
// read off its post (telegramText).
function whoOf (postText) {
  const name = /👤\s*(.+)/.exec(postText || '')?.[1]?.trim()
  const email = /✉️\s*(.+)/.exec(postText || '')?.[1]?.trim()
  return [name, email].filter(Boolean).join(' · ')
}

// A site message's Telegram post, kept with the message
// (messages/{id}.telegramPost): where it is and its text as it stands, so an
// answer from the editor can be written into it as well. Updated each time
// an answer is written in.
async function keepPost (env, messageId, chatId, thread) {
  if (!messageId || !thread?.postId) {
    return
  }
  await firestoreDocument(env, `messages/${messageId}?updateMask.fieldPaths=telegramPost&currentDocument.exists=true`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { telegramPost: { stringValue: JSON.stringify({ chatId, ...thread }) } } }),
  }).catch(error => console.error('post not kept:', String(error)))
}

async function keptPost (env, messageId) {
  const response = await firestoreDocument(env, `messages/${messageId}?mask.fieldPaths=telegramPost`)
  if (!response.ok) {
    return null
  }
  try {
    return JSON.parse((await response.json()).fields?.telegramPost?.stringValue || 'null')
  } catch {
    return null
  }
}

// The state, removed as it is read: one answer per button press.
async function takeAnswering (env, userId) {
  const response = await firestoreDocument(env, `answering/${userId}`)
  if (!response.ok) {
    return null
  }
  const fields = (await response.json()).fields || {}
  await firestoreDocument(env, `answering/${userId}`, { method: 'DELETE' })
  const fresh = Date.now() - Number(fields.at?.integerValue || 0) < ANSWERING_MS
  const promptId = Number(fields.promptId?.integerValue) || 0
  let thread = null
  try {
    thread = JSON.parse(fields.post?.stringValue || 'null')
  } catch {
    thread = null
  }
  return fresh && fields.messageId?.stringValue
    ? { messageId: fields.messageId.stringValue, promptId, thread }
    : { messageId: '', promptId, thread: null }
}

async function telegram (env, method, payload) {
  return fetch(`https://api.telegram.org/bot${String(env.TELEGRAM_BOT_TOKEN).trim()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ---- POST /telegram: a reply in the channel ----

// Pasted into the dashboard, a secret easily picks up a space or a line
// break at an end.
function webhookSecret (env) {
  return String(env.TELEGRAM_WEBHOOK_SECRET || '').trim()
}

async function isAdmin (env, userId) {
  const answer = await telegram(env, 'getChatMember', { chat_id: channelId(env), user_id: userId }).then(r => r.json()).catch(() => ({}))
  return ['creator', 'administrator'].includes(answer?.result?.status)
}

function channelId (env) {
  return String(env.TELEGRAM_CHAT_ID).trim()
}

// Saves the answer, tells whoever wrote it, and shows it under the post in
// the channel so the thread is readable there too.
async function saveAnswer (env, messageId, text, { chatId, messageIdToReact, postId, react = true }) {
  try {
    await addReply(env, messageId, text.slice(0, 4000))
  } catch (error) {
    console.error('reply not saved:', String(error))
    await telegram(env, 'sendMessage', { chat_id: chatId, reply_parameters: { message_id: messageIdToReact, allow_sending_without_reply: true }, text: '⚠️ Відповідь не збереглася в кабінет — дивіться логи воркера.' })
    return
  }
  // 👍 only where nothing else shows the answer went through (in a group
  // the post itself shows it - ✅ and the answer in it).
  if (react) {
    await telegram(env, 'setMessageReaction', { chat_id: chatId, message_id: messageIdToReact, reaction: [{ type: 'emoji', emoji: '👍' }] })
  }
  if (postId && String(chatId) !== channelId(env)) {
    await telegram(env, 'sendMessage', { chat_id: channelId(env), reply_parameters: { message_id: postId, allow_sending_without_reply: true }, text: `✅ Відповідь надіслано:\n${text.slice(0, 3500)}` })
  }
}

// 1. "✍️ Відповісти" under a message: the bot asks for the answer. In a
//    group - right there, in the message's thread (the reply field opens by
//    itself, tied to this very message; the question is deleted once
//    answered). In a channel, where there is no reply field - in the admin's
//    private chat with the bot.
async function onAnswerButton (env, callback) {
  const messageId = callback.data.slice(2)
  if (!MESSAGE_ID.test(messageId) || !(await isAdmin(env, callback.from.id))) {
    await telegram(env, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'Відповідати можуть лише адміни.', show_alert: true })
    return
  }
  const chat = callback.message?.chat
  if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
    // An earlier, unused prompt of this admin goes.
    const previous = await takeAnswering(env, callback.from.id).catch(() => null)
    if (previous?.promptId) {
      await telegram(env, 'deleteMessage', { chat_id: chat.id, message_id: previous.promptId })
    }
    const name = /👤\s*(.+)/.exec(callback.message.text || '')?.[1]?.trim()
    const prompt = await telegram(env, 'sendMessage', {
      chat_id: chat.id,
      reply_parameters: { message_id: callback.message.message_id, allow_sending_without_reply: true },
      text: `✍️ Відповідь${name ? ` для ${name}` : ''}: просто напишіть наступне повідомлення в групу — воно піде як відповідь на це.\n🆔 ${messageId}`,
      reply_markup: { inline_keyboard: [[{ text: '✖ Скасувати', callback_data: 'x|' }]] },
    }).then(response => response.json()).catch(() => ({}))
    await setAnswering(env, callback.from.id, { messageId, promptId: prompt?.result?.message_id, post: callback.message })
    await telegram(env, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'Напишіть відповідь наступним повідомленням.' })
    return
  }
  const quoted = (callback.message?.text || '').split('\n').filter(line => !line.startsWith('🆔')).join('\n').slice(0, 600)
  const asked = await telegram(env, 'sendMessage', {
    chat_id: callback.from.id,
    text: `✍️ Відповідь на повідомлення:\n\n${quoted}\n\n🆔 ${messageId} · #${callback.message?.message_id ?? ''}\nНапишіть відповідь у відповідь на це повідомлення.`,
    reply_markup: { force_reply: true, input_field_placeholder: 'Ваша відповідь…' },
  })
  await telegram(env, 'answerCallbackQuery', asked.ok
    ? { callback_query_id: callback.id, text: 'Напишіть відповідь у чаті з ботом.' }
    // The bot may write first only to someone who has started it.
    : { callback_query_id: callback.id, text: 'Спершу відкрийте чат з ботом і натисніть «Start», потім спробуйте ще раз.', show_alert: true })
}

// 2. The admin's text in the private chat, answering the bot's request.
async function onPrivateAnswer (env, post, text) {
  const replied = post.reply_to_message
  const messageId = replied ? TAG.exec(replied.text || '')?.[1] : undefined
  if (!messageId || !(await isAdmin(env, post.from?.id))) {
    return
  }
  const postId = Number(/#(\d+)/.exec(replied.text || '')?.[1]) || undefined
  await saveAnswer(env, messageId, text, { chatId: post.chat.id, messageIdToReact: post.message_id, postId })
  await telegram(env, 'sendMessage', { chat_id: post.chat.id, text: '✅ Збережено — відповідь уже в особистому кабінеті.' })
}

// 3. In the chat itself - a channel, or a private group (where "Reply" works
//    in every Telegram app): a reply to the "🆔 id" post, or a new post that
//    starts with the id (copied by a tap on it). In a group only its admins
//    answer; a channel post has no author and only admins can post anyway.
async function onChannelAnswer (env, post, text) {
  if (post.from && !(await isAdmin(env, post.from.id))) {
    return
  }
  const replied = post.reply_to_message
  let messageId = replied ? messageIdOf(replied) : undefined
  let answer = text
  if (!messageId) {
    const leading = LEADING_ID.exec(text)
    if (leading) {
      messageId = leading[1]
      answer = text.slice(leading[0].length).trim()
    }
  }
  // The admin pressed "✍️ Відповісти" and now just writes: this message is
  // the answer to that one (whatever else has arrived meanwhile).
  let promptId = 0
  let thread = replied?.from?.is_bot && messageId && !(replied.text || '').startsWith('✍️') ? threadOf(replied) : null
  if (post.from && (!messageId || replied?.from?.is_bot)) {
    const answering = await takeAnswering(env, post.from.id).catch(() => null)
    promptId = answering?.promptId || 0
    if (!messageId && answering?.messageId) {
      messageId = answering.messageId
      thread = answering.thread
    }
  }
  if (messageId && answer) {
    const shownId = await showInThread(env, post, thread, answer, messageId)
    await saveAnswer(env, messageId, answer, { chatId: post.chat.id, messageIdToReact: shownId || post.message_id, react: !shownId })
    if (shownId) {
      await telegram(env, 'deleteMessage', { chat_id: post.chat.id, message_id: post.message_id })
    }
  }
  // The bot's "✍️ …" prompt has done its job.
  if (promptId) {
    await telegram(env, 'deleteMessage', { chat_id: post.chat.id, message_id: promptId })
  }
}

// In a group: the answer is shown again as one message in the original's
// thread - the original quoted above it, a header saying whom it is for - and
// the admin's plain copy goes, so the chat reads as "message -> answer"
// whatever arrived in between. The id of that message, or 0 (a channel, or no
// original to point at).
async function showInThread (env, post, thread, answer, messageId) {
  const group = post.chat.type === 'group' || post.chat.type === 'supergroup'
  if (!group || !thread?.postId) {
    return 0
  }
  if (await appendToPost(env, post.chat.id, thread, answer, messageId)) {
    return thread.postId
  }
  return repostAnswer(env, post.chat.id, thread, answer)
}

// The answer as its own message under the post - when it no longer fits
// into the post. Its id, or 0.
async function repostAnswer (env, chatId, thread, answer) {
  const shown = await telegram(env, 'sendMessage', {
    chat_id: chatId,
    reply_parameters: { message_id: thread.postId, allow_sending_without_reply: true },
    text: `🤝 Відповідь${thread.who ? ` для ${thread.who}` : ''}\n\n${answer}`,
    link_preview_options: { is_disabled: true },
  }).then(response => response.json()).catch(() => ({}))
  return shown?.result?.message_id || 0
}

// The answer written into the post itself, each one a paragraph after 🤝:
// question and answers stay one message, and its "⚠️" turns "✅". Its own
// formatting and the button are kept (the swap keeps the length, the answer
// is plain text added at the end - the formatting's offsets hold).
// False when it doesn't fit Telegram's 4096 characters, or the edit failed.
async function appendToPost (env, chatId, thread, answer, messageId) {
  if (!thread.text) {
    return false
  }
  const time = new Date().toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' })
  const status = thread.text.startsWith(WAITING) ? ANSWERED + thread.text.slice(WAITING.length) : thread.text
  const text = `${status}\n\n🤝 ${time} · ${answer}`
  if (text.length > 4096) {
    return false
  }
  const edited = await telegram(env, 'editMessageText', {
    chat_id: chatId,
    message_id: thread.postId,
    text,
    entities: thread.entities,
    link_preview_options: { is_disabled: true },
    ...(thread.markup ? { reply_markup: thread.markup } : {}),
  }).then(response => response.json()).catch(() => ({}))
  if (edited?.ok !== true) {
    return false
  }
  await keepPost(env, messageId, chatId, { ...thread, text })
  return true
}

// "✖ Скасувати" under the prompt: no answer after all.
async function onCancelButton (env, callback) {
  await takeAnswering(env, callback.from.id).catch(() => null)
  if (callback.message) {
    await telegram(env, 'deleteMessage', { chat_id: callback.message.chat.id, message_id: callback.message.message_id })
  }
  await telegram(env, 'answerCallbackQuery', { callback_query_id: callback.id, text: 'Скасовано.' })
}

async function onTelegram (request, env) {
  if (!webhookSecret(env) || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret(env)) {
    return new Response('forbidden', { status: 403 })
  }
  // Telegram retries anything but a 200 - an update this worker has no use
  // for is still "done".
  const update = await request.json().catch(() => ({}))
  if (update.callback_query?.data?.startsWith('r|')) {
    await onAnswerButton(env, update.callback_query)
    return new Response('ok')
  }
  if (update.callback_query?.data === 'x|') {
    await onCancelButton(env, update.callback_query)
    return new Response('ok')
  }
  const post = update.channel_post || update.message
  const text = (post?.text || post?.caption || '').trim()
  if (post && text && post.chat?.type === 'private') {
    await onPrivateAnswer(env, post, text)
  } else if (post && text && String(post.chat?.id) === channelId(env)) {
    await onChannelAnswer(env, post, text)
  }
  return new Response('ok')
}

// ---- POST /: a filled-in form ----

async function onForm (request, env, cors) {
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
  const via = body.fields?.contact?.via
  const contactValue = clip(body.fields?.contact?.value, 120)
  const contact = CONTACTS[via] && contactValue ? { via, value: contactValue } : null
  const messageId = typeof body.messageId === 'string' && MESSAGE_ID.test(body.messageId) ? body.messageId : ''
  if (!fields.message && !fields.phone && !fields.email && !contact) {
    return reply({ ok: false, error: 'empty' }, 400, cors)
  }

  const sent = await telegram(env, 'sendMessage', {
    chat_id: String(env.TELEGRAM_CHAT_ID).trim(),
    text: telegramText(body, fields, contact, messageId),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    // A signed-in visitor's message: answered with this button, so the
    // answer is always tied to this very message (onAnswerButton).
    ...(messageId ? { reply_markup: { inline_keyboard: [[{ text: '✍️ Відповісти', callback_data: `r|${messageId}` }]] } } : {}),
  })
  if (!sent.ok) {
    // Telegram's own reason ("chat not found", "Unauthorized", "bot is not
    // a member...") - no token or message text in it, and it is what tells
    // a misconfigured channel from a wrong token. Also in the worker's logs.
    const reason = await sent.json().then(answer => answer?.description || '').catch(() => '')
    console.error('telegram:', sent.status, reason)
    return reply({ ok: false, error: 'telegram', detail: reason }, 502, cors)
  }
  if (messageId) {
    const posted = await sent.json().then(answer => answer?.result).catch(() => null)
    if (posted) {
      await keepPost(env, messageId, posted.chat.id, threadOf(posted))
    }
  }
  return reply({ ok: true }, 200, cors)
}

// ---- /admin/*: the editor's "Повідомлення" section ----

// Firebase signs its ID tokens with these keys (rotated every few hours).
const FIREBASE_KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
let firebaseKeys = { keys: [], expires: 0 }

async function signingKeys () {
  if (Date.now() < firebaseKeys.expires) {
    return firebaseKeys.keys
  }
  const response = await fetch(FIREBASE_KEYS)
  const { keys = [] } = await response.json()
  const age = Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control') || '')?.[1]) || 3600
  firebaseKeys = { keys, expires: Date.now() + age * 1000 }
  return keys
}

function fromBase64url (part) {
  return Uint8Array.from(atob(part.replaceAll('-', '+').replaceAll('_', '/')), char => char.codePointAt(0))
}

function jsonPart (part) {
  return JSON.parse(new TextDecoder().decode(fromBase64url(part)))
}

// Who calls: the e-mail of a valid Firebase ID token of this project ('' -
// no token, or not a valid one), and whether it is one of ADMIN_EMAILS.
async function callerOf (request, env) {
  const token = /^Bearer\s+(\S+)$/.exec(request.headers.get('Authorization') || '')?.[1] || ''
  const [head, body, signature] = token.split('.')
  if (!signature) {
    return { email: '', admin: false }
  }
  try {
    const header = jsonPart(head)
    const claims = jsonPart(body)
    const project = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT).project_id
    const now = Date.now() / 1000
    const fresh = claims.exp > now && claims.iat <= now + 300
    if (header.alg !== 'RS256' || claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}` || !fresh) {
      return { email: '', admin: false }
    }
    const jwk = (await signingKeys()).find(key => key.kid === header.kid)
    const key = jwk && await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const valid = key && await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromBase64url(signature), new TextEncoder().encode(`${head}.${body}`))
    if (!valid) {
      return { email: '', admin: false }
    }
    const email = String(claims.email || '').toLowerCase()
    const admins = String(env.ADMIN_EMAILS || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
    return { email, admin: Boolean(email) && claims.email_verified === true && admins.includes(email) }
  } catch {
    return { email: '', admin: false }
  }
}

// A Firestore REST value as plain JSON.
function plain (value) {
  if (!value || 'nullValue' in value) {
    return null
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(item => plain(item))
  }
  if ('mapValue' in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, plain(item)]))
  }
  if ('integerValue' in value) {
    return Number(value.integerValue)
  }
  return value.stringValue ?? value.timestampValue ?? value.doubleValue ?? value.booleanValue ?? null
}

async function listMessages (env) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const token = await accessToken(account)
  const root = `projects/${account.project_id}/databases/(default)/documents`
  const response = await fetch(`https://firestore.googleapis.com/v1/${root}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'messages' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 300,
    } }),
  })
  if (!response.ok) {
    throw new Error(`firestore: ${response.status} ${(await response.text()).slice(0, 200)}`)
  }
  const rows = await response.json()
  return rows.filter(row => row.document).map(({ document }) => {
    const data = plain({ mapValue: { fields: document.fields } })
    return {
      id: document.name.split('/').pop(),
      name: data.name || '',
      email: data.email || '',
      contact: data.contact || null,
      kind: data.kind || 'message',
      text: data.text || '',
      page: data.page || '',
      locale: data.locale || '',
      createdAt: data.createdAt || document.createTime,
      replies: (data.replies || []).map(item => ({ text: item?.text || '', at: item?.at || '' })),
    }
  })
}

// An answer from the editor: saved, and written into the Telegram post
// (or under it) - when the post is known; messages sent before the post was
// kept with them are answered in the account only.
async function answerFromEditor (env, body) {
  const messageId = typeof body.messageId === 'string' && MESSAGE_ID.test(body.messageId) ? body.messageId : ''
  const text = clip(body.text, 4000)
  if (!messageId || !text) {
    return { status: 400, answer: { ok: false, error: 'empty' } }
  }
  await addReply(env, messageId, text)
  const post = await keptPost(env, messageId).catch(() => null)
  let inTelegram = false
  if (post?.postId && post.chatId) {
    inTelegram = await appendToPost(env, post.chatId, post, text, messageId) || Boolean(await repostAnswer(env, post.chatId, post, text))
  }
  return { status: 200, answer: { ok: true, reply: { text, at: new Date().toISOString() }, telegram: inTelegram } }
}

// A message removed from the editor: from Firestore and from the chat.
async function deleteFromEditor (env, body) {
  const messageId = typeof body.messageId === 'string' && MESSAGE_ID.test(body.messageId) ? body.messageId : ''
  if (!messageId) {
    return { status: 400, answer: { ok: false, error: 'empty' } }
  }
  const post = await keptPost(env, messageId).catch(() => null)
  const response = await firestoreDocument(env, `messages/${messageId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`firestore: ${response.status} ${(await response.text()).slice(0, 200)}`)
  }
  if (post?.postId && post.chatId) {
    await telegram(env, 'deleteMessage', { chat_id: post.chatId, message_id: post.postId }).catch(() => null)
  }
  return { status: 200, answer: { ok: true, telegram: Boolean(post?.postId) } }
}

async function onAdmin (request, env, cors, path) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return reply({ ok: false, error: 'not-configured' }, 503, cors)
  }
  const caller = await callerOf(request, env)
  if (!caller.email) {
    return reply({ ok: false, error: 'sign-in' }, 401, cors)
  }
  if (!caller.admin) {
    return reply({ ok: false, error: 'not-admin' }, 403, cors)
  }
  try {
    if (path === '/admin/messages' && request.method === 'GET') {
      return reply({ ok: true, messages: await listMessages(env) }, 200, cors)
    }
    if (path === '/admin/reply' && request.method === 'POST') {
      const { status, answer } = await answerFromEditor(env, await request.json().catch(() => ({})))
      return reply(answer, status, cors)
    }
    if (path === '/admin/delete' && request.method === 'POST') {
      const { status, answer } = await deleteFromEditor(env, await request.json().catch(() => ({})))
      return reply(answer, status, cors)
    }
  } catch (error) {
    console.error('admin:', String(error))
    return reply({ ok: false, error: 'server' }, 502, cors)
  }
  return reply({ ok: false, error: 'not-found' }, 404, cors)
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    // One-off: tells Telegram to send the channel's posts here. Opened by
    // hand (or by a script) with the webhook secret as ?key=.
    if (url.pathname === '/telegram/setup') {
      if (!webhookSecret(env) || (url.searchParams.get('key') || '').trim() !== webhookSecret(env)) {
        return new Response('forbidden', { status: 403 })
      }
      const answer = await telegram(env, 'setWebhook', {
        url: `${url.origin}/telegram`,
        secret_token: webhookSecret(env),
        allowed_updates: ['channel_post', 'message', 'callback_query'],
      })
      // And what Telegram now has, to check the list of updates.
      const info = await telegram(env, 'getWebhookInfo', {}).then(r => r.json()).catch(() => ({}))
      return Response.json({ set: await answer.json(), allowed_updates: info?.result?.allowed_updates, last_error: info?.result?.last_error_message })
    }
    if (url.pathname === '/telegram') {
      return request.method === 'POST' ? onTelegram(request, env) : new Response('method', { status: 405 })
    }

    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean)
    const known = allowed.includes(origin)
    const cors = known ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: known ? 204 : 403,
        headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' },
      })
    }
    if (url.pathname.startsWith('/admin/')) {
      return known ? onAdmin(request, env, cors, url.pathname) : reply({ ok: false, error: 'origin' }, 403, cors)
    }
    if (request.method !== 'POST') {
      return reply({ ok: false, error: 'method' }, 405, cors)
    }
    if (!known) {
      return reply({ ok: false, error: 'origin' }, 403, cors)
    }
    return onForm(request, env, cors)
  },
}
