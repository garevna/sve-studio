<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupLookModel, PopupModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { SveSegmented } from '@sve/editor-ui'
  import { computed, onMounted, ref } from 'vue'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ButtonVariantSelect from '@/components/special/ButtonVariantSelect.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import PopupFrame from '@/components/templates/popups/PopupFrame.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { LOOK_DEFAULTS, lookFrame, newLook, POPUP_LOOK_BASES } from '@/configs/popup-looks'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // UI Kit "Попапи": the client's own looks of popups (the "models"; each
  // popup in the "Попапи" section picks one by name and only adds its
  // words). A look is one of our base variants (configs/popup-looks.ts) set
  // up here: the window's fill and corners, the close cross, the title's and
  // the text's format, and which of the client's buttons (UI Kit "Кнопки")
  // the popups use. Simple popups - a message, an error, a confirmation, a
  // field, a list - all share a look, so there is usually one; a calendar
  // has models of its own (UI Kit "Календар").
  //
  // Edited like the buttons: a row opens under itself, the settings on the
  // left and a sample popup on the right; the bar at the bottom saves.
  const sitePopups = useSitePopups()
  const looks = sitePopups.looks
  onMounted(() => sitePopups.load())

  // The samples on the right are shown, not edited.
  provideEditorMode(computed<EditorMode>(() => 'preview'))

  const expanded = ref<string | null>(null)
  function toggle (id: string) {
    expanded.value = expanded.value === id ? null : id
  }

  const RADII = ['extra-small-border-radius', 'small-border-radius', 'default-border-radius', 'large-border-radius', 'super-border-radius']

  function add (base: PopupLookModel['base']) {
    const look = newLook(base, t('popupLooks.newName', { n: looks.value.length + 1 }), sitePopups.newId('look'))
    look.buttons = { ...looks.value[0]?.buttons }
    looks.value.push(look)
    expanded.value = look.id
  }
  function duplicate (look: PopupLookModel) {
    const copy: PopupLookModel = { ...structuredClone(look), id: sitePopups.newId('look'), name: t('popupLooks.copyName', { name: look.name }) }
    looks.value.splice(looks.value.indexOf(look) + 1, 0, copy)
    expanded.value = copy.id
  }
  // The popups that wear it take the first look in its place.
  async function remove (look: PopupLookModel) {
    const users = sitePopups.popups.value.filter(popup => (popup.look ?? looks.value[0]?.id) === look.id)
    const sure = await useUiFeedbackStore().confirm({
      title: t('popupLooks.deleteTitle', { name: look.name }),
      text: users.length > 0 ? t('popupLooks.deleteUsed', { popups: users.map(popup => popup.name).join(', ') }) : t('confirm.irreversible'),
    })
    if (!sure) return
    looks.value.splice(looks.value.indexOf(look), 1)
    for (const popup of users) delete popup.look
  }
  function usedBy (look: PopupLookModel): number {
    return sitePopups.popups.value.filter(popup => (popup.look ?? looks.value[0]?.id) === look.id).length
  }

  function setButton (look: PopupLookModel, which: 'main' | 'second', value: string) {
    look.buttons = { ...look.buttons, [which]: value.split(' ').find(token => token.includes('button')) || undefined }
  }

  // --- the sample on the right
  type Sample = 'confirm' | 'error' | 'prompt'
  const sample = ref<Sample>('confirm')
  const samples = computed(() => [
    { value: 'confirm' as const, label: t('pagePopups.kinds.confirm') },
    { value: 'error' as const, label: t('pagePopups.tones.error') },
    { value: 'prompt' as const, label: t('pagePopups.kinds.prompt') },
  ])
  function words (text: string): TranslatedModel {
    return { uk: text, en: text, de: text } as TranslatedModel
  }
  function samplePopup (look: PopupLookModel): PopupModel {
    const base = { id: `sample-${look.id}`, name: '', placement: 'center' as const, look: look.id, content: { type: 'section-with-free-content', children: [] } as PopupModel['content'] }
    if (sample.value === 'error') {
      return { ...base, kind: 'message', tone: 'error', title: words(t('popupLooks.sample.errorTitle')), text: words(t('popupLooks.sample.errorText')) }
    }
    if (sample.value === 'prompt') {
      return { ...base, kind: 'prompt', title: words(t('popupLooks.sample.promptTitle')), input: { format: 'text', placeholder: words(t('popupLooks.sample.promptPlaceholder')) } }
    }
    return { ...base, kind: 'confirm', title: words(t('popupLooks.sample.confirmTitle')), text: words(t('popupLooks.sample.confirmText')) }
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
  <div class="popup-looks">
    <v-progress-linear v-if="!sitePopups.loaded.value" color="primary" indeterminate />
    <template v-else>
      <p class="popup-looks-hint">{{ t('popupLooks.hint') }}</p>

      <div class="popup-looks-list">
        <div v-for="look of looks" :key="look.id" class="popup-looks-row">
          <div class="popup-looks-row-head" @click="toggle(look.id)">
            <v-icon class="popup-looks-icon" :icon="POPUP_LOOK_BASES.find(base => base.id === look.base)?.icon" />
            <div class="popup-looks-names">
              <span class="popup-looks-name">{{ look.name }}</span>
              <span class="popup-looks-meta">{{ t(`popupLooks.bases.${look.base}`) }} · {{ t('popupLooks.used', { count: usedBy(look) }) }}</span>
            </div>
            <div class="popup-looks-actions" @click.stop>
              <ToolbarIconButton icon="mdi-content-copy" :tooltip="t('popupLooks.duplicate')" @click="duplicate(look)" />
              <ToolbarIconButton v-if="looks.length > 1" icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(look)" />
              <ToolbarIconButton
                :icon="expanded === look.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                :tooltip="t('popupLooks.settings')"
                @click="toggle(look.id)"
              />
            </div>
          </div>

          <v-expand-transition>
            <div v-if="expanded === look.id" class="popup-looks-row-body">
              <div class="popup-looks-fields">
                <v-text-field
                  v-model="look.name"
                  density="compact"
                  hide-details
                  :label="t('popupLooks.name')"
                  variant="outlined"
                />

                <p class="popup-looks-label">{{ t('popupLooks.base') }}</p>
                <div class="popup-looks-bases">
                  <v-chip
                    v-for="base of POPUP_LOOK_BASES"
                    :key="base.id"
                    :color="look.base === base.id ? 'primary' : undefined"
                    :prepend-icon="base.icon"
                    size="small"
                    :variant="look.base === base.id ? 'flat' : 'outlined'"
                    @click="look.base = base.id"
                  >
                    {{ t(`popupLooks.bases.${base.id}`) }}
                  </v-chip>
                </div>

                <div class="popup-looks-colors">
                  <span class="popup-looks-label">{{ t('popupLooks.background') }}</span>
                  <PaletteSwatchPicker :model-value="look.background || LOOK_DEFAULTS.background" no-transparent @update:model-value="(value: string) => look.background = value" />
                  <template v-if="look.base === 'header'">
                    <span class="popup-looks-label">{{ t('popupLooks.headerBackground') }}</span>
                    <PaletteSwatchPicker :model-value="look.headerBackground || LOOK_DEFAULTS.headerBackground" no-transparent @update:model-value="(value: string) => look.headerBackground = value" />
                  </template>
                  <span class="popup-looks-label">{{ t('popupLooks.closeColor') }}</span>
                  <PaletteSwatchPicker :model-value="look.closeColor || LOOK_DEFAULTS.closeColor" no-transparent @update:model-value="(value: string) => look.closeColor = value" />
                </div>

                <v-select
                  density="compact"
                  hide-details
                  :items="RADII"
                  :label="t('popupLooks.radius')"
                  :model-value="look.radius || LOOK_DEFAULTS.radius"
                  variant="outlined"
                  @update:model-value="(value: string) => look.radius = value"
                />

                <p class="popup-looks-label">{{ t('pagePopups.textFormat.title') }}</p>
                <div class="popup-looks-format">
                  <TextFormatMenu :class="look.titleClass ?? ''" parent-type="usual" @update:class="(value: string) => look.titleClass = value || undefined" />
                </div>
                <p class="popup-looks-label">{{ t('pagePopups.textFormat.text') }}</p>
                <div class="popup-looks-format">
                  <TextFormatMenu :class="look.textClass ?? ''" parent-type="usual" @update:class="(value: string) => look.textClass = value || undefined" />
                </div>

                <p class="popup-looks-label">{{ t('popupLooks.buttons') }}</p>
                <ButtonVariantSelect :class="look.buttons?.main ?? LOOK_DEFAULTS.main" :label="t('pagePopups.mainButton')" @update:class="(value: string) => setButton(look, 'main', value)" />
                <ButtonVariantSelect :class="look.buttons?.second ?? LOOK_DEFAULTS.second" :label="t('pagePopups.secondButton')" @update:class="(value: string) => setButton(look, 'second', value)" />
              </div>

              <!-- A sample popup in this look, beside its settings. -->
              <div class="popup-looks-preview">
                <SveSegmented v-model="sample" class="popup-looks-samples" :options="samples" />
                <div class="popup-looks-stage">
                  <div
                    :class="['pw-popup', 'pw-popup--center', lookFrame(look).class, { 'pw-popup--error': sample === 'error' }, EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]"
                    :style="lookFrame(look).style"
                  >
                    <PopupFrame :key="`${look.id}-${sample}`" :popup="samplePopup(look)" />
                  </div>
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
              {{ t('popupLooks.add') }}
            </v-btn>
          </template>
          <v-list density="compact" theme="editorTheme">
            <v-list-item
              v-for="base of POPUP_LOOK_BASES"
              :key="base.id"
              :prepend-icon="base.icon"
              :title="t(`popupLooks.bases.${base.id}`)"
              @click="add(base.id)"
            />
          </v-list>
        </v-menu>
      </template>
    </EditorSaveBar>
  </div>
</template>

<style scoped>
.popup-looks-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 16px;
  max-width: 900px;
}
.popup-looks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.popup-looks-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.popup-looks-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
}
.popup-looks-icon {
  color: #7A8699;
}
.popup-looks-names {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.popup-looks-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.popup-looks-meta {
  font-size: 0.8rem;
  color: #7A8699;
}
.popup-looks-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.popup-looks-row-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 16px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.06);
}
.popup-looks-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.popup-looks-label {
  margin: 0;
  font-size: 0.85rem;
  color: #7A8699;
}
.popup-looks-bases {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.popup-looks-colors {
  display: grid;
  grid-template-columns: max-content auto;
  align-items: center;
  justify-content: start;
  gap: 8px 16px;
}
.popup-looks-format {
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
}
.popup-looks-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.popup-looks-samples {
  align-self: center;
}
/* Where the sample is shown: the page dimmed behind it, as on the site. */
.popup-looks-stage {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
  border-radius: 8px;
  background: rgba(33, 33, 33, 0.32);
}
.popup-looks-stage > .pw-popup {
  width: 420px;
  max-width: 100%;
  height: auto;
  box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14);
}
/* Settings on the left, the sample on the right, in sight while scrolling.
   A phone keeps one column. */
@media (min-width: 1100px) {
  .popup-looks-row-body {
    display: grid;
    grid-template-columns: minmax(320px, 460px) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .popup-looks-preview {
    position: sticky;
    top: 72px;
  }
}
</style>
