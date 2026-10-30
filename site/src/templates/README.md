# Dynamic page templates

This is the system that renders dynamic content of pages from JSON files instead of hand-written Vue templates. If you're building or editing a page, you're editing a JSON file under `public/files/dynamic-pages/*.json` — you shouldn't need to touch any `.vue` file in here.

This doc exists so you don't have to re-read the component source every time you forget which field does what.

## Table of contents

- [How a page loads](#how-a-page-loads)
- [Creating a new page](#creating-a-new-page)
- [Page-level JSON fields](#page-level-json-fields)
- [Block dispatch: section vs float vs everything else](#block-dispatch-section-vs-float-vs-everything-else)
- [Spacing between blocks is automatic](#spacing-between-blocks-is-automatic--dont-hand-set-it)
- [Layout blocks](#layout-blocks)
  - [`section` — two-column layout](#section--two-column-layout-templatenestedsectionvue)
  - [`float` — flexible row of N children](#float--flexible-row-of-n-children-templateflexsectionvue)
- [Content block types](#content-block-types)
- [`TranslatedModel` (i18n content)](#translatedmodel-i18n-content)
- [Mobile reordering (`switchOrder`)](#mobile-reordering-switchorder)
- [The `parallax` block is special](#the-parallax-block-is-special)
- [Gotchas / footguns](#gotchas--footguns)
- [Full field reference](#full-field-reference)

## How a page loads

```
/:pageId  (router.ts)
  → DynamicPageTemplate.vue
      fetches public/files/dynamic-pages/{pageId}.json  (via getDynamicPageContent)
      stores it in commonStore.dynamicPageContent
      renders <DynamicPageBlockTemplate :index="n" /> for each top-level block
          → decides section / float / plain, see below
              → TemplateItem.vue  (per-child dispatcher, picks the actual component)
```

`getDynamicPageContent(pageId)` also pulls out any top-level block with `"type": "parallax"` and stores it separately — see [The `parallax` block is special](#the-parallax-block-is-special).

## Creating a new page

1. Add `public/files/dynamic-pages/{your-page-id}.json`. The filename **is** the `pageId`.
2. Fill in the top-level fields (see below) and a `blocks` array.
3. Navigate to `/{your-page-id}` in dev, or use `gotoRoute('dynamic-page', { pageId: 'your-page-id' })` / `getDynamicPageContent('your-page-id')` from code.
4. No route registration needed — `/:pageId` is a catch-all (`src/router/routes.ts`).

## Page-level JSON fields

```json
{
  "id": "bus-park",
  "breadcrumbs": false,
  "backButton": false,
  "blocks": [ ]
}
```

| Field | Type | Status |
|---|---|---|
| `id` | `string` | cosmetic, matches filename by convention |
| `blocks` | array of blocks | **required**, see below |
| `breadcrumbs` | `boolean` | ⚠️ declared in the type, not actually read anywhere in the current code — don't rely on it |
| `backButton` | `boolean` | ⚠️ same — not read anywhere currently |
| `hero` | `boolean` | ⚠️ same — hero visibility is actually controlled by route name (`routesWithHeader` in `stores/navigation.ts`), not by page JSON |

If you need breadcrumbs/back-button/hero behavior for a given page, it currently comes from route-level config, not this file.

## Block dispatch: section vs float vs everything else

Every entry in `blocks` (and every `children` entry) goes through this decision, made in `DynamicPageBlockTemplate.vue` at the top level and `TemplateItem.vue` everywhere else:

- `"type": "section"` → **`TemplateNestedSection.vue`** — a rigid **two-column** left/right layout.
- `"type": "float"` → **`TemplateFlexSection.vue`** — a flex-wrap row that can hold any number of children, each with its own pixel width.
- anything else → **`TemplateItem.vue`**, which looks at `type` again and picks a concrete renderer (text, image, button, or one of the named components below).

A block can also carry:
- `"class"` — extra CSS class(es), merged in.
- `"id"` — element id (also used to build `#section-{index}` if you don't set one).
- `"background"` — wraps the block in `<div class="colored-block">` with that literal CSS value as background (e.g. `"var(--light-grey-2)"`, not just a color name — this one is used raw, unlike the `background` field on some inner components, see [Gotchas](#gotchas--footguns)).

## Spacing between blocks is automatic — don't hand-set it

`DynamicPageBlockTemplate.vue` applies `margin-bottom` to every **top-level** block for you (skipping the last block, and any `parallax` block, since neither needs trailing space). The amount comes from `commonStore.currentBlockSpacing`, which picks between two values in `global.json` based on `winSize` (same breakpoint as `mobileMode`, `≤ 600px`):

```json
"blockSpacing": {
  "desktop": 100,
  "mobile": 32
}
```

You do **not** need `"class": "mb-25"` / `"my-25"` / etc. on top-level blocks anymore just to get the standard gap — it happens automatically and adapts to screen size on its own. Only add a spacing class on a top-level block if you want something *other* than the default rhythm for that one spot (e.g. pulling two blocks closer together). This only covers **top-level** entries in `blocks` — spacing between `children` inside a `section`/`float`/etc. is still whatever you set by hand (`my-4`, `mt-n8`, ...), same as before.

## Layout blocks

### `section` — two-column layout (`TemplateNestedSection.vue`)

Takes **exactly 2 children** (a 3rd+ child is not really supported — see [Gotchas](#gotchas--footguns)) and lays them out side by side (`calc(50% - 20px)` each), stacking to full-width on mobile (`max-width: 960px`).

```json
{
  "type": "section",
  "class": "mt-16",
  "children": [
    { "type": "image", "content": { "uk": "/images/x/01.jpg", "en": "...", "de": "..." } },
    {
      "type": "section",
      "children": [
        { "type": "title", "content": { "uk": "Van Hool TDX", "en": "...", "de": "..." } },
        { "type": "text", "content": { "uk": "Автобус", "en": "...", "de": "..." } }
      ]
    }
  ]
}
```

Each child is wrapped in `.section-left` / `.section-right` automatically based on its position (index `0` = left, anything else = right). A child that is itself `"type": "section"` renders its own `children` directly, unwrapped (see the nested example above) — a child of any other type renders through `TemplateItem`.

### `float` — flexible row of N children (`TemplateFlexSection.vue`)

Takes **any number of children**, each rendered at a fixed pixel `width` (default `360`), wrapping via `flex-wrap` with a `16px` gap (`ga-4`).

```json
{
  "type": "float",
  "children": [
    { "type": "card", "width": 300, "title": { "uk": "...", "en": "...", "de": "..." }, "content": { "uk": "...", "en": "...", "de": "..." } },
    { "type": "card", "width": 300, "title": { "uk": "...", "en": "...", "de": "..." }, "content": { "uk": "...", "en": "...", "de": "..." } }
  ]
}
```

A child of this type can also be `{ "type": "section", "children": [...] }` (renders each grandchild stacked) or `{ "type": "component", "component": "SomeComponentName", "props": {...} }`.

## Content block types

These are handled by `TemplateItem.vue`. `type` is looked up in a fixed component map; everything not in the map falls through to a few hardcoded cases (`image`, `button`, `route`) or is ignored.

| `type` | Renders via | Notes |
|---|---|---|
| `header` | `TemplateText.vue` | `<h2>` |
| `title` | `TemplateText.vue` | `<h3>` |
| `text` | `TemplateText.vue` | `<p>`, `content` may be a `string[]` → renders one `<p>` per line |
| `image` | inline in `TemplateItem.vue` | `<v-img>`, path comes from `content` (per-locale!), not `image` |
| `button` | inline in `TemplateItem.vue` | see below |
| `route` | inline in `TemplateItem.vue` | plain clickable `<p>` that navigates |
| `component` | dynamic import from `src/components/template-components/{content}.vue` | generic escape hatch, see below |
| `card` | `TemplateCard.vue` (`componentNames.card`) | icon + title + content, 4 visual variants via `ver` |
| `cards` | `CardSet.vue` (`componentNames.cards`) | wraps `children` in a flex-wrap grid of `card`s |
| `carousel` | `SliderWithCards.vue` (`componentNames.carousel`) | auto-playing Swiper carousel of `card`s |
| `swiper` | `SliderWithThumbnails.vue` (`componentNames.swiper`) | photo gallery with thumbnail strip, uses `images`, not `children` |
| `slider-with-images` | `SliderWithImages.vue` | auto-playing Swiper of plain images, uses `images` |
| `baner` | `TemplateBaner.vue` (`componentNames.baner`) | big promo card w/ circular background image |
| `text-with-icon` | `TextWithIcon.vue` | icon (or image) + one line of text |
| `dark-fone-section` | `DarkFoneSection.vue` | colored section with title + icon grid of `children` |
| `hover-card` | `HoverTemplate.vue` | ⚠️ see [Gotchas](#gotchas--footguns) — currently non-functional through this path |
| `parallax-inside` | `TemplateParallax.vue` (`componentNames['parallax-inside']`) | same visual as the page-level `parallax` block, but renders **in place** wherever you put it — not hoisted, see below |

### `header` / `title` / `text`

```json
{ "type": "header", "content": { "uk": "Автопарк", "en": "Vehicle fleet", "de": "Fuhrpark" } }
{ "type": "text", "content": { "uk": ["line one", "line two"], "en": ["...", "..."], "de": ["...", "..."] } }
```
`content` can be a plain `TranslatedModel` string, **or** an array of strings per locale — each array item becomes its own `<p>`.

### `image`

```json
{ "type": "image", "content": { "uk": "/images/bus-park/image-01.jpg", "en": "...", "de": "..." } }
```
The image URL is per-locale and lives in `content`, **not** `image`. (`image` is a separate string-only field used by other components — see below.)

### `button`

```json
{ "type": "button", "content": { "uk": "Дізнатись більше", "en": "...", "de": "..." }, "route": "about-company", "class": "primary-button" }
```
Clicking it calls `getDynamicPageContent(route)` and navigates to `dynamic-page` with `params: { pageId: route }` — i.e. `route` here is a **page id**, not a Vue Router route name.

### `route`

```json
{ "type": "route", "route": "buyer", "content": { "uk": "Перейти", "en": "...", "de": "..." } }
```
Same idea but for navigating to a *named* Vue Router route (can also carry `params`, `query`, `hash`).

### `component` (generic escape hatch)

```json
{ "type": "component", "content": "FAQ", "props": { "someProp": "value" }, "class": "my-16" }
```
Loads `src/components/template-components/{content}.vue` and passes `props` through as-is via `v-bind`. Use this for anything bespoke that doesn't fit the generic block types. Existing components you can reference this way: `FAQ`, `FooterIcons`, `FooterVisaLogo`, `FeedbackCard`, `ClientMessage`, `WhyUs`, `ReadyToTravel`, `ImagesGridVer1`, `ImagesGridVer2`, `PopularDestinationsTheme1`, `PopularDestinationsTheme2`.

### `card` (`TemplateCard.vue`)

```json
{
  "type": "card",
  "ver": 1,
  "width": 310,
  "size": 90,
  "icon": "/icons/bus-park/01.svg",
  "title": { "uk": "Комфортні сидіння", "en": "...", "de": "..." },
  "content": { "uk": ["line 1", "line 2"], "en": ["...", "..."], "de": ["...", "..."] }
}
```
- `ver`: `1` | `2` | `21` | `3` | `4` — visual layout variant (icon position, borders, background). Default `2`.
- `icon`: passed to `IconVariant` — can be an icon name/path.
- `color` / `background`: color **names** (not `var(...)`) — resolved internally as `var(--{color})` / `var(--{background})`.
- `content` as a string array renders as a bulleted list (`• line`).

### `cards` (`CardSet.vue`)

```json
{
  "type": "cards",
  "width": 320,
  "ver": 1,
  "children": [
    { "type": "card", "icon": "...", "title": {...}, "content": {...} },
    { "type": "card", "icon": "...", "title": {...}, "content": {...} }
  ]
}
```
`width`, `height`, `size`, `ver`, `background`, `color` set on the `cards` block are pushed down onto every child `card` automatically — don't repeat them per card.

### `carousel` (`SliderWithCards.vue`)

Same children shape as `cards`, but auto-playing Swiper carousel instead of a static wrap. See `bus-park.json` for a 10-card example. Slide count-per-view is computed from viewport width automatically.

### `swiper` (`SliderWithThumbnails.vue`)

```json
{
  "type": "swiper",
  "images": [
    "/images/bus-park/van-hool-tdx/01.png",
    "/images/bus-park/van-hool-tdx/02.png"
  ]
}
```
`images` is a flat array of path **strings** (not objects, not per-locale). Renders a main gallery + a thumbnail strip below it. This is the one used for "N photos of this bus" style galleries.

### `slider-with-images` (`SliderWithImages.vue`)

Same idea (`images: string[]`) but a single auto-playing carousel, no thumbnail strip.

### `baner` (`TemplateBaner.vue`)

```json
{
  "type": "baner",
  "class": "light-blue",
  "image": "/images/x/circle-bg.jpg",
  "title": { "uk": "...", "en": "...", "de": "..." },
  "children": [
    { "type": "text", "class": "...", "content": { "uk": "...", "en": "...", "de": "..." } }
  ]
}
```
`image` here **is** a plain string (see the `image` vs `content` split in [Gotchas](#gotchas--footguns)). On narrow screens (`≤ 926px`) it automatically falls back to rendering as a `TemplateParallax` instead of the circular-image card.

### `text-with-icon` (`TextWithIcon.vue`)

```json
{ "type": "text-with-icon", "icon": "mdi-phone", "size": 32, "color": "primary", "content": { "uk": "...", "en": "...", "de": "..." } }
```
If `icon` is set, renders an `IconVariant`; otherwise falls back to `<img :src="image">` — so for this one, set **either** `icon` **or** `image`, not `content` as an image path.

### `dark-fone-section` (`DarkFoneSection.vue`)

```json
{
  "type": "dark-fone-section",
  "background": "primary",
  "title": { "uk": "...", "en": "...", "de": "..." },
  "text": { "uk": "...", "en": "...", "de": "..." },
  "children": [
    { "icon": "mdi-wifi", "size": 24, "color": "secondary", "title": {...}, "text": {...} }
  ]
}
```
`background` is a color **name** (`var(--{background})` applied internally, defaults to `primary`). Note this block uses `text` (not `content`) for its subtitle/body copy, both at the top level and per-child.

### `hover-card` (`HoverTemplate.vue`)

⚠️ **Known broken through the normal `TemplateItem` path.** `HoverTemplate.vue` expects `items` (a 2-tuple of blocks), `hoverColor`, `backgroundImage`, etc. as **separate props**, but `TemplateItem.vue` only ever passes it a single `item` prop (like every other template-mapped component) — so none of `HoverTemplate`'s actual props get populated this way. If you need hover-swap cards, either use it directly in a `.vue` file (not from JSON), or fix the wiring in `TemplateItem.vue` first.

### `parallax-inside` (`TemplateParallax.vue`)

Same visual/shape as the page-level `parallax` block (see [below](#the-parallax-block-is-special)) — background image + optional overlay `children` — but rendered **in place**, wherever you put it in `blocks`/`children`, like any other block. Use this when you want a parallax section in the middle of a page instead of the fixed one under the header.

```json
{
  "type": "parallax-inside",
  "class": "my-25",
  "content": { "uk": "/images/x/bg.jpg", "en": "...", "de": "..." },
  "dark": true,
  "children": [
    { "type": "header", "content": { "uk": "...", "en": "...", "de": "..." } },
    { "type": "title", "content": { "uk": "...", "en": "...", "de": "..." } }
  ]
}
```
Same fields as page-level `parallax` (`content` = background image, `children` = overlay content), plus `dark: true` darkens the overlay tint (`--v-parallax` scrim) for busier background images. You can have as many `parallax-inside` blocks on a page as you like, unlike the page-level `parallax` type which is capped at one.

## `TranslatedModel` (i18n content)

Any field typed `TranslatedModel` must have all three locales:

```json
{ "uk": "Український текст", "en": "English text", "de": "Deutscher Text" }
```
`content` on `text` blocks may instead be `{ "uk": ["line 1", "line 2"], ... }` — see above.

## Mobile reordering (`switchOrder`)

To swap which side of a **`section`** shows first on mobile (`≤ 960px`), set `"switchOrder": true` on the child(ren) you want reordered:

```json
{
  "type": "section",
  "children": [
    { "type": "swiper", "switchOrder": true, "images": [...] },
    { "type": "section", "switchOrder": true, "children": [...] }
  ]
}
```
This only affects layout **below 960px**; desktop order always follows the order in `children`.

Do **not** use Vuetify's own `order-first` / `order-last` utility classes for this — they set `order` unconditionally at every screen width (`!important`, no media query), which is almost never what you want here and doesn't compose with `switchOrder`. (This exact mixup broke reordering on the bus-park page once — see git history if you want the gory details.)

## The `parallax` block is special

A **top-level** block with `"type": "parallax"` is *not* rendered in place. `getDynamicPageContent` extracts it and stores it in `commonStore`; `App.vue` then renders it in a fixed slot right under the header/hero, regardless of where in `blocks` you put it:

```json
{
  "type": "parallax",
  "content": { "uk": "/images/x/bg.jpg", "en": "...", "de": "..." },
  "children": [
    { "type": "header", "content": { "uk": "...", "en": "...", "de": "..." } },
    { "type": "title", "content": { "uk": "...", "en": "...", "de": "..." } }
  ]
}
```
`content` is the background image; a `header`/`title` child (if present) becomes the overlay text. Only put **one** `parallax` block per page — only the first one found is used.

The same `TemplateParallax.vue` component is also what powers `type: "parallax-inside"` (see above) and `TemplateBaner.vue`'s mobile fallback (used directly, not through JSON) — three different entry points into the same component, each with different mount behavior.

## Gotchas / footguns

- **`image` vs `content` — don't mix them up.** `image` (used by `baner`, `text-with-icon`, `card-with-toolbar-image`, `cards-with-image-in-circle`) is a **plain string**, always — it's fed directly into an `<img src>` / `v-img src`. `content` on a `"type": "image"` block is the one that's per-locale (`TranslatedModel`). Making `image` a `TranslatedModel` (it happened once) breaks every consumer with a type error, since none of them do locale lookup on it.
- **`background` means different things on different blocks.** On the top-level block wrapper (`DynamicPageBlockTemplate.vue`) it's used as a **raw CSS value** — write `"background": "var(--light-grey-2)"`. On `card`/`cards`/`dark-fone-section` it's a **color name** — write `"background": "primary"` (gets wrapped in `var(--primary)` internally). Same field name, different expectations — check the component before copy-pasting.
- **`section` only really supports 2 children.** The left/right split is `index === 0 ? 'left' : 'right'` — a 3rd child also gets `'right'`, so it'll overlap the 2nd child's slot. Use `float` if you need 3+ side-by-side blocks.
- **`switchOrder` is mobile-only.** See above — don't reach for Vuetify's `order-first`/`order-last` classes for this.
- **Page-level `breadcrumbs` / `backButton` / `hero` are currently inert.** They exist in the type but aren't wired to anything in the render path today.
- **`hover-card` doesn't actually receive its props through JSON** — see the `hover-card` section above.
- **`pageContentMarginTop` vs `blockSpacing` — two different global settings, don't confuse them.** `pageContentMarginTop` is the one-time gap above all page content (under the header/hero). `blockSpacing` is the repeating gap *between* each top-level block (see [above](#spacing-between-blocks-is-automatic--dont-hand-set-it)). Setting one doesn't affect the other.

## Full field reference

Everything `BaseBlock` (`src/types/common/TemplateBlockModel.ts`) declares. Not every block type uses every field — see the per-type sections above for what actually applies.

| Field | Type | Used by |
|---|---|---|
| `type` | one of the block types listed above | all |
| `id` | `string` | all (element id) |
| `class` | `string` | all (extra CSS classes) |
| `width` / `height` | `number` (px) | `float` children, `card`, `cards`, `carousel`, `swiper`/`slider-with-images` images, `card-with-toolbar-image` |
| `icon` | `string` | `card`, `text-with-icon`, `dark-fone-section` children |
| `image` | `string` | `baner`, `text-with-icon`, `card-with-toolbar-image`, `cards-with-image-in-circle` |
| `title` | `TranslatedModel` | `card`, `baner`, `dark-fone-section` (+ children) |
| `content` | `TranslatedModel` (string or `string[]`) or image path (`image` type) | most blocks — **required** by the type, but effectively optional for layout-only blocks |
| `images` | `{ src: string, width?: number }[]` or `string[]` | `swiper`, `slider-with-images` |
| `children` | `TemplateBlockModel[]` | `section`, `float`, `cards`, `carousel`, `dark-fone-section`, `baner`, `parallax`, `parallax-inside` |
| `align` | `'center' \| 'left' \| 'right' \| 'justify'` | rarely read directly — mostly `class` is used instead |
| `ver` | `number` | `card` (1/2/21/3/4), `cards`/`carousel` (passed to child cards) |
| `component` | — | set internally, not something you write in JSON |
| `props` | `object` | `type: "component"` only |
| `route` | `string` | `button` (page id), `route` (router name) |
| `params` / `query` / `hash` | — | `route` type navigation |
| `switchOrder` | `boolean` | `section` children only, see above |
| `dark` | `boolean` | standalone `TemplateParallax` overlay tint |
| `size` | `number` | `card`/`text-with-icon`/`dark-fone-section` children (icon size) |
| `color` | `string` (color name) | `card`, `text-with-icon`, `dark-fone-section` children |
| `background` | `string` | see [Gotchas](#gotchas--footguns) — meaning depends on the block |
| `backgroundImage` / `hoverColor` / `hoverImage` | `string` | `hover-card` only (currently not wired through JSON, see above) |
