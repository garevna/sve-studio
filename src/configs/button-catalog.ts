import type { ButtonBorder, ButtonEntry, ButtonStateStyle } from '@/utils/button-style-entry'
import { resolveSwatchValue } from '@/utils/palette-entry'

// OUR catalogue of buttons: what each kind of button is and does - its
// shape, its motion - with colours to start from. The client never gets the
// catalogue on the site: they take the kinds they want into their own set
// (utils/button-set.ts, UI Kit > Кнопки), give each one their own colours
// and their own name, and only that set is offered for buttons on pages.
// One kind can be taken several times, in different colours.
//
// A kind's CSS is written for whatever class a client's button gets
// (`c`), and reads that button's own colours where it needs them - the
// wave fills with the button's hover background, the running light of
// "orbit" is the colour of its outline - so a colour picked in the UI Kit
// reaches the motion too.

type StatePart = Partial<Omit<ButtonStateStyle, 'raw'>>
interface StartingLook { base: StatePart, hover?: StatePart, disabled?: StatePart }

export interface ButtonTemplate {
  id: string
  // i18n key of its name in the catalogue
  name: string
  // a button of this kind is about its icon (buttonEditor asks for one)
  needsIcon?: boolean
  look: StartingLook
  // declarations on the button itself, beyond its colours
  own?: string[]
  // the states as they go into the CSS - the wave draws its hover fill
  // instead of setting it
  written?: (entry: ButtonEntry) => ButtonEntry
  // rules beyond the three states
  extra?: (c: string, entry: ButtonEntry) => string
  // @keyframes / @property it needs, once per stylesheet
  shared?: string
  // A kind that is a whole component of the site rather than a look for a
  // page's text button: a sign-in button, the icon button. Not offered for
  // text buttons; the component finds the client's button of its kind by
  // the kind's own class (kindClass in utils/button-set.ts).
  component?: boolean
  // Without the text-button basics (width, padding, font) - the icon button.
  bare?: boolean
  // What a sample of it shows in the UI Kit.
  sample?: 'google' | 'github' | 'icon'
}

const line = (style: string, width: number, color: string): ButtonBorder => ({ style, width, color })
// A palette key (or a literal like "transparent") as a CSS value, or the
// fallback key when the button has none.
export function colorOf (key: string | undefined, fallback: string): string {
  return resolveSwatchValue(key || fallback)
}

const FILLED: StartingLook = {
  base: { background: 'primary', color: 'white', borderRadius: 'var(--large-border-radius)' },
  hover: { background: 'secondary' },
  disabled: { opacity: 30 },
}
const OUTLINED: StartingLook = {
  base: { background: 'transparent', color: 'primary', border: line('solid', 1, 'primary'), borderRadius: 'var(--default-border-radius)' },
  hover: { color: 'secondary', border: line('solid', 1, 'secondary') },
  disabled: { color: 'grey', border: line('solid', 1, 'grey') },
}
const ABOVE_EFFECT = (c: string) => `.${c} > .v-btn__content {\n  position: relative;\n  z-index: 1;\n}`
function NO_MOTION (selectors: string[], what = 'animation: none !important;') {
  return `@media (prefers-reduced-motion: reduce) {\n  ${selectors.join(',\n  ')} {\n    ${what}\n  }\n}`
}

