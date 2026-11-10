<script lang="ts" setup>
  import type { ButtonUsagePlace } from '@/composables/useButtonUsage'
  import type { SetButton } from '@/utils/button-set'
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ButtonSample from '@/components/special/ButtonSample.vue'
  import ButtonStylePicker from '@/components/special/ButtonStylePicker.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { useButtonUsage } from '@/composables/useButtonUsage'
  import { forgetButtonVariants } from '@/composables/useButtonVariants'
  import { BUTTON_CATALOG, templateOf } from '@/configs/button-catalog'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { BUTTON_SET_FILE, buttonSetCss, buttonSetFile, catalogSampleClass, newSetButton, parseButtonSet } from '@/utils/button-set'
  import { FORCE_HOVER_CLASS, showLiveStyles } from '@/utils/forced-hover-css'

  // UI Kit > Кнопки: the client's own buttons. Each one is a kind from our
  // catalogue (configs/button-catalog.ts), in the client's colours, under a
  // name of the client's own - that name, with its sample, is what a page's
  // button is picked by. The class behind it is ours and not shown.
  //
  // "Додати кнопку" opens the catalogue; a kind taken from it becomes one
  // more button of the set, and the same kind can be taken again in other
  // colours. Stored in button-set.css (utils/button-set.ts).
  const ajaxStore = useAjaxStore()

  const buttons = ref<SetButton[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)
  const expanded = ref<string | null>(null)

  let skipNextAutoSave = false
  async function load (text: string | null) {
    skipNextAutoSave = true
    buttons.value = parseButtonSet(text) ?? []
  }

  onMounted(async () => {
    try {
      await load(await ajaxStore.getStyleFile(BUTTON_SET_FILE))
      dirty.value = await ajaxStore.isStyleFileUpdated(BUTTON_SET_FILE)
    } finally {
      loading.value = false
    }
  })

  const fileText = () => buttonSetFile(buttons.value)

  async function save () {
    saving.value = true
    try {
      await ajaxStore.saveStyleFile(BUTTON_SET_FILE, fileText(), { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      await load(await ajaxStore.undoStyleFile(BUTTON_SET_FILE))
      dirty.value = false
    } finally {
      undoing.value = false
    }
  }

  // Every edit is a draft at once (same pattern as ButtonPaletteView.vue),
  // and the pages' button pickers hear about it.
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  watch(buttons, () => {
    refreshLiveStyles()
    forgetButtonVariants(buttons.value)
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (loading.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      ajaxStore.saveStyleFile(BUTTON_SET_FILE, fileText(), { publish: false })
    }, 800)
  }, { deep: true })
  onBeforeUnmount(() => {
    if (!autoSaveTimer) return
    clearTimeout(autoSaveTimer)
    void ajaxStore.saveStyleFile(BUTTON_SET_FILE, fileText(), { publish: false })
  })

  // Samples: the client's buttons, and one of every kind for the catalogue
  // (in its starting colours, under a sample class).
  const samples = computed(() => BUTTON_CATALOG.map(template => ({
    ...newSetButton(template.id, '', []),
    className: catalogSampleClass(template.id),
  })))
  function refreshLiveStyles () {
    showLiveStyles('ui-kit-button-set-live', buttonSetCss([...buttons.value, ...samples.value]))
  }

  // The state the open row's settings are on - the sample shows that one.
  const editedState = ref<string>('base')
  function toggle (className: string) {
    expanded.value = expanded.value === className ? null : className
    editedState.value = 'base'
  }
  function stateOf (className: string): string {
    return expanded.value === className ? editedState.value : 'base'
  }

  // The catalogue.
  const catalogOpen = ref(false)
  function take (templateId: string) {
    const button = newSetButton(templateId, t(templateOf(templateId).name), buttons.value.map(item => item.className))
    buttons.value.push(button)
    catalogOpen.value = false
    expanded.value = button.className
    editedState.value = 'base'
  }

  function duplicate (button: SetButton) {
    const copy: SetButton = {
      ...structuredClone(button),
      className: newSetButton(button.template, '', buttons.value.map(item => item.className)).className,
      name: t('buttonSet.copyOf', { name: button.name }),
    }
    buttons.value.splice(buttons.value.indexOf(button) + 1, 0, copy)
    expanded.value = copy.className
  }

  // A button that is on pages can only go with another in its place: the
  // window says where it is and asks which button takes over there. One
  // that is nowhere is just confirmed and removed.
  const usage = useButtonUsage()
  const checking = ref<string | null>(null)
  const leaving = ref<{ button: SetButton, places: ButtonUsagePlace[] } | null>(null)
  const replacement = ref<string | null>(null)
  const replacing = ref(false)

  // Another button that can stand where this one stood: a text button for a
  // text button, an icon button for an icon button.
  const candidates = computed(() => {
    const gone = leaving.value?.button
    if (!gone) return []
    const goneKind = templateOf(gone.template)
    return buttons.value.filter(item => item !== gone && (goneKind.component
      ? item.template === gone.template
      : !templateOf(item.template).component))
  })

  async function remove (button: SetButton) {
    checking.value = button.className
    let places: ButtonUsagePlace[] = []
    try {
      places = await usage.find(button.className)
    } finally {
      checking.value = null
    }
    if (places.length === 0) {
      if (!await useUiFeedbackStore().confirmDelete('button')) return
      buttons.value = buttons.value.filter(item => item !== button)
      return
    }
    leaving.value = { button, places }
    replacement.value = candidates.value[0]?.className ?? null
  }

  // The pages first, then the set - published, so the site never has a page
  // pointing at a button its stylesheet no longer has.
  async function replaceAndRemove () {
    const gone = leaving.value
    if (!gone || !replacement.value) return
    replacing.value = true
    try {
      await usage.replace(gone.places, gone.button.className, replacement.value)
      buttons.value = buttons.value.filter(item => item !== gone.button)
      await save()
      leaving.value = null
    } finally {
      replacing.value = false
    }
  }

</script>

<template>
  <div class="button-set">
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else>
      <p class="button-set-hint">{{ t('buttonSet.hint') }}</p>

      <p v-if="buttons.length === 0" class="button-set-empty">{{ t('buttonSet.empty') }}</p>

      <div class="button-set-list">
        <div v-for="button of buttons" :key="button.className" class="button-set-row">
          <div class="button-set-row-head" @click="toggle(button.className)">
            <div class="button-set-sample">
              <ButtonSample
                :class-name="button.className"
                :disabled="stateOf(button.className) === 'disabled'"
                :extra-class="{ [FORCE_HOVER_CLASS]: stateOf(button.className) === 'hover' }"
                :template="button.template"
              />
            </div>
            <div class="button-set-names">
              <span class="button-set-name">{{ button.name || t('buttonSet.unnamed') }}</span>
              <span class="button-set-kind">{{ t(templateOf(button.template).name) }}</span>
            </div>
            <div class="button-set-actions" @click.stop>
              <ToolbarIconButton icon="mdi-content-copy" :tooltip="t('buttonSet.duplicate')" @click="duplicate(button)" />
              <v-progress-circular
                v-if="checking === button.className"
                class="mx-2"
                indeterminate
                size="20"
                width="2"
              />
              <ToolbarIconButton v-else icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(button)" />
              <ToolbarIconButton
                :icon="expanded === button.className ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                :tooltip="t('buttonSet.settings')"
                @click="toggle(button.className)"
              />
            </div>
          </div>
          <v-expand-transition>
            <div v-if="expanded === button.className" class="button-set-row-body">
              <div class="button-set-row-edit">
                <div class="button-set-fields">
                  <v-text-field
                    v-model="button.name"
                    density="compact"
                    hide-details
                    :label="t('buttonSet.name')"
                    variant="outlined"
                  />
                  <v-switch
                    v-if="!templateOf(button.template).bare"
                    color="primary"
                    density="compact"
                    hide-details
                    inset
                    :label="t('buttonSet.fullWidth')"
                    :model-value="button.fullWidth !== false"
                    @update:model-value="(value: boolean | null) => button.fullWidth = value ? undefined : false"
                  />
                </div>
                <ButtonStylePicker :entry="button" @state="state => editedState = state" />
              </div>
              <!-- On a wide screen the button stays in sight beside its
                settings, in the state being edited. -->
              <div class="button-set-row-preview">
                <div class="button-set-row-preview-stage">
                  <ButtonSample
                    :class-name="button.className"
                    :disabled="stateOf(button.className) === 'disabled'"
                    :extra-class="{ [FORCE_HOVER_CLASS]: stateOf(button.className) === 'hover' }"
                    :template="button.template"
                  />
                </div>
              </div>
            </div>
          </v-expand-transition>
        </div>
      </div>
    </template>

    <EditorSaveBar
      v-if="!loading"
      :dirty="dirty"
      :loading="saving"
      :undoing="undoing"
      @click="save"
      @undo="undo"
    >
      <template #prepend>
        <v-btn
          color="secondary"
          prepend-icon="mdi-plus"
          size="large"
          variant="outlined"
          @click="catalogOpen = true"
        >
          {{ t('buttonSet.add') }}
        </v-btn>
      </template>
    </EditorSaveBar>

    <v-dialog max-width="560" :model-value="!!leaving" persistent>
      <v-card v-if="leaving" class="editor-dialog" theme="editorTheme">
        <v-toolbar class="editor-panel" color="transparent" density="compact">
          <v-toolbar-title class="button-set-dialog-title">{{ t('buttonSet.usedTitle', { name: leaving.button.name }) }}</v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          <p class="mb-3">{{ t('buttonSet.usedText') }}</p>
          <ul class="button-set-places mb-5">
            <li v-for="place of leaving.places" :key="place.id">
              {{ place.label }} — {{ t('buttonSet.usedCount', { count: place.count }) }}
            </li>
          </ul>
          <template v-if="candidates.length > 0">
            <v-select
              v-model="replacement"
              density="compact"
              hide-details
              item-title="name"
              item-value="className"
              :items="candidates"
              :label="t('buttonSet.replaceWith')"
              variant="outlined"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <span class="button-set-choice-sample">
                      <ButtonSample :class-name="item.raw.className" small :template="item.raw.template" />
                    </span>
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <p class="button-set-hint mt-3 mb-0">{{ t('buttonSet.replaceNote') }}</p>
          </template>
          <p v-else class="button-set-warning">{{ t('buttonSet.noReplacement') }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="replacing" variant="text" @click="leaving = null">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="error"
            :disabled="!replacement"
            :loading="replacing"
            variant="flat"
            @click="replaceAndRemove"
          >
            {{ t('buttonSet.replaceAndDelete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="catalogOpen" max-width="960" scrollable>
      <v-card class="editor-dialog" theme="editorTheme">
        <v-toolbar class="editor-panel" color="transparent" density="compact">
          <v-toolbar-title class="button-set-dialog-title">{{ t('buttonSet.catalog') }}</v-toolbar-title>
          <v-spacer />
          <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="catalogOpen = false" />
        </v-toolbar>
        <v-card-text>
          <p class="button-set-hint">{{ t('buttonSet.catalogHint') }}</p>
          <div class="button-set-catalog">
            <!-- Not a <button>: the site's buttons.css styles every one. -->
            <div
              v-for="template of BUTTON_CATALOG"
              :key="template.id"
              class="button-set-kind-card"
              role="button"
              tabindex="0"
              @click="take(template.id)"
              @keydown.enter="take(template.id)"
            >
              <span class="button-set-kind-sample">
                <ButtonSample :class-name="catalogSampleClass(template.id)" :template="template.id" />
              </span>
              <span class="button-set-kind-name">{{ t(template.name) }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.button-set-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 16px;
  max-width: 900px;
}
.button-set-empty {
  margin: 24px 0;
}
.button-set-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.button-set-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}
.button-set-row-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  cursor: pointer;
}
/* Room for what grows outside a button: the pulse ring, the key's edge. */
.button-set-sample {
  flex: 1 1 280px;
  min-width: 0;
  max-width: 520px;
  padding: 14px;
}
.button-set-names {
  display: flex;
  flex-direction: column;
  flex: 1 1 160px;
  min-width: 0;
}
.button-set-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.button-set-kind {
  font-size: 0.8rem;
  color: #7A8699;
}
.button-set-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.button-set-row-body {
  padding: 8px 16px 16px;
}
.button-set-row-edit {
  min-width: 0;
}
.button-set-row-preview {
  display: none;
}
/* Settings on the left, the button on the right, in sight while scrolling.
   A phone keeps one column: the sample in the row's head above. */
@media (min-width: 1100px) {
  .button-set-row-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
    gap: 24px;
    align-items: start;
  }
  .button-set-row-preview {
    display: block;
    position: sticky;
    top: 72px;
  }
  .button-set-row-preview-stage {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 160px;
    padding: 32px 24px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.03);
  }
}
.button-set-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  margin-bottom: 16px;
}
.button-set-fields > .v-text-field {
  flex: 1 1 260px;
  max-width: 420px;
}
.button-set-places {
  padding-left: 20px;
}
.button-set-choice-sample {
  display: inline-flex;
  width: 72px;
  margin-right: 12px;
  pointer-events: none;
}
.button-set-warning {
  color: rgb(var(--v-theme-warning));
}
.button-set-dialog-title {
  font-size: 1rem;
  font-weight: 600;
}
.button-set-catalog {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.button-set-kind-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 16px 12px;
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.button-set-kind-card:hover,
.button-set-kind-card:focus-visible {
  border-color: rgb(var(--v-theme-primary));
}
.button-set-kind-sample {
  display: block;
  padding: 4px 4px 10px;
}
.button-set-kind-name {
  font-size: 0.9rem;
}
</style>
