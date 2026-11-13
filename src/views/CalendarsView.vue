<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupCalendarModel, PopupModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, onMounted, ref } from 'vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ButtonVariantSelect from '@/components/special/ButtonVariantSelect.vue'
  import EditModeScope from '@/components/special/EditModeScope.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import PopupFrame from '@/components/templates/popups/PopupFrame.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { CALENDAR_PRESETS, CALENDAR_SCHEMES, CALENDAR_VARIANTS, frameFor, newCalendar } from '@/configs/popup-looks'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // UI Kit "Календар": the client's own calendars, for date popups (each
  // date popup in the "Попапи" section picks one by name). Two of ours to
  // start from (configs/popup-looks.ts): Vuetify's plain calendar, and the
  // theme's own - the month large on a strip, the arrows at the right, the
  // week from Monday (content/styles/date-picker.css). Set up here: the
  // colours of the chosen day and of today, the first day of the week.
  //
  // Edited like the buttons and the popup looks: a row opens under itself,
  // the settings on the left, a sample date popup on the right.
  const sitePopups = useSitePopups()
  const calendars = sitePopups.calendars
  onMounted(() => sitePopups.load())

  provideEditorMode(computed<EditorMode>(() => 'preview'))

  const expanded = ref<string | null>(null)
  function toggle (id: string) {
    expanded.value = expanded.value === id ? null : id
  }

  function add (variant: PopupCalendarModel['variant']) {
    const calendar = newCalendar(variant, t('calendars.newName', { n: calendars.value.length + 1 }), sitePopups.newId('calendar'))
    calendars.value.push(calendar)
    expanded.value = calendar.id
  }
  function duplicate (calendar: PopupCalendarModel) {
    const copy: PopupCalendarModel = { ...calendar, id: sitePopups.newId('calendar'), name: t('popupLooks.copyName', { name: calendar.name }) }
    calendars.value.splice(calendars.value.indexOf(calendar) + 1, 0, copy)
    expanded.value = copy.id
  }
  function users (calendar: PopupCalendarModel) {
    return sitePopups.popups.value.filter(popup => popup.kind === 'date' && (popup.calendar ?? calendars.value[0]?.id) === calendar.id)
  }
  // The date popups that use it take the first calendar in its place.
  async function remove (calendar: PopupCalendarModel) {
    const using = users(calendar)
    const sure = await useUiFeedbackStore().confirm({
      title: t('popupLooks.deleteTitle', { name: calendar.name }),
      text: using.length > 0 ? t('popupLooks.deleteUsed', { popups: using.map(popup => popup.name).join(', ') }) : t('confirm.irreversible'),
    })
    if (!sure) return
    calendars.value.splice(calendars.value.indexOf(calendar), 1)
    for (const popup of using) delete popup.calendar
  }

  function words (text: string): TranslatedModel {
    return { uk: text, en: text, de: text } as TranslatedModel
  }
  // A date popup in the first popup look, with this calendar.
  function samplePopup (calendar: PopupCalendarModel): PopupModel {
    return {
      id: `sample-${calendar.id}`,
      name: '',
      kind: 'date',
      placement: 'center',
      calendar: calendar.id,
      title: words(t('calendars.sampleTitle')),
      content: { type: 'section-with-free-content', children: [] },
    }
  }
  // The sample's window: the first popup look, with this calendar's own
  // corners and buttons over it.
  function frameOf (calendar: PopupCalendarModel) {
    return frameFor(sitePopups.looks.value[0] ?? { id: '', name: '', base: 'centered' }, samplePopup(calendar), calendar)
  }

  const RADII = ['extra-small-border-radius', 'small-border-radius', 'default-border-radius', 'large-border-radius', 'super-border-radius']

  // A detail as the calendar shows it: its own, else its preset's.
  type Detail = keyof typeof CALENDAR_PRESETS['simple']
  function valueOf (calendar: PopupCalendarModel, key: Detail): string | number {
    return (calendar[key] ?? CALENDAR_PRESETS[calendar.variant][key] ?? '') as string | number
  }
  // A preset puts all its details in place (the name, the corners and the
  // buttons of the window stay).
  function applyPreset (calendar: PopupCalendarModel, variant: PopupCalendarModel['variant']) {
    Object.assign(calendar, { variant, ...CALENDAR_PRESETS[variant] })
  }
  function textOf (calendar: PopupCalendarModel, key: Detail): string {
    return String(valueOf(calendar, key))
  }
  function isScheme (calendar: PopupCalendarModel, colours: Record<string, string | undefined>): boolean {
    return Object.entries(colours).every(([key, value]) => textOf(calendar, key as Detail) === value)
  }
  function setButton (calendar: PopupCalendarModel, which: 'main' | 'second', value: string) {
    calendar.buttons = { ...calendar.buttons, [which]: value.split(' ').find(token => token.includes('button')) || undefined }
  }

  const saving = ref(false)
  const undoing = ref(false)
  async function save () {
    saving.value = true
    try {
      await sitePopups.save()
    } finally {
      saving.value = false
    }
  }
  async function undo () {
    undoing.value = true
    try {
      await sitePopups.undo()
    } finally {
      undoing.value = false
    }
  }
