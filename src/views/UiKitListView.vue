<script lang="ts" setup>
  import type { SiteStyle } from '@/configs/site-style'
  import { ref } from 'vue'
  import { useRoute } from 'vue-router'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { useSiteStyle } from '@/composables/useSiteStyle'
  import { SITE_STYLES } from '@/configs/site-style'
  import { t } from '@/i18n'
  import ButtonPaletteView from '@/views/ButtonPaletteView.vue'
  import ButtonSetView from '@/views/ButtonSetView.vue'
  import CalendarsView from '@/views/CalendarsView.vue'
  import CardStylesView from '@/views/CardStylesView.vue'
  import FieldLooksView from '@/views/FieldLooksView.vue'
  import FooterLayoutView from '@/views/FooterLayoutView.vue'
  import MenuStyleView from '@/views/MenuStyleView.vue'
  import PopupLooksView from '@/views/PopupLooksView.vue'
  import SpacingSettingsView from '@/views/SpacingSettingsView.vue'

  // "Попапи" and "Календар" are the client's looks of popups and of the
  // date popup's calendar (popups.json looks/calendars); the "Попапи"
  // section gives each popup its words and picks one of these by name.
  //
  // The footer's COLUMN LAYOUT belongs here rather than in the footer
  // editor: it's a design decision about the site's shape (how many
  // columns, how wide, what gap), set once as numbers, while the footer
  // editor is for the content that goes in them.
  // ?tab=date and so on: a link from elsewhere (a date popup's settings)
  // opens on its tab.
  type Tab = 'buttons' | 'tabs' | 'cards' | 'footer' | 'spacing' | 'menu' | 'popups' | 'date' | 'fields'
  const TABS: Tab[] = ['buttons', 'tabs', 'cards', 'footer', 'spacing', 'menu', 'popups', 'date', 'fields']
  const asked = useRoute().query.tab
  const tab = ref<Tab>(TABS.includes(asked as Tab) ? asked as Tab : 'buttons')

  const siteStyle = useSiteStyle()
  void siteStyle.load()
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" title="UI Kit" />

      <!-- The site's style: the default look of its cards, buttons and
        footer (configs/site-style.ts). A part given a look of its own in
        the tabs below keeps it. -->
      <div class="ui-kit-site-style">
        <span class="ui-kit-site-style-label">{{ t('kit.siteStyle') }}</span>
        <v-btn-toggle
          class="editor-panel"
          density="comfortable"
          mandatory
          :model-value="siteStyle.style.value"
          @update:model-value="(value: SiteStyle) => siteStyle.set(value)"
        >
          <v-btn v-for="name of SITE_STYLES" :key="name" :value="name">{{ t(`kit.siteStyles.${name}`) }}</v-btn>
        </v-btn-toggle>
        <p class="ui-kit-site-style-hint">{{ t('kit.siteStyleHint') }}</p>
      </div>

      <v-tabs
        v-model="tab"
        centered
        class="editor-panel editor-tabs ui-kit-tabs mb-8"
        height="40"
        hide-slider
        selected-class="editor-tab--active"
      >
        <v-tab value="buttons">{{ t('common.buttons') }}</v-tab>
        <v-tab value="tabs">{{ t('kit.tabs') }}</v-tab>
        <v-tab value="cards">{{ t('common.cards') }}</v-tab>
        <v-tab value="footer">{{ t('common.footer') }}</v-tab>
        <v-tab value="spacing">{{ t('kit.spacing') }}</v-tab>
        <v-tab value="menu">{{ t('common.menu') }}</v-tab>
        <v-tab value="popups">{{ t('popupLooks.tab') }}</v-tab>
        <v-tab value="date">{{ t('common.datePicker') }}</v-tab>
        <v-tab value="fields">{{ t('fieldLooks.tab') }}</v-tab>
      </v-tabs>

      <v-tabs-window v-model="tab">
        <!-- Buttons and tabs edit the same stylesheet: only the open one is
          mounted, so neither works from the other's stale copy. -->
        <v-tabs-window-item value="buttons">
          <!-- The client's own buttons (button-set.css); the tabs below are
            still buttons.css. -->
          <ButtonSetView v-if="tab === 'buttons'" />
        </v-tabs-window-item>
        <v-tabs-window-item value="tabs">
          <ButtonPaletteView v-if="tab === 'tabs'" section="tabs" />
        </v-tabs-window-item>
        <v-tabs-window-item value="cards">
          <CardStylesView />
        </v-tabs-window-item>
        <v-tabs-window-item value="footer">
          <FooterLayoutView />
        </v-tabs-window-item>
        <v-tabs-window-item value="spacing">
          <SpacingSettingsView />
        </v-tabs-window-item>
        <v-tabs-window-item value="menu">
          <MenuStyleView />
        </v-tabs-window-item>
        <v-tabs-window-item value="popups">
          <PopupLooksView v-if="tab === 'popups'" />
        </v-tabs-window-item>
        <v-tabs-window-item value="date">
          <CalendarsView v-if="tab === 'date'" />
        </v-tabs-window-item>
        <!-- the docking forms' elements (popups.json fieldLooks) -->
        <v-tabs-window-item value="fields">
          <FieldLooksView v-if="tab === 'fields'" />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-main>
  </v-app>
</template>

<style scoped>
.ui-kit-site-style {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 16px;
  margin-bottom: 24px;
}
.ui-kit-site-style-label {
  font-weight: 600;
}
.ui-kit-site-style-hint {
  flex-basis: 100%;
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  color: #7A8699;
}

/*
 * A compact centered "pill" panel (width hugs the tabs themselves, not the
 * full page) reads as a distinct, more prominent control than a full-width
 * bar with merely-centered content would - same visual language
 * AuthPageView.vue's own .auth-page-tabs already established for production
 * tab groups, applied here via the editor's own shared .editor-panel look
 * instead.
 */
.ui-kit-tabs {
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
}
</style>
