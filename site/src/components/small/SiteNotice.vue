<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '../../stores/common'
  import { siteNotices } from '../../utils/report'

  // In the demo: what went wrong, said to the visitor at the bottom of the
  // screen (utils/report.ts) - the visitor is the one running this copy of
  // the site. On a real deployment it stays empty: problems go to the log.
  const { locale } = storeToRefs(useCommonStore())
  const WORDS: Record<string, string> = { uk: 'Щось пішло не так', en: 'Something went wrong', de: 'Etwas ist schiefgelaufen' }
  const heading = computed(() => WORDS[locale.value] || WORDS.en)
  const last = computed(() => siteNotices.value.at(-1) ?? null)

  function close () {
    siteNotices.value = []
  }
</script>

<template>
  <v-snackbar
    color="white"
    location="bottom"
    :model-value="!!last"
    multi-line
    timeout="8000"
    @update:model-value="(open: boolean) => !open && close()"
  >
    <div class="site-notice">
      <i aria-hidden="true" class="mdi mdi-alert-circle-outline site-notice__icon" />
      <div>
        <p class="site-notice__heading">{{ heading }}</p>
        <p class="site-notice__text">{{ last?.message }}</p>
      </div>
    </div>
    <template #actions>
      <button class="site-notice__close" type="button" @click="close">
        <i aria-hidden="true" class="mdi mdi-close" />
      </button>
    </template>
  </v-snackbar>
</template>

<style scoped>
.site-notice {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--black);
}
.site-notice__icon {
  font-size: 24px;
  color: var(--error);
}
.site-notice__heading {
  margin: 0;
  font-weight: 600;
}
.site-notice__text {
  margin: 2px 0 0;
  font-size: 14px;
  color: var(--dark-grey);
  overflow-wrap: anywhere;
}
.site-notice__close {
  padding: 6px !important;
  border: none;
  background: transparent;
  color: var(--grey);
  font-size: 20px !important;
  cursor: pointer;
}
.site-notice__close:hover {
  color: var(--dark-grey);
}
</style>
