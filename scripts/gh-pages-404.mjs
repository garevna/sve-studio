// GitHub Pages serves static files only: a deep link such as
// /sve-studio/site/en/about-company has no file of its own and gets 404.html.
// This writes a 404.html that sends the visitor to the right app (the site
// under <root>site/, the editor at <root>) with the rest of the address in
// ?__sve_path=, which the app puts back before its router starts (see the
// head script in both nuxt.config.ts files). Also adds .nojekyll, without
// which GitHub Pages hides the _nuxt/ and _seed/ folders.
//
// node scripts/gh-pages-404.mjs <output dir> <root, e.g. /sve-studio/>
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [out = '.output/public', root = '/'] = process.argv.slice(2)

const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>Site Visual Editor</title>
<script>
  (function () {
    var root = ${JSON.stringify(root)}
    var inside = location.pathname.indexOf(root) === 0 ? location.pathname.slice(root.length) : ''
    var app = inside === 'site' || inside.indexOf('site/') === 0 ? root + 'site/' : root
    var rest = location.pathname.slice(app.length) + location.search + location.hash
    location.replace(app + '?__sve_path=' + encodeURIComponent(rest))
  })()
</script>
</head>
<body></body>
</html>
`
writeFileSync(join(out, '404.html'), html)
writeFileSync(join(out, '.nojekyll'), '')
console.log(`404.html and .nojekyll written to ${out} (root ${root})`)
