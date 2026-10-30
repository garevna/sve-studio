<script lang="ts" setup>
  import { useRoute } from 'vue-router'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'

  const route = useRoute()
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :title="route.meta.title as string" />
      <p class="text-body-1 text-medium-emphasis">Розділ у розробці</p>
    </v-main>
  </v-app>
</template>
