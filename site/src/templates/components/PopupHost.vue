<script setup lang="ts">
  import type { PopupModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useCommonStore } from '../../stores/common'
  import { usePopupsStore } from '../../stores/popups'
  import TemplateItem from '../TemplateItem.vue'

  // The site's popups (content/settings/popups.json), mounted once for the
  // whole site (App.vue). Each is one of four fixed windows - where it
  // appears - with the popup's own blocks inside, and is open while its
  // flag in the popups store is set; any button on any page sets it.
  //   left / right - a panel from that edge, the screen's full height, its
  //                  `width` (at most the screen's);
  //   bottom       - a sheet from below, as wide as the screen;
  //   center       - a window in the middle, its `width`.
  // Inside: an optional title, a quiet close button, and the blocks. The
  // editor draws the same window in PopupEditorDialog.vue.
  const { locale, defaultLocale } = storeToRefs(useCommonStore())
  const popupsStore = usePopupsStore()
  const { open } = storeToRefs(popupsStore)
  // The store's own (deeply unwrapped) type, read back as the model.
  const items = computed(() => popupsStore.items as PopupModel[])

  // Another page (a link inside a popup, say): nothing stays open over it.
  const route = useRoute()
  watch(() => route.fullPath, () => popupsStore.hideAll())

  const DEFAULT_WIDTH: Record<PopupModel['placement'], number> = { left: 420, right: 420, bottom: 0, center: 640 }
  function widthOf (popup: PopupModel): string | undefined {
    const width = popup.width || DEFAULT_WIDTH[popup.placement]
    return width ? `${width}px` : undefined
  }
  const CLOSE: Record<string, string> = { uk: 'Закрити', en: 'Close', de: 'Schließen' }
  const closeLabel = computed(() => CLOSE[locale.value] || CLOSE.en)
  function titleOf (popup: PopupModel): string {
    const title = popup.title as Record<string, string> | undefined
    return title?.[locale.value] || title?.[defaultLocale.value] || ''
  }
</script>

<template>
  <v-dialog
    v-for="popup of items"
    :key="popup.id"
    :content-class="`pw-popup-overlay pw-popup-overlay--${popup.placement}`"
    :model-value="!!open[popup.id]"
    scrollable
    :transition="`pw-popup-${popup.placement}`"
    :width="widthOf(popup)"
    @update:model-value="(shown: boolean) => !shown && popupsStore.hide(popup.id)"
  >
    <div :class="['pw-popup', `pw-popup--${popup.placement}`]">
      <div class="pw-popup__head">
        <h3 v-if="titleOf(popup)" class="pw-popup__title">{{ titleOf(popup) }}</h3>
        <button :aria-label="closeLabel" class="pw-popup__close" type="button" @click="popupsStore.hide(popup.id)">
          <i aria-hidden="true" class="mdi mdi-close" />
        </button>
      </div>
      <div class="pw-popup__body">
        <template-item v-for="(child, index) of popup.content.children || []" :key="index" :item="child" />
      </div>
    </div>
  </v-dialog>
</template>

<style>
/* Not scoped: the window's frame is Vuetify's own element, teleported. */
.pw-popup-overlay.v-overlay__content {
  margin: 0 !important;
  max-width: 100% !important;
  max-height: 100% !important;
}
/* The theme stretches every dialog to the full width and rounds its frame
   (vuetify-overlay-content.css); a popup keeps its own width, and its
   corners are the panel's. */
.v-dialog:not(.v-bottom-sheet) > .v-overlay__content.pw-popup-overlay {
  min-width: 0;
  border-radius: 0 !important;
}
.pw-popup-overlay--left.v-overlay__content,
.pw-popup-overlay--right.v-overlay__content {
  position: fixed !important;
  top: 0;
  bottom: 0;
  height: 100%;
}
.pw-popup-overlay--left.v-overlay__content { left: 0; }
.pw-popup-overlay--right.v-overlay__content { right: 0; }
.pw-popup-overlay--bottom.v-overlay__content {
  position: fixed !important;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100% !important;
  max-height: 85vh !important;
}
.pw-popup-overlay--center.v-overlay__content {
  max-width: calc(100vw - 32px) !important;
  max-height: calc(100vh - 32px) !important;
}

.pw-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--white);
  overflow: hidden;
}
.pw-popup--left { border-radius: 0 var(--large-border-radius) var(--large-border-radius) 0; }
.pw-popup--right { border-radius: var(--large-border-radius) 0 0 var(--large-border-radius); }
.pw-popup--bottom { border-radius: var(--large-border-radius) var(--large-border-radius) 0 0; }
.pw-popup--center { border-radius: var(--large-border-radius); }
.pw-popup__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 0 24px;
}
.pw-popup__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-family: var(--main-font);
  font-size: 20px;
  font-weight: 600;
  color: var(--black);
}
.pw-popup__close {
  display: inline-flex;
  margin-left: auto;
  padding: 6px !important;
  border: none;
  border-radius: 50% !important;
  background: transparent;
  color: var(--grey);
  font-size: 24px !important;
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s ease;
}
.pw-popup__close:hover {
  color: var(--dark-grey);
}
.pw-popup__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px 24px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* A form in a popup: the window is its frame - no card of its own inside
   it (a card in a window looked like a popup in a popup), the window's
   whole width, no room of its own above and below. */
.pw-popup .feedback-form-block {
  display: block !important;
  padding-block: 0 !important;
}
.pw-popup .feedback-form-block .footer-feedback-card {
  min-width: 0 !important;
  max-width: none !important;
  width: 100%;
  padding: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* coming in from where they sit */
.pw-popup-left-enter-active, .pw-popup-left-leave-active,
.pw-popup-right-enter-active, .pw-popup-right-leave-active,
.pw-popup-bottom-enter-active, .pw-popup-bottom-leave-active,
.pw-popup-center-enter-active, .pw-popup-center-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}
.pw-popup-left-enter-from, .pw-popup-left-leave-to { transform: translateX(-100%); }
.pw-popup-right-enter-from, .pw-popup-right-leave-to { transform: translateX(100%); }
.pw-popup-bottom-enter-from, .pw-popup-bottom-leave-to { transform: translateY(100%); }
.pw-popup-center-enter-from, .pw-popup-center-leave-to { transform: scale(0.96); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .pw-popup-left-enter-active, .pw-popup-left-leave-active,
  .pw-popup-right-enter-active, .pw-popup-right-leave-active,
  .pw-popup-bottom-enter-active, .pw-popup-bottom-leave-active,
  .pw-popup-center-enter-active, .pw-popup-center-leave-active {
    transition: none;
  }
}
</style>
