<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupInputModel, PopupModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PopupFrame from '@/components/templates/popups/PopupFrame.vue'
  import { useClientApi } from '@/composables/useClientApi'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { feedbackFormKind } from '@/configs/feedback-forms'
  import { popupButtons, popupKind } from '@/configs/popup-kinds'
  import { CALENDAR_VARIANTS, calendarOf, frameFor, lookOf } from '@/configs/popup-looks'
  import { POPUP_PLACEMENTS } from '@/configs/popup-placements'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { emptyTranslatedModel, isTranslatedModel } from '@/utils/locale-text'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // One popup's settings, opened under its row in the "Попапи" section
  // (as a button's are in the UI Kit): first the editor's own fields - the
  // client's name for it, where it appears, how wide, the title and the
  // text, and whatever its kind has (an ordinary or an error message, what
  // a field takes, a list's choices, the buttons' words, where else the
  // answer goes) - then, apart from them, the popup itself, as the site
  // draws it (content/styles/popups.css). A form's or a content popup's
  // middle is a column of blocks with its own block toolbar. Saving is the
  // section's own bar; there is nothing to save or close here.
  //
  // `entry` is a live entry of useSitePopups' list, edited in place.
  const props = defineProps<{ entry: PopupModel }>()
  const popup = computed(() => props.entry)
  const sitePopups = useSitePopups()
  const commonStore = useCommonStore()

  // Everything inside is being edited.
  provideEditorMode(computed<EditorMode>(() => 'edit'))

  const kind = computed(() => popupKind(popup.value))
  const sized = computed(() => popup.value.placement !== 'bottom')
  const buttons = computed(() => popupButtons(kind.value))

  function setPlacement (value: PopupModel['placement']) {
    popup.value.placement = value
    if (!popup.value.width && value !== 'bottom') popup.value.width = value === 'center' ? 480 : 420
  }

  // A translated field, in the language being edited (the switch beside
  // the title).
  function wordsIn (owner: object | undefined, key: string): string {
    const value = (owner as Record<string, unknown> | undefined)?.[key]
    const text = isTranslatedModel(value) ? value[commonStore.locale] : ''
    return typeof text === 'string' ? text : ''
  }
  function setWords (owner: object, key: string, value: string) {
    const record = owner as Record<string, TranslatedModel>
    if (!isTranslatedModel(record[key])) record[key] = emptyTranslatedModel()
    ;(record[key] as Record<string, string>)[commonStore.locale] = value
  }
  function words (key: 'title' | 'text' | 'okText' | 'cancelText') {
    return computed({
      get: () => wordsIn(popup.value, key),
      set: (value: string) => setWords(popup.value, key, value),
    })
  }
  const title = words('title')
  const text = words('text')
  const okText = words('okText')
  const cancelText = words('cancelText')

  // prompt
  if (kind.value === 'prompt' && !popup.value.input) popup.value.input = { format: 'text' }
  const input = computed<PopupInputModel>(() => popup.value.input ?? { format: 'text' })
  const FORMATS = ['text', 'number', 'integer', 'email', 'phone'] as const
  const placeholder = computed({
    get: () => wordsIn(input.value, 'placeholder'),
    set: (value: string) => setWords(input.value, 'placeholder', value),
  })

  // select
  function addOption () {
    popup.value.options ??= []
    const taken = new Set(popup.value.options.map(option => option.value))
    let n = popup.value.options.length + 1
    while (taken.has(`option-${n}`)) n++
    popup.value.options.push({ value: `option-${n}`, label: emptyTranslatedModel() as TranslatedModel })
  }

  // Where else the answer goes: a request of role "Відповідь попапа" in the
  // docking block ("Підключення API", content/settings/client-api.json).
  // None set up - no choice to show.
  const clientApi = useClientApi()
  void clientApi.load()
  const endpoints = computed(() => clientApi.ofRole('answer'))
  const answers = computed(() => !['content', 'message', 'feedback', 'form'].includes(kind.value))

  // Its look and, for a date, its calendar - from the client's sets in the
  // UI Kit; the title's and the text's format may be its own.
  const look = computed(() => lookOf(sitePopups.looks.value, popup.value))
  const frame = computed(() => frameFor(look.value, popup.value, calendarOf(sitePopups.calendars.value, popup.value)))
  const formatting = ref<'title' | 'text' | null>(null)
  function toggleFormat (which: 'title' | 'text') {
    formatting.value = formatting.value === which ? null : which
  }
  const titleClass = computed({
    get: () => popup.value.titleClass ?? look.value.titleClass ?? '',
    set: (value: string) => {
      popup.value.titleClass = value || undefined
    },
  })
  const textClass = computed({
    get: () => popup.value.textClass ?? look.value.textClass ?? '',
    set: (value: string) => {
      popup.value.textClass = value || undefined
    },
  })

  const frameWidth = computed(() => (sized.value ? `${popup.value.width || 480}px` : '100%'))
  const router = useRouter()
</script>

