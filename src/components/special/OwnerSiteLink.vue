<script setup lang="ts">
  import { t } from '@/i18n'
  import { OWNER_SITE_URL } from '@/utils/owner-site'

  // On every top bar of the Верф: the way to Pagewright's own site - apart
  // from this demo, never changed by what is done here.
</script>

<template>
  <a
    :aria-label="t('home.ownerSite')"
    class="sve-btn sve-icon-btn sve-icon-btn--ghost"
    :href="OWNER_SITE_URL"
    rel="noopener"
    target="_blank"
    :title="t('home.ownerSite')"
  >
    <i class="sve-icon mdi mdi-sail-boat" />
  </a>
</template>