</script>

<template>
  <div class="calendars">
    <v-progress-linear v-if="!sitePopups.loaded.value" color="primary" indeterminate />
    <template v-else>
      <p class="calendars-hint">{{ t('calendars.hint') }}</p>

      <div class="calendars-list">
        <div v-for="calendar of calendars" :key="calendar.id" class="calendars-row">
          <div class="calendars-row-head" @click="toggle(calendar.id)">
            <v-icon class="calendars-icon" :icon="CALENDAR_VARIANTS.find(item => item.id === calendar.variant)?.icon" />
            <div class="calendars-names">
              <span class="calendars-name">{{ calendar.name }}</span>
              <span class="calendars-meta">{{ t(`calendars.variants.${calendar.variant}`) }} · {{ t('popupLooks.used', { count: users(calendar).length }) }}</span>
            </div>
            <div class="calendars-actions" @click.stop>
              <ToolbarIconButton icon="mdi-content-copy" :tooltip="t('popupLooks.duplicate')" @click="duplicate(calendar)" />
              <ToolbarIconButton v-if="calendars.length > 1" icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(calendar)" />
              <ToolbarIconButton
                :icon="expanded === calendar.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                :tooltip="t('popupLooks.settings')"
                @click="toggle(calendar.id)"
              />
            </div>
          </div>

          <v-expand-transition>
            <div v-if="expanded === calendar.id" class="calendars-row-body">
              <div class="calendars-fields">
                <v-text-field
                  v-model="calendar.name"
                  density="compact"
                  hide-details
                  :label="t('popupLooks.name')"
                  variant="outlined"
                />

                <!-- A preset fills every detail below; each can then be changed. -->
                <p class="calendars-label">{{ t('calendars.variant') }}</p>
                <div class="calendars-variants">
                  <v-chip
                    v-for="variant of CALENDAR_VARIANTS"
                    :key="variant.id"
                    :color="calendar.variant === variant.id ? 'primary' : undefined"
                    :prepend-icon="variant.icon"
                    size="small"
                    :variant="calendar.variant === variant.id ? 'flat' : 'outlined'"
                    @click="applyPreset(calendar, variant.id)"
                  >
                    {{ t(`calendars.variants.${variant.id}`) }}
                  </v-chip>
                </div>
                <p class="calendars-hint-small">{{ t('calendars.presetHint') }}</p>

                <!-- Colours that go together, for every part at once. -->
                <p class="calendars-group">{{ t('calendars.schemes') }}</p>
                <div class="calendars-schemes">
                  <button
                    v-for="scheme of CALENDAR_SCHEMES"
                    :key="scheme.id"
                    :class="['calendars-scheme', { 'calendars-scheme--on': isScheme(calendar, scheme.colours) }]"
                    type="button"
                    @click="Object.assign(calendar, scheme.colours)"
                  >
                    <span class="calendars-scheme-swatches">
                      <span :style="{ background: `var(--${scheme.colours.headerBackground})` }" />
                      <span :style="{ background: `var(--${scheme.colours.selectedColor})` }" />
                      <span :style="{ background: `var(--${scheme.colours.todayColor})` }" />
                    </span>
                    {{ t(`calendars.schemeNames.${scheme.id}`) }}
                  </button>
                </div>

                <p class="calendars-group">{{ t('calendars.header') }}</p>
                <div class="calendars-colors">
                  <span class="calendars-label">{{ t('calendars.headerBackground') }}</span>
                  <PaletteSwatchPicker :model-value="textOf(calendar, 'headerBackground')" no-transparent @update:model-value="(value: string) => calendar.headerBackground = value" />
                  <span class="calendars-label">{{ t('calendars.headerColor') }}</span>
                  <PaletteSwatchPicker :model-value="textOf(calendar, 'headerColor')" no-transparent @update:model-value="(value: string) => calendar.headerColor = value" />
                </div>
                <div class="calendars-row-inline">
                  <span class="calendars-label">{{ t('calendars.monthWeight') }}</span>
                  <v-btn-toggle
                    class="calendars-toggle"
                    color="primary"
                    density="compact"
                    mandatory
                    :model-value="Number(valueOf(calendar, 'monthWeight'))"
                    variant="outlined"
                    @update:model-value="(value: number) => calendar.monthWeight = value"
                  >
                    <v-btn v-for="weight of [400, 500, 600, 700]" :key="weight" :style="{ fontWeight: weight }" :value="weight">{{ weight }}</v-btn>
                  </v-btn-toggle>
                </div>
                <div class="calendars-colors">
                  <span class="calendars-label">{{ t('calendars.prevIcon') }}</span>
                  <!-- the page is in preview mode for its sample; the icon
                       choice must still open -->
                  <EditModeScope>
                    <IconEditor
                      :appearance="false"
                      :icon="textOf(calendar, 'prevIcon')"
                      icon-color="dark-grey"
                      :icon-size="28"
                      query="mdi-arrow-left|mdi-chevron-left|mdi-chevron-double-left|mdi-menu-left|mdi-pan-left"
                      @update:icon="(value: string) => calendar.prevIcon = value"
                    />
                  </EditModeScope>
                  <span class="calendars-label">{{ t('calendars.nextIcon') }}</span>
                  <EditModeScope>
                    <IconEditor
                      :appearance="false"
                      :icon="textOf(calendar, 'nextIcon')"
                      icon-color="dark-grey"
                      :icon-size="28"
                      query="mdi-arrow-right|mdi-chevron-right|mdi-chevron-double-right|mdi-menu-right|mdi-pan-right"
                      @update:icon="(value: string) => calendar.nextIcon = value"
                    />
                  </EditModeScope>
                </div>

                <p class="calendars-group">{{ t('calendars.weekdays') }}</p>
                <v-btn-toggle
                  class="calendars-toggle"
                  color="primary"
                  density="compact"
                  mandatory
                  :model-value="textOf(calendar, 'weekdayFormat')"
                  variant="outlined"
                  @update:model-value="(value: string) => calendar.weekdayFormat = value as 'narrow' | 'short'"
                >
                  <v-btn value="narrow">{{ t('calendars.weekdayNarrow') }}</v-btn>
                  <v-btn value="short">{{ t('calendars.weekdayShort') }}</v-btn>
                </v-btn-toggle>
                <div class="calendars-colors">
                  <span class="calendars-label">{{ t('calendars.weekdayColor') }}</span>
                  <PaletteSwatchPicker :model-value="textOf(calendar, 'weekdayColor')" no-transparent @update:model-value="(value: string) => calendar.weekdayColor = value" />
                </div>
                <v-switch
                  color="primary"
                  density="compact"
                  hide-details
                  inset
                  :label="t('calendars.fromMonday')"
                  :model-value="(calendar.firstDayOfWeek ?? 1) === 1"
                  @update:model-value="(value: boolean | null) => calendar.firstDayOfWeek = value ? 1 : 0"
                />

                <p class="calendars-group">{{ t('calendars.days') }}</p>
                <v-switch
                  color="primary"
                  density="compact"
                  hide-details
                  inset
                  :label="t('calendars.dayCircle')"
                  :model-value="Number(valueOf(calendar, 'dayRadius')) >= 99"
                  @update:model-value="(value: boolean | null) => calendar.dayRadius = value ? 99 : 4"
                />
                <v-slider
                  v-if="Number(valueOf(calendar, 'dayRadius')) < 99"
                  color="primary"
                  density="compact"
                  hide-details
                  :label="t('calendars.dayRadius', { px: valueOf(calendar, 'dayRadius') })"
                  :max="18"
                  :min="0"
                  :model-value="Number(valueOf(calendar, 'dayRadius'))"
                  :step="1"
                  @update:model-value="(value: number) => calendar.dayRadius = value"
                />
                <div class="calendars-colors">
                  <span class="calendars-label">{{ t('calendars.selectedColor') }}</span>
                  <PaletteSwatchPicker :model-value="textOf(calendar, 'selectedColor')" no-transparent @update:model-value="(value: string) => calendar.selectedColor = value" />
                  <span class="calendars-label">{{ t('calendars.selectedTextColor') }}</span>
                  <PaletteSwatchPicker :model-value="textOf(calendar, 'selectedTextColor')" no-transparent @update:model-value="(value: string) => calendar.selectedTextColor = value" />
                  <span class="calendars-label">{{ t('calendars.todayColor') }}</span>
                  <PaletteSwatchPicker :model-value="textOf(calendar, 'todayColor')" no-transparent @update:model-value="(value: string) => calendar.todayColor = value" />
                </div>

                <!-- The window: its corners and buttons, over the popup look. -->
                <p class="calendars-group">{{ t('calendars.window') }}</p>
                <v-select
                  clearable
                  density="compact"
                  hide-details
                  :items="RADII"
                  :label="t('popupLooks.radius')"
                  :model-value="calendar.radius ?? null"
                  persistent-placeholder
                  :placeholder="t('calendars.asLook')"
                  variant="outlined"
                  @update:model-value="(value: string | null) => calendar.radius = value || undefined"
                />
                <ButtonVariantSelect
                  :class="calendar.buttons?.main ?? ''"
                  :label="t('pagePopups.mainButton')"
                  @update:class="(value: string) => setButton(calendar, 'main', value)"
                />
                <ButtonVariantSelect
                  :class="calendar.buttons?.second ?? ''"
                  :label="t('pagePopups.secondButton')"
                  @update:class="(value: string) => setButton(calendar, 'second', value)"
                />
                <p class="calendars-hint-small">{{ t('calendars.windowHint') }}</p>
              </div>

              <div class="calendars-stage">
                <div
                  :class="['pw-popup', 'pw-popup--center', frameOf(calendar).class, EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]"
                  :style="frameOf(calendar).style"
                >
                  <PopupFrame :key="`${calendar.id}-${calendar.variant}-${calendar.firstDayOfWeek}-${calendar.weekdayFormat}`" :popup="samplePopup(calendar)" />
                </div>
              </div>
            </div>
          </v-expand-transition>
        </div>
      </div>
    </template>

    <EditorSaveBar
      v-if="sitePopups.loaded.value"
      :dirty="sitePopups.dirty.value"
      :loading="saving"
      :undoing="undoing"
      @click="save"
      @undo="undo"
    >
      <template #prepend>
        <v-menu location="top">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              color="secondary"
              prepend-icon="mdi-plus"
              size="large"
              variant="outlined"
            >
              {{ t('calendars.add') }}
            </v-btn>
          </template>
          <v-list density="compact" theme="editorTheme">
            <v-list-item
              v-for="variant of CALENDAR_VARIANTS"
              :key="variant.id"
              :prepend-icon="variant.icon"
              :title="t(`calendars.variants.${variant.id}`)"
              @click="add(variant.id)"
            />
          </v-list>
        </v-menu>
      </template>
    </EditorSaveBar>
  </div>
