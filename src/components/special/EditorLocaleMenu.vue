<script setup lang="ts">
  import { SveIconButton, SveMenu, SveMenuItem, SveMenuLabel } from '@sve/editor-ui'
  import { useI18n } from 'vue-i18n'
  import { EDITOR_UI_LOCALES, setEditorUiLocale } from '@/i18n'

  // The editor's own interface language - on every top bar (registered in
  // app/plugins/02.editor.client.ts). Not the site's content languages.
  const { t, locale } = useI18n()

  // Each language named in itself, so it can be found whatever is on now.
  const NAMES: Record<string, string> = { uk: 'Українська', en: 'English', de: 'Deutsch' }
</script>

<template>
  <SveMenu :min-width="200">
    <template #activator="{ props: activator }">
      <SveIconButton icon="mdi-translate" :label="t('ui.language')" v-bind="activator" />
    </template>
    <SveMenuLabel>{{ t('ui.language') }}</SveMenuLabel>
    <SveMenuItem
      v-for="item of EDITOR_UI_LOCALES"
      :key="item.value"
      :icon="locale === item.value ? 'mdi-check' : 'mdi-blank'"
      @click="setEditorUiLocale(item.value)"
    >
      {{ NAMES[item.value] }}
    </SveMenuItem>
  </SveMenu>
</template>
