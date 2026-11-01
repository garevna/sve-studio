<script lang="ts" setup>
  import type { DropdownStyle } from '@/configs/menu-style'
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import { computed, onMounted, ref, watch } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { dropdownVars, resolveMenuStyle } from '@/configs/menu-style'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { parsePaletteEntry } from '@/utils/palette-entry'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // The UI Kit's menus (global.json menuStyle, see configs/menu-style.ts).
  // The dropdown is shown as a sample whose entries ARE the editors: the
  // usual text field with its format button, one for an ordinary entry and
  // one for the entry of the open page. Same save pattern as the footer tab
  // (FooterLayoutView.vue): drafts land in IndexedDB, "Зберегти" publishes.
  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()
  provideEditorMode(computed(() => 'edit'))

  const settings = ref<GlobalSettingsModel | null>(null)
  const radii = ref<string[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const dirty = ref(false)

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(settings, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (!settings.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      if (settings.value) ajaxStore.saveGlobalSettings(settings.value, { publish: false })
    }, 800)
  }, { deep: true })

  onMounted(async () => {
    const [loaded, palette] = await Promise.all([ajaxStore.getGlobalSettings(), ajaxStore.getPalette()])
    radii.value = Object.entries(palette || {})
      .map(([key, value]) => parsePaletteEntry(key, value))
      .filter(entry => entry.kind === 'radius')
      .map(entry => entry.key)
    skipNextAutoSave = true
    settings.value = loaded
    dirty.value = await ajaxStore.isGlobalSettingsUpdated()
    loading.value = false
  })

  async function save () {
    if (!settings.value) return
    saving.value = true
    try {
      await ajaxStore.saveGlobalSettings(settings.value, { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    skipNextAutoSave = true
    settings.value = await ajaxStore.undoGlobalSettings()
    dirty.value = false
    feedback.notifySuccess(t('popups.undoDone'))
  }

  const dropdown = computed(() => resolveMenuStyle(settings.value?.menuStyle).dropdown)
  function setDropdown (key: keyof DropdownStyle, value: string) {
    if (!settings.value) return
    const menuStyle = settings.value.menuStyle ?? {}
    settings.value.menuStyle = { ...menuStyle, dropdown: { ...dropdown.value, [key]: value } }
  }

  const radiusItems = computed(() => [
    { title: t('menuStyle.noRadius'), value: '0' },
    ...radii.value.map(key => ({ title: key, value: key })),
  ])

  // The sample's texts - never saved, only there to be formatted.
  const sampleItem = ref(t('menuStyle.item'))
  const sampleActive = ref(t('menuStyle.activeItem'))

  const sampleClass = [EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME), 'menu-style-dropdown']
</script>

<template>
  <div>
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="settings">
      <h2 class="menu-style-title">{{ t('menuStyle.dropdownTitle') }}</h2>
      <p class="menu-style-hint">{{ t('menuStyle.dropdownHint') }}</p>

      <div class="menu-style-dropdown-row">
        <!-- The dropdown as the site draws it: its corners, its fill, its
          entries - the first two edit the entry formats. -->
        <div :class="sampleClass" :style="dropdownVars(dropdown)">
          <div class="menu-style-dropdown-item">
            <TextEditor
              v-model:content="sampleItem"
              :class="dropdown.itemClass"
              parent-type="usual"
              type="text"
              @update:class="(value: string) => setDropdown('itemClass', value)"
            />
            <span class="menu-style-item-caption">{{ t('menuStyle.itemLabel') }}</span>
          </div>
          <div class="menu-style-dropdown-item">
            <TextEditor
              v-model:content="sampleActive"
              :class="dropdown.activeClass"
              parent-type="usual"
              type="text"
              @update:class="(value: string) => setDropdown('activeClass', value)"
            />
            <span class="menu-style-item-caption">{{ t('menuStyle.activeLabel') }}</span>
          </div>
          <div class="menu-style-dropdown-item">
            <p :class="dropdown.itemClass">{{ t('menuStyle.otherItem') }}</p>
          </div>
        </div>

        <div class="menu-style-controls">
          <v-select
            density="compact"
            hide-details
            :items="radiusItems"
            :label="t('menuStyle.radius')"
            :model-value="dropdown.radius"
            variant="outlined"
            @update:model-value="(value: string) => setDropdown('radius', value)"
          />
          <div class="menu-style-field">
            <span>{{ t('menuStyle.background') }}</span>
            <PaletteSwatchPicker
              gradients
              :model-value="dropdown.background"
              no-transparent
              @update:model-value="(value: string) => setDropdown('background', value)"
            />
          </div>
        </div>
      </div>
    </template>

    <EditorSaveBar
      v-if="!loading"
      :dirty="dirty"
      :loading="saving"
      @click="save"
      @undo="undo"
    />
  </div>
</template>

<style scoped>
.menu-style-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 4px;
}
.menu-style-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 24px;
  max-width: 900px;
}
.menu-style-dropdown-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 32px;
}
/* The box of the site's dropdown (see the site's DesktopMenuItem.vue). */
.menu-style-dropdown {
  width: 360px;
  max-width: 100%;
  padding: 8px 0;
  border-radius: var(--dropdown-radius);
  background: var(--dropdown-background);
  box-shadow: 0 2px 3px #0002;
}
.menu-style-dropdown-item {
  padding: 8px 16px;
}
.menu-style-dropdown-item p {
  margin: 0;
}
.menu-style-item-caption {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #7A8699;
}
.menu-style-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 280px;
  max-width: 100%;
}
.menu-style-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
