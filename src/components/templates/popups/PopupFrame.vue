<script setup lang="ts">
  import type { PopupCalendarModel, PopupModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import FeedbackCard from '@/components/templates/sections/FeedbackCard.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { buttonsFor, calendarOf, lookOf, textClassOf, titleClassOf } from '@/configs/popup-looks'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'
  import { APP_THEME_NAME } from '@/utils/vuetify-theme-names'
  import PopupMiddle from './PopupMiddle.vue'

  // One popup's window inside, as the site draws it (site PopupHost.vue,
  // content/styles/popups.css): the close cross in its corner, the title,
  // then its own middle and its row of buttons. Used being edited
  // (PopupEditPanel.vue) and in a preview (PopupPreviewDialog.vue); what
  // is around it - the dialog, where it appears - is theirs.
  const props = defineProps<{
    popup: PopupModel
    // a calendar not (yet) in the client's set - a variant's sample
    calendar?: PopupCalendarModel
  }>()
  const emit = defineEmits<{ close: [] }>()
  const mode = useEditorMode()
  const commonStore = useCommonStore()

  const title = computed(() => resolveLocaleText(props.popup.title, commonStore.locale))
  // Its look and calendar, from the client's sets (UI Kit).
  const sitePopups = useSitePopups()
  const look = computed(() => lookOf(sitePopups.looks.value, props.popup))
  const buttons = computed(() => buttonsFor(look.value, props.popup, calendar.value))
  const titleClass = computed(() => titleClassOf(look.value, props.popup))
  const textClass = computed(() => textClassOf(look.value, props.popup))
  const calendar = computed(() => props.calendar ?? calendarOf(sitePopups.calendars.value, props.popup))
  const text = computed(() => resolveLocaleText(props.popup.text, commonStore.locale))
</script>

<template>
  <!-- A date popup has no title bar: its calendar's strip is its header. -->
  <div v-if="popup.kind !== 'date'" class="pw-popup__head">
    <h3 v-if="title" :class="['pw-popup__title', titleClass, { 'pw-popup__title--own': !!titleClass }]">{{ title }}</h3>
    <button class="pw-popup__close" :disabled="mode === 'edit'" type="button" @click="emit('close')">
      <i aria-hidden="true" class="mdi mdi-close" />
    </button>
  </div>
  <!-- The site's own theme for what is inside: without it the fields and
    buttons wore the editor's. -->
  <v-theme-provider :theme="APP_THEME_NAME">
    <FeedbackCard
      v-if="popup.kind === 'feedback'"
      :button-class="buttons.main"
      framed
      :text="text"
      :text-class="textClass"
      title=""
      :type="popup.feedbackType"
    />
    <PopupMiddle
      v-else
      :calendar="calendar"
      :main-class="buttons.main"
      :popup="popup"
      :second-class="buttons.second"
      :text-class="textClass"
      @close="emit('close')"
    />
  </v-theme-provider>
</template>
