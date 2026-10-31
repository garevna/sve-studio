<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'
  import { kitLabels } from '../labels'
  import { topBarExtras } from '../top-bar-extras'
  import SveIconButton from './SveIconButton.vue'
  import SveLookMenu from './SveLookMenu.vue'

  // The bar at the top of every editor screen - the same everywhere; only
  // what is on it changes:
  //   start   - "back" and the screen's title (or the #start slot);
  //   center  - the screen's own switches (#center);
  //   actions - the screen's actions, right-aligned (#actions). A screen
  //             can also send buttons here from deep inside its content -
  //             see SveTopBarActions.
  // The colour-scheme picker closes the actions on every bar.
  const props = defineProps<{
    title?: string
    subtitle?: string
    back?: RouteLocationRaw
    backLabel?: string
  }>()
</script>

<template>
  <header class="sve-ui sve-topbar">
    <div class="sve-topbar__start">
      <SveIconButton
        v-if="props.back"
        icon="mdi-arrow-left"
        :label="props.backLabel || kitLabels.back"
        :to="props.back"
      />
      <slot name="start">
        <div v-if="props.title" class="sve-topbar__titles">
          <div class="sve-topbar__title">{{ props.title }}</div>
          <div v-if="props.subtitle" class="sve-topbar__subtitle">{{ props.subtitle }}</div>
        </div>
      </slot>
    </div>
    <div v-if="$slots.center" class="sve-topbar__center">
      <slot name="center" />
    </div>
    <div class="sve-topbar__actions">
      <slot name="actions" />
      <!-- Where SveTopBarActions sends its buttons. -->
      <div id="sve-topbar-actions" class="sve-topbar__teleport" />
      <!-- The app's own additions (addTopBarItem), then, always last, the
        editor's own colour scheme. -->
      <component :is="item" v-for="(item, index) of topBarExtras" :key="index" />
      <SveLookMenu />
    </div>
  </header>
</template>
