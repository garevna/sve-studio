<script setup lang="ts">
  import type { PopupCalendarModel, PopupLookModel, PopupModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import FeedbackCard from '../../components/template-components/FeedbackCard.vue'
  import { POPUP_WORDS } from '../../configs/popup-kinds'
  import { buttonsFor, calendarOf, frameFor, lookOf, textClassOf, titleClassOf } from '../../configs/popup-looks'
  import { useCommonStore } from '../../stores/common'
  import { usePopupsStore } from '../../stores/popups'
  import PopupAnswer from './PopupAnswer.vue'

  // The site's popups (content/settings/popups.json), mounted once for the
  // whole site (App.vue). Each is open while its flag in the popups store
  // is set; anything clickable on any page sets it.
  //
  // Every popup is the same frame (content/styles/popups.css): the close
  // cross in its corner, the title, then its own middle and its row of
  // buttons - a feedback form (FeedbackCard.vue, sent to the site's
  // channel) or anything else (PopupAnswer.vue). Where it appears:
  //   left / right - a panel from that edge, the screen's full height;
  //   bottom       - a sheet from below, as wide as the screen;
  //   center       - a window in the middle.
  // The editor draws the same window (PopupFrame.vue).
  const { locale, defaultLocale } = storeToRefs(useCommonStore())
  const popupsStore = usePopupsStore()
  const { open } = storeToRefs(popupsStore)
  // The store's own (deeply unwrapped) type, read back as the model.
  const items = computed(() => popupsStore.items as PopupModel[])
  // Each popup's look (UI Kit "Попапи") and, for a date, its calendar.
  const look = (popup: PopupModel) => lookOf(popupsStore.looks as PopupLookModel[], popup)
  const calendar = (popup: PopupModel) => calendarOf(popupsStore.calendars as PopupCalendarModel[], popup)

  // Another page (a link inside a popup, say): nothing stays open over it.
  const route = useRoute()
  watch(() => route.fullPath, () => popupsStore.hideAll())

  const DEFAULT_WIDTH: Record<PopupModel['placement'], number> = { left: 420, right: 420, bottom: 0, center: 480 }
  function widthOf (popup: PopupModel): string | undefined {
    const width = popup.width || DEFAULT_WIDTH[popup.placement]
    return width ? `${width}px` : undefined
  }
  const closeLabel = computed(() => POPUP_WORDS.close[locale.value as 'uk'] || POPUP_WORDS.close.en)
  function wordsOf (value: unknown): string {
    const words = value as Record<string, string> | undefined
    return words?.[locale.value] || words?.[defaultLocale.value] || ''
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
    <div
      :class="['pw-popup', `pw-popup--${popup.placement}`, `pw-popup--${popup.kind || 'content'}`, frameFor(look(popup), popup, calendar(popup)).class, { 'pw-popup--error': popup.kind === 'message' && popup.tone === 'error' }]"
      :style="frameFor(look(popup), popup, calendar(popup)).style"
    >
      <!-- A date popup has no title bar: its calendar's strip is its header. -->
      <div v-if="popup.kind !== 'date'" class="pw-popup__head">
        <h3
          v-if="wordsOf(popup.title)"
          :class="['pw-popup__title', titleClassOf(look(popup), popup), { 'pw-popup__title--own': !!titleClassOf(look(popup), popup) }]"
        >
          {{ wordsOf(popup.title) }}
        </h3>
        <button :aria-label="closeLabel" class="pw-popup__close" type="button" @click="popupsStore.hide(popup.id)">
          <i aria-hidden="true" class="mdi mdi-close" />
        </button>
      </div>
      <FeedbackCard
        v-if="popup.kind === 'feedback'"
        :button-class="buttonsFor(look(popup), popup).main"
        framed
        :text="popup.text || ''"
        :text-class="textClassOf(look(popup), popup)"
        title=""
        :type="popup.feedbackType"
        @close="popupsStore.answer(popup.id, true)"
      />
      <PopupAnswer
        v-else
        :about="popupsStore.context[popup.id] || ''"
        :calendar="calendar(popup)"
        :main-class="buttonsFor(look(popup), popup, calendar(popup)).main"
        :popup="popup"
        :second-class="buttonsFor(look(popup), popup, calendar(popup)).second"
        :text-class="textClassOf(look(popup), popup)"
        @answer="(value: unknown) => popupsStore.answer(popup.id, value)"
        @cancel="popupsStore.hide(popup.id)"
      />
    </div>
  </v-dialog>
</template>
