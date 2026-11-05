# ai-agent

Pagewright's AI assistant: a Cloudflare Worker in front of Workers AI, with a
daily ceiling it refuses to cross. Deployed on its own (`npx wrangler deploy`
in this folder). Not part of the editor or the site — they know one address
(`content/settings/global.json` → `ai.endpoint`).

**Workers AI is reached through a binding, so there is no API key anywhere**:
nothing to leak, nothing to rotate, nothing to put in a repository by mistake.
Usage is billed to the Cloudflare account the worker is deployed on — which is
why a client gets their own copy on their own account rather than a key to
ours.

## The ceiling

A free Cloudflare account gets **10,000 Neurons a day**, reset at 00:00 UTC;
past it a free plan is blocked rather than billed, and a paid plan is charged
$0.011 per 1,000. This worker stops before any of that:

| Ceiling | Default | What it stops |
|---|---|---|
| `DAILY_REQUESTS` | 250 | the exact one — a call is a call |
| `DAILY_NEURONS` | 7,000 | an estimate with a margin, under the real 10,000 |
| `VISITOR_REQUESTS` | 12 | one address finishing the day for everyone else |

Over any of them the worker answers **429** with `error: 'daily-limit'` (or
`'visitor-limit'`) and `resetsAt` — the next UTC midnight, as an ISO string.
That is what the editor's popup shows. A refusal never reaches Workers AI, so
being hammered costs nothing.

`GET /budget` returns the day so far without spending any of it, for a panel
that wants to show how much is left.

Why the Neuron figure is an estimate: Workers AI reports token usage for most
models but not all, and the token→Neuron rate is per model. The worker charges
itself the larger of the measured figure and a per-task estimate, and the
3,000-Neuron gap under the real allocation is the margin for being wrong (and
for KV being eventually consistent — see `spend()` in `src/index.js`). Watch a
day of real numbers in the dashboard, then tune `NEURONS_PER_1K` and the
`ESTIMATE` table. Never tune them upward first.

## What it will and will not do

Six tasks, each a fixed instruction plus the caller's text:
`translate`, `rewrite`, `seo`, `alt`, `reply`, `page`.

There is no `model` field and no `prompt` field, on purpose. A caller picks a
task from the list and sends text; it cannot ask this worker to run arbitrary
inference. Without that, an endpoint on a public site is a free LLM for
whoever finds it. The caller's text is always the user turn and is never
pasted into the instruction, so a block of site copy that happens to read like
an order is content to be worked on, not a new instruction.

## Deploying it (ours)

1. `npx wrangler kv namespace create BUDGET` — put the id it prints into
   `wrangler.toml` under `[[kv_namespaces]]`. The id is not a secret; it
   belongs in the config, which is why Cloudflare prints it ready to paste.
2. Check the model against **what the account has** — `npx wrangler ai models`,
   not the documentation. A wrong id is not an error at deploy time: it
   deploys happily and then every call answers `502 upstream` in about 60 ms,
   too fast to have been a model. Two ids failed that way on 5 Nov 2026 —
   `@cf/meta/llama-3.1-8b-instruct` (absent, only `-fp8` exists) and
   `@cf/utter-project/eurollm-9b-it` (listed, answers with an error).
3. `npx wrangler deploy` — **from this folder**. Run from the repository root
   it finds no config and builds the wrong thing.
4. Point `content/settings/global.json` → `ai.endpoint` at the deployed
   address. **Leave it empty to keep the assistant switched off**, which is
   what the public demo ships with: the editor still draws the buttons, and
   each one opens the panel with the worked example instead of calling
   anything.
5. Check it: `curl -H "Origin: https://garevna.github.io" https://pagewright-ai.<subdomain>.workers.dev/budget`

## Setting it up for a client

Everything below is on **the client's own Cloudflare account**, so their usage
is theirs, their ceiling is theirs, and nothing of theirs passes through us.
Twenty minutes, most of it waiting for them to click "accept".

On our side:

1. They add us to their Cloudflare account (Members → Invite, role
   **Workers Admin** is enough; not Super Administrator).
2. `npx wrangler deploy` into their account, with `ALLOWED_ORIGINS` set to
   their domain and nothing else.
3. Create their `BUDGET` namespace, set their ceilings — from what they said
   they want to spend, not from our defaults.
4. Set `ai.endpoint` in their site's settings, switch on the tasks they paid
   for.
5. Send them the note below, and a budget they can read.

What to ask the client for, in one message:

> To switch the assistant on I need two things from you.
>
> **1. A Cloudflare account.** Free, no card needed:
> <https://dash.cloudflare.com/sign-up>. When it exists, go to **Manage
> Account → Members → Invite**, invite `<our e-mail>` with the role **Workers
> Admin**, and tell me when it is done. That role lets me deploy and nothing
> else: it cannot see your mail, your domains or your billing.
>
> **2. A daily ceiling.** The assistant stops when the day's budget is spent
> and starts again the next morning — it cannot run up a bill you did not
> agree to. The free allowance is enough for roughly 200–250 pieces of work a
> day (a translated page, a rewritten block, a draft reply). If that is
> enough, we stay on it and you pay nothing for the AI itself. If you want
> more, Cloudflare's own price is about $0.01 per 1,000 Neurons and you add a
> card to your own account — the money goes to them, not through me.
>
> You can switch it off at any time, from your own dashboard, without me.
>
> What you do **not** need to send me: an API key, a password, or a card.

If they would rather not have a Cloudflare account at all, the fallback is our
account with a per-client ceiling and the cost in their monthly fee. It is
simpler for them and worse for us: their data passes through our account, and
in the EU that makes us a processor of it — which wants a data-processing
agreement before, not after. Quote it higher, and say why.

## Turning it off

Set `ai.endpoint` to an empty string. The editor goes back to the locked
state — buttons present, each one opening its worked example — without a
deploy and without touching the worker. Delete the worker only when the client
has gone.
