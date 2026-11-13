# feedback-telegram

The Pagewright demo's own relay between the site's feedback forms and a
private Telegram channel — and back. A Cloudflare Worker, deployed on its own
(`npx wrangler deploy` in this folder). Not part of the editor or the site: the
site only knows its address (`content/settings/global.json` →
`feedback.endpoint`), and a client's site points that at its own API.

## How it works

1. A visitor sends a form. A signed-in one's message is first saved in
   Firestore (`messages/{id}`, by the site itself), then posted to the channel
   with `🆔 id` at the end. A guest's goes to the channel only.
2. In the channel, **reply** to that post. Telegram sends the reply to
   `POST /telegram`; the worker adds it to `messages/{id}.replies` and puts 👍
   under your reply. A ⚠️ under it means it was not saved (see the logs).
3. The visitor sees the reply in their account (`/site/account`) at once.

## Settings (Cloudflare → the worker → Settings → Variables and Secrets)

| Name | Type | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Secret | the bot's token from @BotFather |
| `TELEGRAM_CHAT_ID` | Secret | the channel's id, `-100…` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret | any long random string |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | the whole JSON of a Firebase service account key |
| `ADMIN_EMAILS` | Secret | comma-separated Google e-mails allowed into the editor's «Повідомлення» section (`/admin/*`) |
| `ALLOWED_ORIGINS` | Text | from `wrangler.toml` — the sites allowed to post |

After `TELEGRAM_WEBHOOK_SECRET` is set, register the webhook once by opening
`https://pagewright-feedback.garevna-dev.workers.dev/telegram/setup?key=<that string>`
(answer: `{"ok":true,...}`).

## Firestore

Build → Firestore Database → Create database (production mode). Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // A visitor's messages: created and read only by the visitor. Replies are
    // written by the worker with the service account, which skips the rules.
    match /messages/{id} {
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['uid', 'name', 'email', 'contact', 'kind', 'text', 'page', 'locale', 'createdAt', 'replies'])
        && request.resource.data.text is string && request.resource.data.text.size() <= 3000
        && request.resource.data.replies.size() == 0;
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
    }
  }
}
```

The service account key: Project settings → Service accounts → Generate new
private key. Paste the whole file's content as `FIREBASE_SERVICE_ACCOUNT`, then
delete the downloaded file. Never commit it.

## Секреты

Какие именно нужны — видно в `secrets.example.json` рядом. Значений там нет:
это опись, а не хранилище.

Реальные значения держатся **вне репозитория** — в менеджере паролей. Чтобы
залить их в Cloudflare, скопируй опись в `secrets.json`, впиши значения и
выполни:

```
npx wrangler secret bulk secrets.json
```

Одна команда вместо десяти `secret put`, и — главное — при переезде на другой
аккаунт не приходится вспоминать, что вообще требовалось. `secrets.json` в
`.gitignore`; после заливки его можно удалить, значения остаются в менеджере
паролей.

Прочитать секрет обратно из Cloudflare **нельзя** — они пишутся в одну
сторону. Если значение потерялось, его берут из источника: токен бота у
@BotFather, ключ сервис-аккаунта в консоли Firebase, id канала у @getidsbot,
секрет вебхука придумывается новый.
