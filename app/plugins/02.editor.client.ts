// Starts the editor once the content API is up (01.content-api.client.ts):
// pinia, site settings + palette, theme styles, fonts, Vuetify, i18n - see
// src/bootstrap/editor-app.ts.
import { addTopBarItem, setKitLabels, startLook, vuetifyColors } from '@sve/editor-ui'
import { createPinia } from 'pinia'
import { watch } from 'vue'
import { createEditorVuetify, installEditor, prepareEditor } from '@/bootstrap/editor-app'
import EditorLocaleMenu from '@/components/special/EditorLocaleMenu.vue'
import { useLocalOnlyMode } from '@/configs/api-mode'
import { i18n, t } from '@/i18n'
import { useUiFeedbackStore } from '@/stores/ui-feedback'
import { getActiveTheme } from '@/utils/active-theme'
import { syncContentImages } from '@/utils/dev-content-images'
import { installImageFallback } from '@/utils/image-fallback'
import { EDITOR_THEME_NAME } from '@/utils/vuetify-theme-names'

export default defineNuxtPlugin({
  name: 'editor',
  dependsOn: ['content-api'],
  async setup (nuxtApp) {
    if (!nuxtApp.$contentApiReady) {
      useLocalOnlyMode()
    }

    // A picture not set or not found shows the checkerboard.
    installImageFallback()

    const theme = getActiveTheme()
    const pinia = createPinia()
    // Installed before prepareEditor: the stores it reads need an active pinia.
    nuxtApp.vueApp.use(pinia)
    const { palette } = await prepareEditor(pinia, theme)
    const vuetify = createEditorVuetify(palette)
    installEditor(nuxtApp.vueApp, { pinia, vuetify, theme })
    // The editor's own look (packages/editor-ui): its CSS variables, and the
    // same colours for the editor's Vuetify theme - now and on every switch.
    // The interface language, on every top bar next to the colour scheme.
    addTopBarItem(EditorLocaleMenu)
    // The kit's own words (Back, Close...) in the interface language.
    const kitTexts = () => setKitLabels({ back: t('common.back'), close: t('common.close'), look: t('kit.look'), pickColor: t('kit.pickColor'), tools: t('kit.tools'), systemFont: t('kit.systemFont') })
    kitTexts()
    watch(i18n.global.locale, kitTexts)
    startLook(look => Object.assign(vuetify.theme.themes.value[EDITOR_THEME_NAME]!.colors, vuetifyColors(look)))
    // Dev: catch up on uploaded pictures that content/ links to but lacks.
    // Only against the in-browser API: a real server has its own storage and
    // nothing of this editor's to catch up with.
    if (import.meta.dev && nuxtApp.$contentApiKind === 'service-worker') {
      void syncContentImages()
    }
    // Said out loud: otherwise the only sign is that the editor quietly
    // stops talking to its API.
    if (!nuxtApp.$contentApiReady) {
      useUiFeedbackStore(pinia).notifyWarning(t('popups.localOnly'), t('popups.localOnlyDetail'))
    }
  },
})
