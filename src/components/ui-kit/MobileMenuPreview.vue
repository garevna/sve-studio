<script setup lang="ts">
  import type { MobileMenuStyle } from '@/configs/menu-style'
  import type { SocialIconLook } from '@/configs/social-icons'
  import type { SocialNetwork } from '@/configs/social-networks'
  import { computed, ref } from 'vue'
  import SocialIconImage from '@/components/editors/icon/SocialIconImage.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { CONTACT_LABEL, LOCALE_LABEL, mobilePanelStyle, rowStyle, translated } from '@/configs/menu-style'
  import { defaultSocialIcon, socialIconRef } from '@/configs/social-icons'
  import { SOCIAL_NETWORKS } from '@/configs/social-networks'
  import { t } from '@/i18n'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { siteLocales } from '@/utils/locale-text'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // The mobile menu in a phone frame, drawn the way the site draws it
  // (site/src/components/main-menu/MobileMenu*.vue - keep them in step), with
  // sample entries. The sample texts ARE the format editors: an entry, the
  // active entry, a sub-entry and the user's name each carry the usual
  // format button.
  type TextFormat = 'itemClass' | 'activeClass' | 'subItemClass' | 'userNameClass'
  const props = defineProps<{
    look: MobileMenuStyle
    logo?: string
    logoWhite?: string
    links?: Record<string, string>
  }>()
  const emit = defineEmits<{ format: [key: TextFormat, value: string] }>()

  const screenClass = [EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME), 'mobile-preview-screen']
  const locales = computed(() => siteLocales())
  const networks = computed(() => SOCIAL_NETWORKS.filter(name => props.links?.[name]))
  function socialIcon (name: SocialNetwork, look?: SocialIconLook): string {
    return look ? socialIconRef(name, look) : defaultSocialIcon(name)
  }
  function justify (align?: string): string {
    return align === 'end' ? 'right' : (align === 'center' ? 'center' : 'left')
  }

  // Never saved - only there to be formatted.
  const sampleEntry = ref(t('menuStyle.sampleEntry'))
  const sampleActive = ref(t('menuStyle.sampleActive'))
  const sampleSub = ref(t('menuStyle.sampleSub'))
  const sampleUser = ref(t('menuStyle.sampleUser'))
</script>

