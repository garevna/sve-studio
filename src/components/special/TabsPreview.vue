<script lang="ts" setup>
  import type { ButtonEntry } from '@/utils/button-style-entry'
  import { computed, ref } from 'vue'
  import { TAB_STYLE_CLASS } from '@/configs/tab-classes'
  import { buttonPreviewVars } from '@/utils/button-preview-vars'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // A working tab strip, driven by the classes actually being edited above.
  //
  // Tabs need a different demonstration from buttons: a button shows its
  // whole story on its own (normal, hover, disabled - all visible on one
  // element), while a tab's story is that ONE of a group carries the active
  // class and the others don't. A row of three isolated preview buttons
  // could never show that, so this is one real strip that switches.
  //
  // The strip's own backing plate is a class too (auth-page-tabs: the
  // light-grey-2 background and the large radius), so it is edited here
  // alongside the tabs it holds rather than sitting in the button list
  // pretending to be a button.
  //
  // Like the button previews, this renders its own elements driven by CSS
  // custom properties rather than putting the real class names on them: the
  // theme's own rules are !important, so real classes would ignore whatever
  // is being edited and the preview would never move.
  const props = defineProps<{
    entries: ButtonEntry[]
    // Which plate class this context sits on - the tab buttons themselves
    // are identical everywhere, and the plate is the whole difference
    // between the login page and the rest of the site.
    plateClass: string
    tabs?: readonly string[]
  }>()

  const DEFAULT_TABS = ['Вхід', 'Реєстрація', 'Профіль']
  const tabLabels = computed(() => props.tabs || DEFAULT_TABS)

  const activeIndex = ref(0)

  function entryFor (className: string): ButtonEntry | undefined {
    return props.entries.find(entry => entry.className === className)
  }

  const stripVars = computed(() => buttonPreviewVars(entryFor(props.plateClass)))
  const idleVars = computed(() => buttonPreviewVars(entryFor(TAB_STYLE_CLASS.idle)))
  const activeVars = computed(() => buttonPreviewVars(entryFor(TAB_STYLE_CLASS.active)))

  // The disabled tab is a normal tab that happens to be disabled - it reads
  // the same class, so its :disabled state is the one being edited on
  // .tab-button, not a fourth style of its own.
  function tabVars (index: number): Record<string, string> {
    return index === activeIndex.value ? activeVars.value : idleVars.value
  }
</script>

<template>
  <!-- The theme class has to be on a real element: --large-border-radius and
    the palette variables only resolve under it, and <v-theme-provider>
    alone renders no DOM of its own. Same lesson the button previews above
    already learned. -->
  <v-theme-provider :theme="APP_THEME_NAME">
    <div :class="themeClass(APP_THEME_NAME)">
      <div class="tabs-preview-strip" :style="stripVars">
        <button
          v-for="(label, index) of tabLabels"
          :key="label"
          class="tabs-preview-tab"
          :class="{ 'tabs-preview-tab--active': index === activeIndex }"
          :style="tabVars(index)"
          @click="activeIndex = index"
        >
          {{ label }}
        </button>
        <button class="tabs-preview-tab" disabled :style="idleVars">
          Недоступна
        </button>
      </div>
    </div>
  </v-theme-provider>
</template>

<style scoped>
/* The strip: background and radius come from the edited class, the padding
   and layout are what a tab row is - not something the class decides. */
.tabs-preview-strip {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  background: var(--btn-bg, transparent);
  border-radius: var(--btn-radius, 0);
}
.tabs-preview-tab {
  padding: 10px 20px;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  outline: none;
  background: var(--btn-bg, transparent);
  color: var(--btn-color, inherit);
  border: var(--btn-border, none);
  border-radius: var(--btn-radius, 0);
  box-shadow: var(--btn-shadow, none);
  opacity: var(--btn-opacity, 1);
}
/* Hover belongs to a tab that is neither the current one nor disabled -
   the same rule the site follows. Stated explicitly rather than left to the
   variable fallbacks: the active tab reads its own class, which sets no
   hover of its own, so it happens to stay put - but "happens to" is not
   something to rely on when the designer starts setting hover values. */
.tabs-preview-tab:not(.tabs-preview-tab--active):hover:not(:disabled) {
  background: var(--btn-hover-bg, var(--btn-bg, transparent));
  color: var(--btn-hover-color, var(--btn-color, inherit));
  border: var(--btn-hover-border, var(--btn-border, none));
  border-radius: var(--btn-hover-radius, var(--btn-radius, 0));
  box-shadow: var(--btn-hover-shadow, var(--btn-shadow, none));
  opacity: var(--btn-hover-opacity, var(--btn-opacity, 1));
}
.tabs-preview-tab:disabled {
  cursor: not-allowed;
  background: var(--btn-disabled-bg, var(--btn-bg, transparent));
  color: var(--btn-disabled-color, var(--btn-color, inherit));
  border: var(--btn-disabled-border, var(--btn-border, none));
  border-radius: var(--btn-disabled-radius, var(--btn-radius, 0));
  box-shadow: var(--btn-disabled-shadow, var(--btn-shadow, none));
  opacity: var(--btn-disabled-opacity, var(--btn-opacity, 1));
}
</style>
