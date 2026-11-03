<script lang="ts" setup>
  import { useRoute } from 'vue-router'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { t } from '@/i18n'

  const route = useRoute()
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :title="t(String(route.meta.title ?? ''))" />
      <p class="text-body-1 text-medium-emphasis">{{ t('common.inDevelopment') }}</p>
    </v-main>
  </v-app>
</template>