export const BUTTON_CATALOG: ButtonTemplate[] = [
  {
    id: 'filled',
    name: 'buttonSet.kind.filled',
    look: FILLED,
    own: ['transition: background 0.3s ease, color 0.3s ease'],
  },
  {
    id: 'outlined',
    name: 'buttonSet.kind.outlined',
    look: OUTLINED,
    own: ['transition: color 0.3s ease, border-color 0.3s ease'],
  },
  {
    id: 'link',
    name: 'buttonSet.kind.link',
    look: { base: { background: 'transparent', color: 'primary' }, hover: { color: 'secondary' }, disabled: { color: 'grey' } },
    own: ['transition: color 0.3s ease'],
    extra: c => `${ABOVE_EFFECT(c)}

.${c} > .v-btn__content::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -4px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transform: scaleX(0);
  transition: transform 0.35s ease;
}

.${c}:hover > .v-btn__content::after,
.${c}:focus-visible > .v-btn__content::after {
  transform: scaleX(1);
}

@media (hover: none) {
  .${c} > .v-btn__content::after {
    transform: scaleX(1);
  }
}`,
  },
  {
    id: 'icon-right',
    name: 'buttonSet.kind.iconRight',
    needsIcon: true,
    look: OUTLINED,
    own: ['transition: color 0.3s ease, border-color 0.3s ease'],
    extra: c => `.${c} > .v-btn__content > .button-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  margin: 0 !important;
  transform: translateY(-50%);
  transition: transform 0.3s ease;
}

.${c}:hover > .v-btn__content > .button-icon {
  transform: translate(4px, -50%);
}`,
  },
  {
    id: 'shine',
    name: 'buttonSet.kind.shine',
    look: FILLED,
    own: ['position: relative', 'overflow: hidden', 'isolation: isolate'],
    extra: c => `${ABOVE_EFFECT(c)}

.${c}::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(105deg, transparent 30%, color-mix(in srgb, var(--white) 50%, transparent) 50%, transparent 70%);
  transform: translateX(-110%);
  animation: pw-btn-shine 3.6s ease-in-out infinite;
  pointer-events: none;
}

.${c}:hover::after {
  animation-duration: 1.4s;
}

${NO_MOTION([`.${c}::after`])}`,
    shared: `@keyframes pw-btn-shine {
  0% { transform: translateX(-110%); }
  35% { transform: translateX(110%); }
  100% { transform: translateX(110%); }
}`,
  },
  {
    id: 'wave',
    name: 'buttonSet.kind.wave',
    look: {
      base: OUTLINED.base,
      // the fill the wave brings
      hover: { background: 'primary', color: 'white' },
      disabled: OUTLINED.disabled,
    },
    own: ['position: relative', 'overflow: hidden', 'isolation: isolate', 'transition: color 0.45s ease'],
    written: entry => ({ ...entry, hover: { ...entry.hover, background: 'transparent' } }),
    extra: (c, entry) => `${ABOVE_EFFECT(c)}

.${c}::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 110%;
  z-index: 0;
  width: 170%;
  aspect-ratio: 1;
  border-radius: 42%;
  background: ${colorOf(entry.hover.background, 'primary')};
  transform: translateX(-50%) rotate(0deg);
  transition: top 0.8s ease, transform 1.2s ease;
  pointer-events: none;
}

.${c}:hover::before,
.${c}:focus-visible::before {
  top: -80%;
  transform: translateX(-50%) rotate(180deg);
}

.${c}:disabled::before {
  display: none;
}

${NO_MOTION([`.${c}::before`], 'transition: none;')}`,
  },
  {
    id: 'arrow',
    name: 'buttonSet.kind.arrow',
    look: FILLED,
    own: ['transition: background 0.35s ease'],
    extra: c => String.raw`.${c} > .v-btn__content::after {
  content: "\2192";
  display: inline-block;
  width: 0;
  margin-left: 0;
  opacity: 0;
  overflow: hidden;
  transform: translateX(-8px);
  transition: width 0.35s ease, margin-left 0.35s ease, opacity 0.35s ease, transform 0.35s ease;
}

.${c}:hover > .v-btn__content::after,
.${c}:focus-visible > .v-btn__content::after {
  width: 1.1em;
  margin-left: 10px;
  opacity: 1;
  transform: translateX(0);
}

@media (hover: none) {
  .${c} > .v-btn__content::after {
    width: 1.1em;
    margin-left: 10px;
    opacity: 1;
    transform: none;
  }
}`,
  },
  {
    id: 'pulse-filled',
    name: 'buttonSet.kind.pulseFilled',
    look: FILLED,
    own: ['position: relative'],
    extra: c => `.${c}::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  background: inherit;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: pw-btn-pulse 2.4s ease-out infinite;
  pointer-events: none;
}

.${c}:disabled::before {
  animation: none;
  opacity: 0;
}

${NO_MOTION([`.${c}::before`])}`,
    shared: pulseKeyframes(),
  },
  {
    id: 'pulse-outlined',
    name: 'buttonSet.kind.pulseOutlined',
    look: OUTLINED,
    own: ['position: relative'],
    extra: c => `.${c}::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-style: solid;
  border-width: 2px;
  border-color: inherit;
  border-radius: inherit;
  animation: pw-btn-pulse 2.4s ease-out infinite;
  pointer-events: none;
}

.${c}:disabled::before {
  animation: none;
  opacity: 0;
}

${NO_MOTION([`.${c}::before`])}`,
    shared: pulseKeyframes(),
  },
  {
    id: 'press',
    name: 'buttonSet.kind.press',
    look: {
      base: { background: 'secondary', color: 'white', boxShadow: '0 6px 0 var(--primary)', borderRadius: 'var(--default-border-radius)' },
      hover: { boxShadow: '0 8px 0 var(--primary)' },
      disabled: { opacity: 30 },
    },
    own: ['margin-bottom: 6px', 'transition: transform 0.15s ease, box-shadow 0.15s ease'],
    extra: c => `.${c}:hover {
  transform: translateY(-2px);
}

.${c}:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 var(--primary) !important;
}

.${c}:disabled {
  transform: none;
}`,
  },
  {
    id: 'orbit',
    name: 'buttonSet.kind.orbit',
    look: {
      base: { background: 'white', color: 'primary', border: line('solid', 1, 'secondary'), borderRadius: 'var(--default-border-radius)' },
      hover: { background: 'light-grey-2' },
      disabled: { color: 'grey' },
    },
    own: ['position: relative', 'isolation: isolate'],
    extra: c => `${ABOVE_EFFECT(c)}

.${c}::before {
  content: "";
  position: absolute;
  inset: -2px;
  z-index: 0;
  border-style: solid;
  border-width: 3px;
  border-color: inherit;
  border-radius: inherit;
  -webkit-mask: conic-gradient(from var(--pw-orbit-angle), transparent 0deg 220deg, #000 360deg);
  mask: conic-gradient(from var(--pw-orbit-angle), transparent 0deg 220deg, #000 360deg);
  animation: pw-btn-orbit 3s linear infinite;
  pointer-events: none;
}

.${c}:hover::before {
  animation-duration: 1.2s;
}

.${c}:disabled::before {
  animation: none;
  opacity: 0;
}

${NO_MOTION([`.${c}::before`])}`,
    shared: `@property --pw-orbit-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes pw-btn-orbit {
  to { --pw-orbit-angle: 360deg; }
}`,
  },
  {
    id: 'aurora',
    name: 'buttonSet.kind.aurora',
    look: {
      // the shimmer runs between the background and the hover background
      base: { background: 'primary', color: 'white', borderRadius: 'var(--large-border-radius)' },
      hover: { background: 'secondary', boxShadow: '0 8px 24px color-mix(in srgb, var(--secondary) 45%, transparent)' },
      disabled: { opacity: 30 },
    },
    own: ['position: relative', 'overflow: hidden', 'isolation: isolate', 'transition: box-shadow 0.4s ease'],
    extra: (c, entry) => {
      const from = colorOf(entry.base.background, 'primary')
      const to = colorOf(entry.hover.background, 'secondary')
      return `${ABOVE_EFFECT(c)}

.${c}::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(110deg, ${from}, ${to}, ${from}, ${to});
  background-size: 300% 100%;
  animation: pw-btn-aurora 6s ease-in-out infinite alternate;
  pointer-events: none;
}

.${c}:hover::before {
  animation-duration: 2s;
}

${NO_MOTION([`.${c}::before`])}`
    },
    shared: `@keyframes pw-btn-aurora {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}`,
  },
]

