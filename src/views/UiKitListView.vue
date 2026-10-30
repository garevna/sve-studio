<script lang="ts" setup>
  import { ref } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { t } from '@/i18n'
  import ButtonPaletteView from '@/views/ButtonPaletteView.vue'
  import CardStylesView from '@/views/CardStylesView.vue'
  import FooterLayoutView from '@/views/FooterLayoutView.vue'
  import SpacingSettingsView from '@/views/SpacingSettingsView.vue'

  // "Кнопки" and "Футер" are the real tabs; "Меню"/"Вибір дати" are stubs,
  // the same "Розділ у розробці" placeholder PlaceholderView.vue uses for
  // not-yet-built sections elsewhere in the app.
  //
  // The footer's COLUMN LAYOUT belongs here rather than in the footer
  // editor: it's a design decision about the site's shape (how many
  // columns, how wide, what gap), set once as numbers, while the footer
  // editor is for the content that goes in them.
  const tab = ref<'buttons' | 'cards' | 'footer' | 'spacing' | 'menu' | 'date'>('buttons')
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" title="UI Kit" />

      <v-tabs
        v-model="tab"
        centered
        class="editor-panel editor-tabs ui-kit-tabs mb-8"
        height="40"
        hide-slider
        selected-class="editor-tab--active"
      >
        <v-tab value="buttons">Кнопки</v-tab>
        <v-tab value="cards">{{ t('cardStyles.tab') }}</v-tab>
        <v-tab value="footer">Футер</v-tab>
        <v-tab value="spacing">Відступи</v-tab>
        <v-tab value="menu">Меню</v-tab>
        <v-tab value="date">Вибір дати</v-tab>
      </v-tabs>

      <v-tabs-window v-model="tab">
        <v-tabs-window-item value="buttons">
          <ButtonPaletteView />
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
          <p class="text-body-1 text-medium-emphasis mt-4">Розділ у розробці</p>
        </v-tabs-window-item>
        <v-tabs-window-item value="date">
          <p class="text-body-1 text-medium-emphasis mt-4">Розділ у розробці</p>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-main>
  </v-app>
</template>

<style scoped>
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
