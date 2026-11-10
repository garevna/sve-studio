# Pagewright

**English** | [Українська](README.uk.md)

**Live demo:** <https://pagewright.pp.ua/> - the editor; the site it builds is at <https://pagewright.pp.ua/site/>. Everything you change stays in your own browser. The same demo also runs on GitHub Pages: <https://garevna.github.io/sve-studio/>.

A visual editor for multilingual websites: pages are assembled from ready-made blocks, edited in place and published - without touching code.

- **Blocks, edited one at a time.** Every block looks exactly as on the site; a click opens it for editing. Hide, move or delete it from its menu.
- **Block gallery.** New blocks are picked from live previews in the site's own colours and fonts, and land exactly where the "+" was clicked.
- **Page structure.** The whole page as a list: drag to reorder, hide and show, jump to a block.
- **Several languages.** Every text, page name and menu item in each language of the site.
- **One name per page.** The menu shows the page's own name; rename the page and the menu follows.
- **The site's look.** Palette, UI kit, fonts, header and footer layouts, the site's own stylesheets.
- **The editor's look.** A choice of colour schemes for the editor itself, so it never blends into the site being edited.
- **Works on a phone.** Tools move to a bottom dock, panels slide up from the bottom.

The demo keeps everything you do in your own browser: nothing you build is stored on a server.

## Running locally

Node 24 (see `.node-version`; with [fnm](https://github.com/Schniz/fnm): `fnm use`) and pnpm.

```sh
pnpm install
pnpm dev
```

The editor opens at <http://localhost:3006>, the site it edits at <http://localhost:3006/site/>.

## Demo content

The demo site is filled with sample content. Cartoon characters in its icons are © their respective owners, used for illustration only, with no affiliation - see [content/CREDITS.md](content/CREDITS.md).

## License

**This is not open-source software.** © 2026 Irina Fylyppova. All rights reserved.

The code is published for evaluation only. Using it for any commercial or production purpose - including setting it up for a client, connecting it to a client's API, or hosting sites built with it - requires a written license from the author. See [LICENSE](LICENSE) for the full terms.

Licensing and permissions: **Irina Fylyppova** - Telegram / Viber / WhatsApp: +380 99 491 27 53 · GitHub: [garevna](https://github.com/garevna)

