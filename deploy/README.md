# Deploy targets

One static build per address (.github/workflows/deploy.yml):

| Folder | Address | Root |
| --- | --- | --- |
| `github-pages/` | https://garevna.github.io/sve-studio/ | `/sve-studio/` |
| `cloudflare/` | https://pagewright.pp.ua/ | `/` |

`<target>/public/` holds files only that address gets, copied over the
build: Google Search Console's verification file is a different one for
each address.

`cloudflare/` also has the Worker (`worker.js`, `wrangler.jsonc`): files
are served by Cloudflare as they are; an address with no file of its own
(a page) gets its app's start page with status 200.

Repository settings the Cloudflare job needs (Settings > Secrets and
variables > Actions):

- variable `CLOUDFLARE_ACCOUNT_ID` - without it the job is skipped;
- secret `CLOUDFLARE_API_TOKEN` - a token with "Edit Cloudflare Workers"
  rights.