<template>
  <div class="mobile-preview-phone">
    <div :class="screenClass">
      <!-- The page under the menu, dimmed as on the site. -->
      <div class="mobile-preview-stage">
        <nav
          :class="['mobile-preview-panel', `mobile-preview-panel--${look.placement}`]"
          :style="mobilePanelStyle(look)"
        >
          <v-icon class="mobile-preview-close" icon="mdi-close" />

          <template v-for="(row, index) of look.rows" :key="index">
            <div v-if="row.type === 'spacer'" class="mobile-preview-row mobile-preview-row--spacer" :style="rowStyle(row)" />

            <div v-else-if="row.type === 'divider'" class="mobile-preview-row mobile-preview-row--divider" :style="rowStyle(row)">
              <hr :style="{ borderColor: `var(--${row.color || 'light-grey'})` }">
            </div>

            <div v-else class="mobile-preview-row" :style="rowStyle(row)">
              <img v-if="row.type === 'logo' && (row.lightLogo ? logoWhite || logo : logo)" alt="" class="mobile-preview-logo" :src="row.lightLogo ? logoWhite || logo : logo">

              <template v-else-if="row.type === 'locales'">
                <span v-if="row.localeLabel" :class="look.itemClass">{{ translated(LOCALE_LABEL, 'uk') }}</span>
                <span v-if="row.localeLook === 'dropdown'" :class="[look.itemClass, 'mobile-preview-push']">
                  {{ locales[0]?.toUpperCase() }} <v-icon size="18">mdi-chevron-down</v-icon>
                </span>
                <div v-else class="mobile-preview-inline">
                  <span v-for="(code, at) of locales" :key="code" :class="at === 0 ? look.activeClass : look.itemClass">{{ code.toUpperCase() }}</span>
                </div>
              </template>

              <div v-else-if="row.type === 'menu'" class="mobile-preview-menu" :style="{ textAlign: justify(row.align) as 'left' }">
                <div class="mobile-preview-entry">
                  <TextEditor
                    v-model:content="sampleEntry"
                    :class="look.itemClass"
                    parent-type="usual"
                    type="text"
                    @update:class="(value: string) => emit('format', 'itemClass', value)"
                  />
                  <v-icon size="18">mdi-chevron-down</v-icon>
                </div>
                <div class="mobile-preview-entry">
                  <TextEditor
                    v-model:content="sampleActive"
                    :class="look.activeClass"
                    parent-type="usual"
                    type="text"
                    @update:class="(value: string) => emit('format', 'activeClass', value)"
                  />
                  <v-icon size="18">mdi-chevron-up</v-icon>
                </div>
                <div class="mobile-preview-sub">
                  <TextEditor
                    v-model:content="sampleSub"
                    :class="look.subItemClass"
                    parent-type="usual"
                    type="text"
                    @update:class="(value: string) => emit('format', 'subItemClass', value)"
                  />
                  <p :class="look.subItemClass">{{ t('menuStyle.sampleSub') }}</p>
                </div>
                <div class="mobile-preview-entry">
                  <p :class="look.itemClass">{{ t('menuStyle.sampleOther') }}</p>
                </div>
              </div>

              <div v-else-if="row.type === 'social'" class="mobile-preview-inline">
                <SocialIconImage
                  v-for="name of networks"
                  :key="name"
                  :color="row.iconColor"
                  :icon="socialIcon(name, row.iconLook)"
                  :size="row.iconSize || 32"
                />
              </div>

              <v-btn v-else-if="row.type === 'contact'" :class="row.buttonClass || 'primary-button'">
                {{ translated(row.label || CONTACT_LABEL, 'uk') }}
              </v-btn>

              <div v-else-if="row.type === 'user'" class="mobile-preview-inline mobile-preview-user">
                <v-avatar color="grey-lighten-1" size="40">ОК</v-avatar>
                <TextEditor
                  v-model:content="sampleUser"
                  :class="look.userNameClass"
                  parent-type="usual"
                  type="text"
                  @update:class="(value: string) => emit('format', 'userNameClass', value)"
                />
              </div>
            </div>
          </template>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-preview-phone {
  width: 360px;
  max-width: 100%;
  height: 720px;
  padding: 10px;
  border-radius: 40px;
  background: #1f2430;
  flex: 0 0 auto;
}
.mobile-preview-screen {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 30px;
  background: #e9edf2;
}
.mobile-preview-stage {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.32);
}
/* The same box as the site's .mobile-menu-panel. */
.mobile-preview-panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.mobile-preview-panel--full {
  inset: 0;
}
.mobile-preview-panel--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 92%;
}
.mobile-preview-panel--left,
.mobile-preview-panel--right {
  top: 0;
  bottom: 0;
  width: min(var(--mobile-menu-width, 320px), calc(100% - 48px));
}
.mobile-preview-panel--left {
  left: 0;
}
.mobile-preview-panel--right {
  right: 0;
}
.mobile-preview-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
  color: var(--grey);
}
/* The same row as the site's .mobile-menu-row. */
.mobile-preview-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: var(--row-align, flex-start);
  gap: 12px;
  padding: 12px 24px;
}
.mobile-preview-panel > .mobile-preview-row:first-of-type {
  padding-top: 56px;
}
.mobile-preview-row--spacer {
  flex: 1 1 auto;
  min-height: 16px;
  padding: 0;
}
.mobile-preview-row--divider {
  padding: 4px 24px;
}
.mobile-preview-row--divider hr {
  width: 100%;
  margin: 0;
  border: none;
  border-top: solid 1px;
}
.mobile-preview-row p,
.mobile-preview-row span {
  margin: 0;
}
.mobile-preview-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.mobile-preview-push {
  margin-left: auto;
}
.mobile-preview-logo {
  display: block;
  max-height: 48px;
}
.mobile-preview-menu {
  width: 100%;
}
.mobile-preview-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}
.mobile-preview-sub {
  padding: 2px 0 2px 16px;
}
.mobile-preview-sub p {
  padding: 6px 0;
}
/* The format buttons may sit on a row's fill, light or dark: a light chip
   of their own keeps them visible (as in TextOnBackground.vue). */
.mobile-preview-row :deep(.v-btn--icon) {
  background: rgb(255 255 255 / 0.85);
  color: #3a4a58;
}
.mobile-preview-user {
  flex-wrap: nowrap;
}
</style>
