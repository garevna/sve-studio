<script lang="ts" setup>
  import { SveTopBar } from '@sve/editor-ui'
  import { t } from '@/i18n'

  // The top bar of an editor section (settings, palette, pages list...) -
  // the kit's SveTopBar, the same bar the page editor has. It sits inside
  // the section's .editor-page and reaches out over that page's padding, so
  // it runs edge to edge like everywhere else.
  defineProps<{
    title: string
    backTo: string
    detail?: string
    detailIcon?: string
    // Placed straight in the screen, not inside an .editor-page - nothing to
    // reach out over.
    standalone?: boolean
  }>()
</script>

<template>
  <SveTopBar
    :back="backTo"
    :back-label="t('common.back')"
    :class="['editor-page-header', { 'editor-page-header--inset': !standalone }]"
    :subtitle="detail"
    :title="title"
  >
    <template #actions>
      <slot name="actions" />
    </template>
  </SveTopBar>
</template>

<style scoped>
  /* .editor-page's padding: 32px clamp(16px, 5vw, 48px) 64px
     (src/styles/editor-ui.css). */
  .editor-page-header--inset {
    margin: -32px calc(-1 * clamp(16px, 5vw, 48px)) 24px;
  }
</style>
