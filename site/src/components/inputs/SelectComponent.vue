<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useCommonStore } from '@/stores/common'

  // Verbatim from production's own components/inputs/SelectComponent.vue -
  // the popover PassengersNumber opens. It is imported there (not registered
  // globally), which is why the ported copy lost it and Vue warned "Failed to
  // resolve component: select-component".
  //
  // The one swap is the save button's caption: production reads it from i18n
  // ($t('buttons.save')), and this app has no i18n at all, so the same three
  // strings from locales/parts/buttons.ts are spelled out and picked by the
  // current locale - the same shape every other ported file here uses.
  const { locale } = storeToRefs(useCommonStore())

  const saveLabel = {
    uk: 'Зберегти',
    en: 'Save',
    de: 'Speichern',
  }

  const saveText = computed(() => saveLabel[locale.value as keyof typeof saveLabel] || saveLabel.uk)

  const open = ref(false)
</script>

<template>
  <v-menu
    v-model="open"
    :close-on-content-click="false"
    location="bottom center"
    location-strategy="connected"
  >
    <template #activator="{ props }">
      <v-btn class="simple-menu-activator justify-start" v-bind="props" @click="open = true">
        <slot name="button" />
      </v-btn>
    </template>

    <v-card class="selection-card" style="z-index: 2000 !important">
      <slot name="content" />
      <div class="text-center ma-4">
        <v-btn class="primary-button" :text="saveText" @click="open = false" />
      </div>
      <v-overlay
        v-model="open"
        absolute
        class="select-component-overlay"
        :opacity="0.5"
        @click="open = false"
      />
    </v-card>
  </v-menu>
</template>

<style scoped>
.selection-card {
  width: 290px;
  border: none;
  border-radius: var(--default-border-radius) !important;
  background: var(--light-grey-2);
}
</style>