// The sign-in buttons' starting look is the sign-in page's own, so taking
// one into the set changes nothing until its colours are changed.
const SIGN_IN: StartingLook = {
  base: { background: 'white', color: 'black', border: line('solid', 1, 'light-grey-1'), borderRadius: '999px' },
  hover: { border: line('solid', 1, 'secondary') },
  disabled: { opacity: 50 },
}
const SIGN_IN_OWN = [
  'display: inline-flex',
  'align-items: center',
  'justify-content: center',
  'gap: 10px',
  'min-height: 52px',
  'font-weight: 600 !important',
  'cursor: pointer',
  'transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease',
]
// The GitHub mark is a font glyph: the button's text colour reaches it.
function SIGN_IN_MARK (c: string) {
  return `.${c} .mdi {
  font-size: 24px;
  line-height: 1;
  color: currentColor;
}`
}

BUTTON_CATALOG.push(
  {
    id: 'sign-in-google',
    name: 'buttonSet.kind.signInGoogle',
    component: true,
    sample: 'google',
    look: SIGN_IN,
    own: SIGN_IN_OWN,
  },
  {
    id: 'sign-in-github',
    name: 'buttonSet.kind.signInGithub',
    component: true,
    sample: 'github',
    look: SIGN_IN,
    own: SIGN_IN_OWN,
    extra: SIGN_IN_MARK,
  },
  {
    // The plate under the icon is the button's own background - transparent
    // and then the hover background, always the same size. The icon's
    // colour is the icon's, set where the button is placed.
    id: 'icon-button',
    name: 'buttonSet.kind.iconButton',
    component: true,
    bare: true,
    sample: 'icon',
    look: {
      base: { background: 'transparent', borderRadius: '50%' },
      hover: { background: 'light-grey-2' },
      disabled: { opacity: 40 },
    },
    own: [
      'display: inline-flex',
      'padding: 8px',
      'border: none',
      'cursor: pointer',
      'transition: background-color 0.2s ease',
    ],
  },
)

function pulseKeyframes (): string {
  return `@keyframes pw-btn-pulse {
  0% { inset: -1px; opacity: 0.8; }
  75% { inset: -12px; opacity: 0; }
  100% { inset: -12px; opacity: 0; }
}`
}

export function templateOf (id: string | undefined): ButtonTemplate {
  return BUTTON_CATALOG.find(template => template.id === id) ?? BUTTON_CATALOG[0]!
}
