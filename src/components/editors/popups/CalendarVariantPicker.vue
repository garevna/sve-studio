<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupCalendarModel, PopupModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PopupFrame from '@/components/templates/popups/PopupFrame.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { CALENDAR_VARIANTS, frameFor, newCalendar } from '@/configs/popup-looks'
  import { t } from '@/i18n'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // A new date popup starts here: every variant of the calendar as a small
  // live sample, side by side. One is picked, then the popup's settings
  // open (PopupsView.vue). A variant the client's set already has a model
  // of is shown in that model's colours; any other in its preset's.
  const open = defineModel<boolean>({ default: false })
  const emit = defineEmits<{ pick: [variant: PopupCalendarModel['variant']] }>()
  const sitePopups = useSitePopups()

  // Samples are shown, not edited.
  provideEditorMode(computed<EditorMode>(() => 'preview'))

  function calendarFor (variant: PopupCalendarModel['variant']): PopupCalendarModel {
    return sitePopups.calendars.value.find(calendar => calendar.variant === variant) ?? newCalendar(variant, '', `sample-${variant}`)
  }
  function words (text: string): TranslatedModel {
    return { uk: text, en: text, de: text } as TranslatedModel
  }
  function sample (variant: PopupCalendarModel['variant']): PopupModel {
    return {
      id: `variant-${variant}`,
      name: '',
      kind: 'date',
      placement: 'center',
      calendar: calendarFor(variant).id,
      title: words(t('calendars.sampleTitle')),
      content: { type: 'section-with-free-content', children: [] } as PopupModel['content'],
    }
  }
  const look = computed(() => sitePopups.looks.value[0] ?? { id: '', name: '', base: 'centered' as const })

</script>

<template>
  <v-dialog v-model="open" max-width="1180" scrollable>
    <v-card class="editor-dialog" theme="editorTheme">
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="variant-picker-title">{{ t('calendars.pickTitle') }}</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="open = false" />
      </v-toolbar>
      <v-card-text>
        <p class="variant-picker-hint">{{ t('calendars.pickHint') }}</p>
        <div class="variant-picker-grid">
          <button
            v-for="variant of CALENDAR_VARIANTS"
            :key="variant.id"
            class="variant-picker-card"
            type="button"
            @click="emit('pick', variant.id); open = false"
          >
            <span class="variant-picker-name">
              <v-icon :icon="variant.icon" size="18" />
              {{ t(`calendars.variants.${variant.id}`) }}
            </span>
            <!-- A live sample, made small; it cannot be clicked into. -->
            <span aria-hidden="true" class="variant-picker-stage">
              <span
                :class="['pw-popup', 'pw-popup--center', 'variant-picker-frame', frameFor(look, sample(variant.id), calendarFor(variant.id)).class, EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]"
                :style="frameFor(look, sample(variant.id), calendarFor(variant.id)).style"
              >
                <PopupFrame :calendar="calendarFor(variant.id)" :popup="sample(variant.id)" />
              </span>
            </span>
          </button>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.variant-picker-title {
  font-size: 1rem;
  font-weight: 600;
}
.variant-picker-hint {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: #7A8699;
}
.variant-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
.variant-picker-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--sve-border);
  border-radius: 12px;
  background: var(--sve-surface);
  color: var(--sve-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.variant-picker-card:hover,
.variant-picker-card:focus-visible {
  border-color: var(--sve-primary);
  box-shadow: 0 0 0 1px var(--sve-primary);
  outline: none;
}
.variant-picker-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
/* The sample at 55% of its size, on the dimmed page it would sit on. */
.variant-picker-stage {
  display: block;
  height: 300px;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(33, 33, 33, 0.32);
  pointer-events: none;
}
.variant-picker-frame {
  display: flex;
  width: 420px;
  height: auto;
  margin: 12px 0 0 50%;
  transform: translateX(-50%) scale(0.55);
  transform-origin: top center;
}
</style>
