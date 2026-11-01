<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { mobilePanelStyle } from '../../configs/menu-style'
  import { useCommonStore } from '../../stores/common'
  import MobileMenuButton from './MobileMenuButton.vue'
  import MobileMenuRow from './MobileMenuRow.vue'

  // The menu a phone opens from the burger button: a panel built of rows,
  // all of it set in the UI Kit (global.json menuStyle.mobile, see
  // configs/menu-style.ts) - where it comes from, its corners and fill,
  // and which rows it has in which order.
  const { menuStyle } = storeToRefs(useCommonStore())
  const look = computed(() => menuStyle.value.mobile)

  const mobileMenuState = defineModel({ default: false })

  const transition = computed(() => {
    if (look.value.placement === 'left') return 'slide-x-transition'
    if (look.value.placement === 'right') return 'slide-x-reverse-transition'
    return 'dialog-bottom-transition'
  })

  function close () {
    mobileMenuState.value = false
  }
</script>

<template>
  <v-dialog
    v-model="mobileMenuState"
    content-class="mobile-menu-dialog"
    fullscreen
    :transition="transition"
  >
    <template #activator="{ props: activatorProps }">
      <MobileMenuButton v-model="mobileMenuState" v-bind="activatorProps" />
    </template>

    <!-- The dialog covers the screen; the panel is placed in it, and a tap
      beside a smaller panel closes the menu. -->
    <div class="mobile-menu-stage" @click.self="close">
      <nav
        :class="['mobile-menu-panel', `mobile-menu-panel--${look.placement}`]"
        :style="mobilePanelStyle(look)"
      >
        <v-btn
          aria-label="Close"
          class="mobile-menu-close"
          icon="mdi-close"
          variant="text"
          @click="close"
        />
        <MobileMenuRow
          v-for="(row, index) of look.rows"
          :key="index"
          :look="look"
          :row="row"
          @navigate="close"
        />
      </nav>
    </div>
  </v-dialog>
</template>

<style>
/* Not scoped: Vuetify draws the dialog outside this component. The theme
   rounds and fills every dialog (vuetify-overlay-content.css); this one is
   only a stage for the panel, which has its own look. */
.v-dialog.v-dialog--fullscreen > .v-overlay__content.mobile-menu-dialog {
  min-width: 0;
  border-radius: 0 !important;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}
</style>

<style scoped>
.mobile-menu-stage {
  position: relative;
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 0.32);
}
.mobile-menu-panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.mobile-menu-panel--full {
  inset: 0;
}
.mobile-menu-panel--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 92dvh;
}
.mobile-menu-panel--left,
.mobile-menu-panel--right {
  top: 0;
  bottom: 0;
  width: min(var(--mobile-menu-width, 320px), calc(100% - 48px));
}
.mobile-menu-panel--left {
  left: 0;
}
.mobile-menu-panel--right {
  right: 0;
}
/* Quiet, not black (see the feedback popup's own). */
.mobile-menu-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  color: var(--grey);
}
/* Room for the close button above the first row - inside that row, so a
   row with a fill reaches the panel's top edge. */
.mobile-menu-panel > :deep(.mobile-menu-row:first-of-type) {
  padding-top: 56px;
}
</style>