<template>
  <div class="popup-edit">
    <p class="popup-edit-note">
      {{ t(`pagePopups.kinds.${kind}`) }} · {{ t(`pagePopups.returns.${kind}`) }}
      <template v-if="kind === 'feedback'"> · {{ t(`feedbackForms.kinds.${feedbackFormKind(popup.feedbackType).id}`) }}</template>
    </p>

    <div class="popup-edit-fields">
      <v-text-field
        v-model="popup.name"
        density="compact"
        hide-details
        :label="t('pagePopups.name')"
        variant="outlined"
      />
      <div class="popup-edit-row">
        <v-select
          class="popup-edit-wide"
          density="compact"
          hide-details
          item-title="name"
          item-value="id"
          :items="sitePopups.looks.value"
          :label="t('pagePopups.look')"
          :model-value="look.id"
          variant="outlined"
          @update:model-value="(id: string) => popup.look = id"
        />
        <v-select
          v-if="kind === 'date'"
          class="popup-edit-wide"
          density="compact"
          hide-details
          item-title="name"
          item-value="id"
          :items="sitePopups.calendars.value"
          :label="t('pagePopups.calendar')"
          :model-value="popup.calendar ?? sitePopups.calendars.value[0]?.id"
          variant="outlined"
          @update:model-value="(id: string) => popup.calendar = id"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item
              v-bind="itemProps"
              :prepend-icon="CALENDAR_VARIANTS.find(variant => variant.id === item.raw.variant)?.icon"
              :subtitle="t(`calendars.variants.${item.raw.variant}`)"
            />
          </template>
        </v-select>
        <!-- The calendars themselves - variants, colours, details - are the
          UI Kit's ("Вибір дати"). -->
        <ToolbarIconButton
          v-if="kind === 'date'"
          icon="mdi-tune-variant"
          :tooltip="t('pagePopups.calendarsInKit')"
          @click="router.push({ path: '/ui-kit', query: { tab: 'date' } })"
        />
      </div>
      <div class="popup-edit-row">
        <span class="popup-edit-label">{{ t('pagePopups.where') }}</span>
        <div class="popup-edit-placements">
          <ToolbarIconButton
            v-for="option of POPUP_PLACEMENTS"
            :key="option.value"
            :active="popup.placement === option.value"
            :icon="option.icon"
            :tooltip="t(option.label)"
            @click="setPlacement(option.value)"
          />
        </div>
        <v-slider
          v-if="sized"
          v-model="popup.width"
          class="popup-edit-width"
          color="primary"
          density="compact"
          hide-details
          :label="t('pagePopups.width', { width: popup.width })"
          :max="960"
          :min="280"
          :step="20"
        />
      </div>

      <div class="popup-edit-row">
        <!-- A date popup has no title: its calendar's strip is its header. -->
        <v-text-field
          v-if="kind !== 'date'"
          v-model="title"
          class="popup-edit-wide"
          density="compact"
          hide-details
          :label="t('pagePopups.title')"
          variant="outlined"
        />
        <ToolbarIconButton
          v-if="kind !== 'date'"
          :active="formatting === 'title'"
          icon="mdi-format-text"
          :tooltip="t('pagePopups.textFormat.title')"
          @click="toggleFormat('title')"
        />
        <LocaleSwitcher />
      </div>
      <!-- The title's format: its look's unless this popup has its own. -->
      <v-expand-transition>
        <div v-if="formatting === 'title'" class="popup-edit-format">
          <TextFormatMenu v-model:class="titleClass" parent-type="usual" />
          <v-btn v-if="popup.titleClass" size="small" variant="text" @click="popup.titleClass = undefined">{{ t('pagePopups.textFormat.asLook') }}</v-btn>
        </div>
      </v-expand-transition>
      <div class="popup-edit-row">
        <v-textarea
          v-model="text"
          auto-grow
          class="popup-edit-wide"
          density="compact"
          hide-details
          :label="t('pagePopups.text')"
          rows="1"
          variant="outlined"
        />
        <ToolbarIconButton
          :active="formatting === 'text'"
          icon="mdi-format-text"
          :tooltip="t('pagePopups.textFormat.text')"
          @click="toggleFormat('text')"
        />
      </div>
      <v-expand-transition>
        <div v-if="formatting === 'text'" class="popup-edit-format">
          <TextFormatMenu v-model:class="textClass" parent-type="usual" />
          <v-btn v-if="popup.textClass" size="small" variant="text" @click="popup.textClass = undefined">{{ t('pagePopups.textFormat.asLook') }}</v-btn>
        </div>
      </v-expand-transition>

      <v-btn-toggle
        v-if="kind === 'message'"
        v-model="popup.tone"
        class="popup-edit-toggle"
        color="primary"
        density="compact"
        mandatory
        variant="outlined"
      >
        <v-btn prepend-icon="mdi-checkbox-marked-circle-outline" value="info">{{ t('pagePopups.tones.info') }}</v-btn>
        <v-btn prepend-icon="mdi-close-circle-outline" value="error">{{ t('pagePopups.tones.error') }}</v-btn>
      </v-btn-toggle>

      <template v-if="kind === 'prompt'">
        <div class="popup-edit-row">
          <v-select
            v-model="input.format"
            class="popup-edit-wide"
            density="compact"
            hide-details
            :item-title="(format: string) => t(`pagePopups.formats.${format}`)"
            :item-value="(format: string) => format"
            :items="FORMATS"
            :label="t('pagePopups.format')"
            variant="outlined"
          />
          <v-text-field
            v-model="placeholder"
            class="popup-edit-wide"
            density="compact"
            hide-details
            :label="t('pagePopups.placeholder')"
            variant="outlined"
          />
        </div>
        <div class="popup-edit-row">
          <v-switch
            v-model="input.required"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="t('pagePopups.required')"
          />
          <v-switch
            v-if="!input.format || input.format === 'text'"
            v-model="input.multiline"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="t('pagePopups.multiline')"
          />
        </div>
      </template>

      <template v-if="kind === 'select'">
        <p class="popup-edit-note">{{ t('pagePopups.options') }} · {{ t('pagePopups.optionValueHint') }}</p>
        <div v-for="(option, index) of popup.options ?? []" :key="index" class="popup-edit-row">
          <v-text-field
            class="popup-edit-wide"
            density="compact"
            hide-details
            :model-value="wordsIn(option, 'label')"
            variant="outlined"
            @update:model-value="(value: string) => setWords(option, 'label', value)"
          />
          <v-text-field
            v-model="option.value"
            class="popup-edit-value"
            density="compact"
            hide-details
            :label="t('pagePopups.optionValue')"
            variant="outlined"
          />
          <ToolbarIconButton icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="popup.options?.splice(index, 1)" />
        </div>
        <div>
          <v-btn prepend-icon="mdi-plus" size="small" variant="text" @click="addOption">{{ t('pagePopups.optionAdd') }}</v-btn>
        </div>
      </template>

      <div v-if="buttons.length > 0" class="popup-edit-row">
        <v-text-field
          v-model="okText"
          class="popup-edit-wide"
          density="compact"
          hide-details
          :label="t('pagePopups.okText')"
          variant="outlined"
        />
        <v-text-field
          v-if="buttons.includes('cancel')"
          v-model="cancelText"
          class="popup-edit-wide"
          density="compact"
          hide-details
          :label="t('pagePopups.cancelText')"
          variant="outlined"
        />
      </div>

      <v-select
        v-if="answers && endpoints.length > 0"
        v-model="popup.deliver"
        clearable
        density="compact"
        hide-details
        :item-title="(endpoint: { id: string, name: string }) => endpoint.name || endpoint.id"
        item-value="id"
        :items="endpoints"
        :label="t('pagePopups.deliver')"
        :placeholder="t('pagePopups.deliverNone')"
        variant="outlined"
      />
    </div>

    <!-- The popup itself, apart from the editor's fields: what a visitor
      sees, its blocks edited in place. -->
    <div class="popup-edit-stage">
      <div
        :class="['pw-popup', 'popup-edit-frame', `pw-popup--${popup.placement}`, frame.class, { 'pw-popup--error': kind === 'message' && popup.tone === 'error' }, EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]"
        :style="{ ...frame.style, width: frameWidth }"
      >
        <PopupFrame :popup="popup" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.popup-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.popup-edit-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 720px;
}
/* Settings on the left, the popup on the right, in sight while scrolling.
   A phone keeps one column. */