</template>

<style scoped>
.calendars-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 16px;
  max-width: 900px;
}
.calendars-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.calendars-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.calendars-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
}
.calendars-icon {
  color: #7A8699;
}
.calendars-names {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.calendars-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.calendars-meta {
  font-size: 0.8rem;
  color: #7A8699;
}
.calendars-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.calendars-row-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 16px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.06);
}
.calendars-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.calendars-group {
  margin: 8px 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7A8699;
}
.calendars-hint-small {
  margin: 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.calendars-schemes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.calendars-scheme {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 6px;
  border: 1px solid var(--sve-border);
  border-radius: 999px;
  background: var(--sve-surface);
  color: var(--sve-text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.calendars-scheme--on {
  border-color: var(--sve-primary);
  box-shadow: inset 0 0 0 1px var(--sve-primary);
}
.calendars-scheme-swatches {
  display: inline-flex;
}
.calendars-scheme-swatches > span {
  width: 16px;
  height: 16px;
  margin-left: -4px;
  border: 2px solid var(--sve-surface);
  border-radius: 50%;
}
.calendars-scheme-swatches > span:first-child {
  margin-left: 0;
}
.calendars-row-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.calendars-toggle {
  align-self: flex-start;
  height: auto;
}
.calendars-label {
  margin: 0;
  font-size: 0.85rem;
  color: #7A8699;
}
.calendars-variants {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.calendars-colors {
  display: grid;
  grid-template-columns: max-content auto;
  align-items: center;
  justify-content: start;
  gap: 8px 16px;
}
.calendars-stage {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
  border-radius: 8px;
  background: rgba(33, 33, 33, 0.32);
}
.calendars-stage > .pw-popup {
  width: 420px;
  max-width: 100%;
  height: auto;
  box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14);
}
@media (min-width: 1100px) {
  .calendars-row-body {
    display: grid;
    grid-template-columns: minmax(320px, 460px) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .calendars-stage {
    position: sticky;
    top: 72px;
  }
}
</style>
