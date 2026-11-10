import type { Pinia } from 'pinia'
// Everything the editor needs before it can render - run by
// app/plugins/02.editor.client.ts.
//
//   1. prepareEditor()      - site settings + palette from the content API,
//                             theme stylesheets, palette CSS variables,
//                             fonts, site languages;
//   2. createEditorVuetify() - Vuetify with the editor's own fixed theme and
//                             the edited site's theme built from its palette;
//   3. installEditor()      - plugs pinia, i18n, Vuetify and the global
//                             components into a Vue app.
import type { App } from 'vue'
import { createVuetify } from 'vuetify'
import { mdi } from 'vuetify/iconsets/mdi'
import SelectColorFromPalette from '@/components/special/SelectColorFromPalette.vue'
import { siteStyles } from '@/configs/card-style'
import { onSeedProblems } from '@/db/client'
import { i18n, t } from '@/i18n'
import { useAjaxStore } from '@/stores/ajax'
import { useUiFeedbackStore } from '@/stores/ui-feedback'
import { buildColorScheme, isHexColor } from '@/utils/build-color-scheme'
import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
import { hexToRgbTriple } from '@/utils/hex-to-rgb-triple'
import { loadScopedVuetifyStyles } from '@/utils/load-scoped-vuetify-styles'
import { loadThemeStyles } from '@/utils/load-theme-styles'
import { setSiteLocales } from '@/utils/locale-text'
import { applyThemeFonts } from '@/utils/theme-fonts'
import { APP_THEME_NAME, EDITOR_THEME_NAME } from '@/utils/vuetify-theme-names'

export async function prepareEditor (pinia: Pinia, theme: number) {
  // Files the local database could not load at first run - tell the user,
  // not just the console.
  onSeedProblems(files => {
    useUiFeedbackStore(pinia).notifyWarning(t('popups.seedSkipped'), t('popups.seedSkippedDetail', { files: files.join(', ') }))
  })

  // Read through the ajax store like every other content read: the API
  // first, the local copy as a fallback; an unpublished local draft wins.
  const ajaxStore = useAjaxStore(pinia)
  const [globalSettings, palette] = await Promise.all([
    ajaxStore.getGlobalSettings(),
    ajaxStore.getPalette(),
  ])

  // vuetify-* stylesheets style the edited site's own Vuetify components and
  // are loaded scoped, so they never touch the editor's own Vuetify chrome.
  // The rest load unlayered, exactly as production loads them.
  const vuetifyStylesEntry = globalSettings.styles.find(name => name.startsWith('vuetify-'))
  const plainStyles = siteStyles(globalSettings.styles)
  await Promise.all([
    loadThemeStyles(theme, plainStyles),
    vuetifyStylesEntry ? loadScopedVuetifyStyles(theme, vuetifyStylesEntry, EDITED_APP_SCOPE_CLASS, 'vuetify-app-styles') : Promise.resolve(),
  ])

  // The site's CSS reads bare var(--grey), var(--light-border)... - defined
  // here from palette.json, like the site's own setupPalette().
  for (const [name, value] of Object.entries(palette)) {
    document.documentElement.style.setProperty(`--${name}`, value)
  }

  // Vuetify's .text-{name}/.bg-{name} utilities read --v-theme-{name} as an
  // "R,G,B" triple, which Vuetify only defines on .v-theme--{name}
  // elements - set them on the edited-content scope directly instead.
  const themeVarRules = Object.entries(palette)
    .filter(([, value]) => isHexColor(value))
    .map(([name, value]) => `--v-theme-${name}: ${hexToRgbTriple(value)};`)
    .join('\n  ')
  const themeVarStyle = document.createElement('style')
  themeVarStyle.textContent = `.${EDITED_APP_SCOPE_CLASS} {\n  ${themeVarRules}\n}`
  document.head.append(themeVarStyle)

  // Main + accent font, and the site's content languages, from global.json.
  applyThemeFonts(globalSettings)
  setSiteLocales(globalSettings.locales, globalSettings.defaultLocale)

  return { globalSettings, palette }
}

export function createEditorVuetify (palette: Record<string, string>) {
  return createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases: {},
      sets: { mdi },
    },
    theme: {
      // EDITOR_THEME_NAME - the editor's own interface, fixed;
      // APP_THEME_NAME - the edited site's palette (palette.json).
      defaultTheme: EDITOR_THEME_NAME,
      themes: {
        [EDITOR_THEME_NAME]: {
          dark: false,
          colors: {
            // White, so the editor's panels read as panels against the
            // #EEF2F6 page (see editor-ui.css).
            'background': '#FFFFFF',
            'surface': '#FFFFFF',
            'surface-variant': '#DCE4EA',
            'on-surface-variant': '#3A4A58',
            'primary': '#5C7A99',
            'primary-darken-1': '#46617D',
            'secondary': '#8FA6BF',
            'secondary-darken-1': '#71889F',
            'error': '#C4534A',
            'info': '#4C8FCC',
            'success': '#4C9A6A',
            'warning': '#C79A3A',
          },
          variables: {
            'default-border-radius': '8px',
          },
        },
        [APP_THEME_NAME]: buildColorScheme(palette),
      },
    },
    defaults: {},
  })
}

export function installEditor (app: App, { pinia, vuetify, theme }: { pinia: Pinia, vuetify: ReturnType<typeof createVuetify>, theme: number }) {
  app.config.globalProperties.$activeTheme = theme
  // The Nuxt host installs pinia itself, before prepareEditor runs.
  if (!app.config.globalProperties.$pinia) {
    app.use(pinia)
  }
  app.use(i18n)
  app.use(vuetify)
  app.component('select-color-from-palette', SelectColorFromPalette)
}
