// Starts the editor once the content API is up (01.content-api.client.ts):
// pinia, site settings + palette, theme styles, fonts, Vuetify, i18n - see
// src/bootstrap/editor-app.ts.
import { startLook, vuetifyColors } from '@sve/editor-ui'
import { createPinia } from 'pinia'
import { createEditorVuetify, installEditor, prepareEditor } from '@/bootstrap/editor-app'
import { useLocalOnlyMode } from '@/configs/api-mode'
import { t } from '@/i18n'
import { useUiFeedbackStore } from '@/stores/ui-feedback'
import { getActiveTheme } from '@/utils/active-theme'
import { syncContentImages } from '@/utils/dev-content-images'
import { EDITOR_THEME_NAME } from '@/utils/vuetify-theme-names'

export default defineNuxtPlugin({
  name: 'editor',
  dependsOn: ['content-api'],
  async setup (nuxtApp) {
    if (!nuxtApp.$contentApiReady) {
      useLocalOnlyMode()
    }

    const theme = getActiveTheme()
    const pinia = createPinia()
    // Installed before prepareEditor: the stores it reads need an active pinia.
    nuxtApp.vueApp.use(pinia)
    const { palette } = await prepareEditor(pinia, theme)
    const vuetify = createEditorVuetify(palette)
    installEditor(nuxtApp.vueApp, { pinia, vuetify, theme })
    // The editor's own look (packages/editor-ui): its CSS variables, and the
    // same colours for the editor's Vuetify theme - now and on every switch.
    startLook(look => Object.assign(vuetify.theme.themes.value[EDITOR_THEME_NAME]!.colors, vuetifyColors(look)))
    // Dev: catch up on uploaded pictures that content/ links to but lacks.
    if (import.meta.dev && nuxtApp.$contentApiReady) {
      void syncContentImages()
    }
    // Said out loud: otherwise the only sign is that the editor quietly
    // stops talking to its API.
    if (!nuxtApp.$contentApiReady) {
      useUiFeedbackStore(pinia).notifyWarning(t('popups.localOnly'), t('popups.localOnlyDetail'))
    }
  },
})
