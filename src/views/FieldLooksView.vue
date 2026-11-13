<script setup lang="ts">
  import type { DockClosedVariant, DockFieldLook, DockForm, DockOpenedVariant } from '@sve/dock'
  import { DOCK_CLOSED_VARIANTS, DOCK_FIELD_LOOK_PRESETS, DOCK_OPENED_VARIANTS, newFieldLook } from '@sve/dock'
  import { onMounted, ref, toRaw } from 'vue'
  import FieldLookPreview from '@/components/editors/dock-forms/FieldLookPreview.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { useSiteForms } from '@/composables/useSiteForms'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // UI Kit "Елементи форми": the client's looks of the docking forms'
  // elements (packages/dock/src/field-looks.ts, popups.json `fieldLooks`).
  // Each has two states - closed (the field in the form: a plate, a frame,
  // a line, a pill, a tile; its caption, icon, colours, corners) and opened
  // (what opens from it: a panel, a window, a phone's bottom sheet, or right
  // in the form; its colours, corners, shadow, the counters' buttons, a
  // "Готово"). Five of ours to start from. A form picks one by name in
  // "Форми стикування" → "Вигляд".
  //
  // Edited like the calendars: a row opens under itself, the settings, then
  // a sample.
  const sitePopups = useSitePopups()
  const siteForms = useSiteForms()
  const looks = sitePopups.fieldLooks
  onMounted(() => {
    void sitePopups.load()
    void siteForms.load()
  })

  const expanded = ref<string | null>(null)
  function toggle (id: string) {
    expanded.value = expanded.value === id ? null : id
  }

  const CLOSED_ICONS: Record<DockClosedVariant, string> = {
    filled: 'mdi-rectangle',
    outlined: 'mdi-rectangle-outline',
    underlined: 'mdi-minus',
    pill: 'mdi-pill',
    tile: 'mdi-card-outline',
  }
  const OPENED_ICONS: Record<DockOpenedVariant, string> = {
    dropdown: 'mdi-menu-down',
    dialog: 'mdi-dock-window',
    sheet: 'mdi-dock-bottom',
    inline: 'mdi-arrow-expand-down',
  }
  const RADII = ['extra-small-border-radius', 'small-border-radius', 'default-border-radius', 'large-border-radius', 'super-border-radius']

  function add (preset: string) {
    // named after the one it starts from; a second of it gets a number
    const base = DOCK_FIELD_LOOK_PRESETS.find(item => item.id === preset)?.name ?? t('fieldLooks.newName', { n: looks.value.length + 1 })
    const taken = new Set(looks.value.map(item => item.name))
    let name = base
    for (let index = 2; taken.has(name); index++) {
      name = ` `
    }
    const look = newFieldLook(preset, sitePopups.newId('field-look'), name)
    looks.value.push(look)
    expanded.value = look.id
  }
  function duplicate (look: DockFieldLook) {
    const copy: DockFieldLook = { ...structuredClone(toRaw(look)), id: sitePopups.newId('field-look'), name: t('popupLooks.copyName', { name: look.name }) }
    looks.value.splice(looks.value.indexOf(look) + 1, 0, copy)
    expanded.value = copy.id
  }

  // the forms that wear it (a field's own look counts too); the first look
  // is every form's that names none
  function users (look: DockFieldLook): DockForm[] {
    const first = looks.value[0]?.id
    return siteForms.document.value.forms.filter(form => (form.look ?? first) === look.id || form.fields.some(field => field.look === look.id))
  }
  async function remove (look: DockFieldLook) {
    const using = users(look)
    const sure = await useUiFeedbackStore().confirm({
      title: t('popupLooks.deleteTitle', { name: look.name }),
      text: using.length > 0 ? t('fieldLooks.deleteUsed', { forms: using.map(form => form.name).join(', ') }) : t('confirm.irreversible'),
    })
    if (!sure) return
    looks.value.splice(looks.value.indexOf(look), 1)
    for (const form of using) {
      if (form.look === look.id) delete form.look
      for (const field of form.fields) {
        if (field.look === look.id) delete field.look
      }
    }
  }

  const saving = ref(false)
  const undoing = ref(false)
  async function save () {
    saving.value = true
    try {
      // the forms' references live in forms.json
      await Promise.all([sitePopups.save(), siteForms.dirty.value ? siteForms.save() : Promise.resolve()])
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
  <div class="looks">
    <v-progress-linear v-if="!sitePopups.loaded.value" color="primary" indeterminate />
    <template v-else>
      <p class="looks-hint">{{ t('fieldLooks.hint') }}</p>

      <div class="looks-list">
        <div v-for="look of looks" :key="look.id" class="looks-row">
          <div class="looks-row-head" @click="toggle(look.id)">
            <v-icon class="looks-icon" :icon="CLOSED_ICONS[look.closed.variant]" />
            <div class="looks-names">
              <span class="looks-name">{{ look.name }}</span>
              <span class="looks-meta">
                {{ t(`fieldLooks.closedVariants.${look.closed.variant}`) }} · {{ t(`fieldLooks.openedVariants.${look.opened.variant}`) }} · {{ t('fieldLooks.used', { count: users(look).length }) }}
              </span>
            </div>
            <div class="looks-actions" @click.stop>
              <ToolbarIconButton icon="mdi-content-copy" :tooltip="t('fieldLooks.duplicate')" @click="duplicate(look)" />
              <ToolbarIconButton v-if="looks.length > 1" icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(look)" />
              <ToolbarIconButton
                :icon="expanded === look.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                :tooltip="t('popupLooks.settings')"
                @click="toggle(look.id)"
              />
            </div>
          </div>

          <v-expand-transition>
            <div v-if="expanded === look.id" class="looks-row-body">
              <div class="looks-fields">
                <v-text-field
                  v-model="look.name"
                  density="compact"
                  hide-details
                  :label="t('fieldLooks.name')"
                  variant="outlined"
                />

                <div class="looks-columns">
                  <section class="looks-part">
                    <p class="looks-group">{{ t('fieldLooks.closed') }}</p>
                    <p class="looks-hint-small">{{ t('fieldLooks.closedHint') }}</p>
                    <div class="looks-chips">
                      <v-chip
                        v-for="variant of DOCK_CLOSED_VARIANTS"
                        :key="variant"
                        :color="look.closed.variant === variant ? 'primary' : undefined"
                        :prepend-icon="CLOSED_ICONS[variant]"
                        size="small"
                        :variant="look.closed.variant === variant ? 'flat' : 'outlined'"
                        @click="look.closed.variant = variant"
                      >{{ t(`fieldLooks.closedVariants.${variant}`) }}</v-chip>
                    </div>
                    <div class="looks-inline">
                      <span class="looks-label">{{ t('fieldLooks.label') }}</span>
                      <v-btn-toggle
                        v-model="look.closed.label"
                        color="primary"
                        density="compact"
                        mandatory
                        variant="outlined"
                      >
                        <v-btn size="small" value="above">{{ t('fieldLooks.labels.above') }}</v-btn>
                        <v-btn size="small" value="hidden">{{ t('fieldLooks.labels.hidden') }}</v-btn>
                      </v-btn-toggle>
                    </div>
                    <div class="looks-inline">
                      <span class="looks-label">{{ t('fieldLooks.icon') }}</span>
                      <v-btn-toggle
                        v-model="look.closed.icon"
                        color="primary"
                        density="compact"
                        mandatory
                        variant="outlined"
                      >
                        <v-btn v-for="place of ['left', 'top', 'none']" :key="place" size="small" :value="place">{{ t(`fieldLooks.icons.${place}`) }}</v-btn>
                      </v-btn-toggle>
                    </div>
                    <div class="looks-colors">
                      <span class="looks-label">{{ t('fieldLooks.background') }}</span>
                      <PaletteSwatchPicker :model-value="look.closed.background ?? ''" @update:model-value="(value: string) => look.closed.background = value || undefined" />
                      <template v-if="look.closed.variant === 'outlined' || look.closed.variant === 'underlined'">
                        <span class="looks-label">{{ t('fieldLooks.border') }}</span>
                        <PaletteSwatchPicker :model-value="look.closed.border ?? ''" no-transparent @update:model-value="(value: string) => look.closed.border = value || undefined" />
                      </template>
                    </div>
                    <v-select
                      v-if="look.closed.variant !== 'underlined'"
                      clearable
                      density="compact"
                      hide-details
                      :items="RADII"
                      :label="t('fieldLooks.radius')"
                      :model-value="look.closed.radius ?? null"
                      variant="outlined"
                      @update:model-value="(value: string | null) => look.closed.radius = value || undefined"
                    />
                  </section>

                  <section class="looks-part">
                    <p class="looks-group">{{ t('fieldLooks.opened') }}</p>
                    <p class="looks-hint-small">{{ t('fieldLooks.openedHint') }}</p>
                    <div class="looks-chips">
                      <v-chip
                        v-for="variant of DOCK_OPENED_VARIANTS"
                        :key="variant"
                        :color="look.opened.variant === variant ? 'primary' : undefined"
                        :prepend-icon="OPENED_ICONS[variant]"
                        size="small"
                        :variant="look.opened.variant === variant ? 'flat' : 'outlined'"
                        @click="look.opened.variant = variant"
                      >{{ t(`fieldLooks.openedVariants.${variant}`) }}</v-chip>
                    </div>
                    <p class="looks-hint-small">{{ t(`fieldLooks.openedHints.${look.opened.variant}`) }}</p>
                    <div class="looks-colors">
                      <span class="looks-label">{{ t('fieldLooks.background') }}</span>
                      <PaletteSwatchPicker :model-value="look.opened.background ?? ''" no-transparent @update:model-value="(value: string) => look.opened.background = value || undefined" />
                    </div>
                    <v-select
                      clearable
                      density="compact"
                      hide-details
                      :items="RADII"
                      :label="t('fieldLooks.radius')"
                      :model-value="look.opened.radius ?? null"
                      variant="outlined"
                      @update:model-value="(value: string | null) => look.opened.radius = value || undefined"
                    />
                    <div class="looks-inline">
                      <span class="looks-label">{{ t('fieldLooks.stepper') }}</span>
                      <v-btn-toggle
                        v-model="look.opened.stepper"
                        color="primary"
                        density="compact"
                        mandatory
                        variant="outlined"
                      >
                        <v-btn v-for="kind of ['outlined', 'filled', 'text']" :key="kind" size="small" :value="kind">{{ t(`fieldLooks.steppers.${kind}`) }}</v-btn>
                      </v-btn-toggle>
                    </div>
                    <v-switch
                      v-model="look.opened.shadow"
                      color="primary"
                      density="compact"
                      hide-details
                      inset
                      :label="t('fieldLooks.shadow')"
                    />
                    <v-switch
                      v-model="look.opened.done"
                      color="primary"
                      density="compact"
                      hide-details
                      inset
                      :label="t('fieldLooks.done')"
                    />
                  </section>
                </div>
              </div>

              <FieldLookPreview :look="look" />
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
              {{ t('fieldLooks.add') }}
            </v-btn>
          </template>
          <v-list density="compact" theme="editorTheme">
            <v-list-item
              v-for="preset of DOCK_FIELD_LOOK_PRESETS"
              :key="preset.id"
              :prepend-icon="CLOSED_ICONS[preset.closed.variant]"
              :subtitle="`${t(`fieldLooks.closedVariants.${preset.closed.variant}`)} · ${t(`fieldLooks.openedVariants.${preset.opened.variant}`)}`"
              :title="preset.name"
              @click="add(preset.id)"
            />
          </v-list>
        </v-menu>
      </template>
    </EditorSaveBar>
  </div>
</template>

<style scoped>
.looks-hint {
  max-width: 900px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #7A8699;
}
.looks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.looks-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.looks-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
}
.looks-icon {
  color: #7A8699;
}
.looks-names {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}
.looks-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.looks-meta {
  font-size: 0.8rem;
  color: #7A8699;
}
.looks-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.looks-row-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 16px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.06);
}
.looks-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.looks-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 16px 32px;
}
.looks-part {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
/* a Vuetify input grows in a column; here it keeps its own height */
.looks-part > .v-input {
  flex: 0 0 auto;
}
.looks-group {
  margin: 8px 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7A8699;
}
.looks-hint-small {
  margin: 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.looks-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.looks-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.looks-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.looks-colors {
  display: grid;
  grid-template-columns: max-content auto;
  align-items: center;
  justify-content: start;
  gap: 8px 16px;
}
</style>