@media (min-width: 1100px) {
  .popup-edit {
    display: grid;
    grid-template-columns: minmax(320px, 460px) minmax(0, 1fr);
    grid-template-areas:
      'note note'
      'fields stage';
    gap: 16px 24px;
    align-items: start;
  }
  .popup-edit > .popup-edit-format {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
}
.popup-edit-note {
    grid-area: note;
  }
  .popup-edit-fields {
    grid-area: fields;
    max-width: none;
  }
  .popup-edit-stage {
    grid-area: stage;
    position: sticky;
    top: 72px;
    max-height: calc(100vh - 160px);
    overflow: auto;
  }
}
.popup-edit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.popup-edit-wide {
  flex: 1 1 220px;
  min-width: 0;
}
.popup-edit-value {
  flex: 0 1 140px;
  min-width: 0;
}
.popup-edit-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.popup-edit-placements {
  display: flex;
  gap: 2px;
}
.popup-edit-width {
  flex: 1 1 220px;
  min-width: 200px;
  margin: 0;
}
.popup-edit-note {
  margin: 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.popup-edit-toggle {
  flex-wrap: wrap;
  height: auto;
  align-self: flex-start;
}
/* Where the popup is shown: the page dimmed behind it, as on the site. */
.popup-edit-stage {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
  border-radius: 8px;
  background: rgba(33, 33, 33, 0.32);
}
.popup-edit-frame {
  max-width: 100%;
  height: auto;
  /* clipped to its corners: a date popup's calendar strip is its top edge */
  overflow: hidden;
  box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14);
}
/* Shown whole, not in a window of the screen's height: no scrolling inside. */
.popup-edit-frame :deep(.pw-popup__body) {
  overflow: visible;
}
</style>
