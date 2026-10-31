<script setup lang="ts">
  import { SveBadge, SveButton, SveDockItem, SveMenu, SveMenuItem, SveMenuLabel } from '@sve/editor-ui'
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useCommonStore } from '@/stores/common'
  import { localeDisplayName, missingTranslations, siteLocales } from '@/utils/locale-text'

  // The content language being edited (global.json "locales"). There is one
  // value for the whole editor (commonStore.locale), so switching it inside
  // a dialog switches the page behind it too - every language can be filled
  // in without closing the window.
  //
  //   variant="buttons" - a row of language buttons, for a dialog's bottom bar;
  //   variant="dock"    - the same drop-down from a phone's bottom dock;
  //   variant="menu"    - one compact button with a drop-down, for the
  //                       editor's top bar.
  //
  // `scope` is what the warning badges count missing texts in: the object
  // the dialog edits. Left out, no counts are shown.
  const props = withDefaults(defineProps<{
    scope?: unknown
    variant?: 'buttons' | 'menu' | 'dock'
  }>(), {
    scope: undefined,
    variant: 'buttons',
  })

  const commonStore = useCommonStore()
  const { t } = useI18n()

  const locales = computed(() => siteLocales())
  const missing = computed<Record<string, number>>(() => props.scope === undefined ? {} : missingTranslations(props.scope))
  const missingTotal = computed(() => Object.values(missing.value).reduce((sum, count) => sum + count, 0))

  function hint (code: string): string {
    const count = missing.value[code] ?? 0
    return count > 0
      ? `${localeDisplayName(code)} · ${t('translations.missingCount', { count })}`
      : localeDisplayName(code)
  }
</script>

<template>
  <!-- One language means nothing to switch. -->
  <template v-if="locales.length > 1">
    <v-btn-toggle
      v-if="variant === 'buttons'"
      class="locale-switcher"
      color="primary"
      density="compact"
      mandatory
      :model-value="commonStore.locale"
      variant="outlined"
      @update:model-value="commonStore.setLocale($event)"
    >
      <v-btn
        v-for="code in locales"
        :key="code"
        size="small"
        :value="code"
      >
        <v-badge
          color="warning"
          :content="missing[code]"
          floating
          :model-value="(missing[code] ?? 0) > 0"
        >
          {{ code.toUpperCase() }}
        </v-badge>
        <v-tooltip activator="parent" location="top">{{ hint(code) }}</v-tooltip>
      </v-btn>
    </v-btn-toggle>

    <SveMenu v-else :location="variant === 'dock' ? 'top' : 'bottom end'" :min-width="220">
      <template #activator="{ props: menuProps }">
        <SveDockItem v-if="variant === 'dock'" icon="mdi-web" :label="commonStore.locale.toUpperCase()" v-bind="menuProps">
          <SveBadge v-if="missingTotal > 0" tone="warning">{{ missingTotal }}</SveBadge>
        </SveDockItem>
        <SveButton
          v-else
          icon="mdi-web"
          icon-end="mdi-chevron-down"
          variant="ghost"
          v-bind="menuProps"
        >
          {{ commonStore.locale.toUpperCase() }}
          <SveBadge v-if="missingTotal > 0" tone="warning">{{ missingTotal }}</SveBadge>
        </SveButton>
      </template>
      <SveMenuLabel>Мова контенту</SveMenuLabel>
      <SveMenuItem
        v-for="code in locales"
        :key="code"
        :hint="(missing[code] ?? 0) > 0 ? String(missing[code]) : undefined"
        :icon="code === commonStore.locale ? 'mdi-check' : 'mdi-blank'"
        @click="commonStore.setLocale(code)"
      >
        {{ code.toUpperCase() }} · {{ localeDisplayName(code) }}
      </SveMenuItem>
    </SveMenu>
  </template>
</template>

<style scoped>
/* Many languages wrap onto a second row instead of pushing the dialog's
   OK button off a phone screen. */
.locale-switcher {
  flex-wrap: wrap;
  height: auto !important;
}
/* The counts of untranslated texts stick out of the buttons a little; a
   scrolling group drew a scrollbar under the languages for that. */
.v-btn-group.locale-switcher {
  overflow: visible;
}
.locale-switcher :deep(.v-btn) {
  min-width: 44px;
}
</style>
