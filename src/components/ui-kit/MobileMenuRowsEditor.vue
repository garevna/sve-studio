<script setup lang="ts">
  import type { MobileMenuRow, MobileRowType, RowAlign } from '@/configs/menu-style'
  import type { SocialIconLook } from '@/configs/social-icons'
  import { computed, ref } from 'vue'
  import ButtonVariantSelect from '@/components/special/ButtonVariantSelect.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import FeedbackCardDialog from '@/components/templates/sections/FeedbackCardDialog.vue'
  import { useSortableList } from '@/composables/useSortableList'
  import { CONTACT_LABEL, mobileRow } from '@/configs/menu-style'
  import { t } from '@/i18n'
  import { siteLocales } from '@/utils/locale-text'

  // The rows of the mobile menu (global.json menuStyle.mobile.rows), edited
  // in place: dragged into order by the handle, opened for their settings.
  const props = defineProps<{ rows: MobileMenuRow[] }>()

  const ROW_TYPES: MobileRowType[] = ['logo', 'locales', 'menu', 'social', 'contact', 'user', 'divider', 'spacer']
  const ALIGNED = new Set<MobileRowType>(['logo', 'locales', 'menu', 'social', 'contact', 'user'])
  const HINTED = new Set<MobileRowType>(['user', 'spacer', 'menu', 'social'])

  const { container } = useSortableList(() => props.rows, computed(() => true))
  const opened = ref<number | null>(null)

  /* eslint-disable vue/no-mutating-props */
  function addRow (type: MobileRowType) {
    props.rows.push(mobileRow(type))
    opened.value = props.rows.length - 1
  }
  function removeRow (index: number) {
    props.rows.splice(index, 1)
    opened.value = null
  }
  /* eslint-enable vue/no-mutating-props */

  const locales = computed(() => siteLocales())
  function setLabel (row: MobileMenuRow, locale: string, value: string) {
    row.label = { ...(row.label ?? CONTACT_LABEL), [locale]: value }
  }

  // The contact button's form texts, in the same window as a page button's.
  const formRow = ref<MobileMenuRow | null>(null)
  const formOpen = ref(false)
  function openForm (row: MobileMenuRow) {
    row.form ??= { type: 'message' }
    formRow.value = row
    formOpen.value = true
  }

  const ICON_LOOKS: SocialIconLook[] = ['color', 'mono', 'circle']
  const ALIGNS: RowAlign[] = ['start', 'center', 'end']
  const ALIGN_ICONS: Record<RowAlign, string> = { start: 'mdi-format-align-left', center: 'mdi-format-align-center', end: 'mdi-format-align-right' }
  const ALIGN_LABELS: Record<RowAlign, string> = { start: 'alignStart', center: 'alignCenter', end: 'alignEnd' }
</script>

<template>
  <div class="mobile-rows">
    <div ref="container" class="mobile-rows-list">
      <div v-for="(row, index) of rows" :key="index" class="mobile-rows-item">
        <div class="mobile-rows-head" @click="opened = opened === index ? null : index">
          <v-icon class="mobile-rows-handle" size="20" @click.stop>mdi-drag-vertical</v-icon>
          <span class="mobile-rows-name">{{ t(`menuStyle.row.${row.type}`) }}</span>
          <span v-if="row.background" class="mobile-rows-fill" :style="{ background: `var(--${row.background})` }" />
          <v-spacer />
          <v-btn
            density="comfortable"
            icon="mdi-delete-outline"
            :title="t('menuStyle.removeRow')"
            variant="text"
            @click.stop="removeRow(index)"
          />
          <v-btn density="comfortable" :icon="opened === index ? 'mdi-chevron-up' : 'mdi-chevron-down'" variant="text" />
        </div>

        <v-expand-transition>
          <div v-if="opened === index" class="mobile-rows-body">
            <p v-if="HINTED.has(row.type)" class="mobile-rows-hint">{{ t(`menuStyle.rowHint.${row.type as 'user'}`) }}</p>

            <div v-if="row.type !== 'spacer'" class="mobile-rows-field">
              <span>{{ t('menuStyle.rowBackground') }}</span>
              <PaletteSwatchPicker gradients :model-value="row.background || ''" @update:model-value="(value: string) => row.background = value === 'transparent' ? '' : value" />
            </div>

            <div v-if="ALIGNED.has(row.type)" class="mobile-rows-field">
              <span>{{ t('menuStyle.align') }}</span>
              <v-btn-toggle
                density="compact"
                mandatory
                :model-value="row.align || 'start'"
                variant="outlined"
                @update:model-value="(value: RowAlign) => row.align = value"
              >
                <v-btn
                  v-for="align of ALIGNS"
                  :key="align"
                  :icon="ALIGN_ICONS[align]"
                  :title="t(`menuStyle.${ALIGN_LABELS[align] as 'alignStart'}`)"
                  :value="align"
                />
              </v-btn-toggle>
            </div>

            <v-switch
              v-if="row.type === 'logo'"
              v-model="row.lightLogo"
              color="primary"
              density="compact"
              hide-details
              :label="t('menuStyle.lightLogo')"
            />

            <template v-if="row.type === 'locales'">
              <div class="mobile-rows-field">
                <span>{{ t('menuStyle.localeLook') }}</span>
                <v-btn-toggle
                  density="compact"
                  mandatory
                  :model-value="row.localeLook || 'chips'"
                  variant="outlined"
                  @update:model-value="(value: 'chips' | 'dropdown') => row.localeLook = value"
                >
                  <v-btn value="chips">{{ t('menuStyle.localeChips') }}</v-btn>
                  <v-btn value="dropdown">{{ t('menuStyle.localeDropdown') }}</v-btn>
                </v-btn-toggle>
              </div>
              <v-switch
                v-model="row.localeLabel"
                color="primary"
                density="compact"
                hide-details
                :label="t('menuStyle.localeLabel')"
              />
            </template>

            <template v-if="row.type === 'social'">
              <div class="mobile-rows-field">
                <span>{{ t('menuStyle.iconLook') }}</span>
                <v-btn-toggle
                  density="compact"
                  mandatory
                  :model-value="row.iconLook || 'color'"
                  variant="outlined"
                  @update:model-value="(value: SocialIconLook) => row.iconLook = value"
                >
                  <v-btn v-for="look of ICON_LOOKS" :key="look" :value="look">{{ t(`socialLinks.look.${look}`) }}</v-btn>
                </v-btn-toggle>
              </div>
              <div v-if="row.iconLook && row.iconLook !== 'color'" class="mobile-rows-field">
                <span>{{ t('menuStyle.iconColor') }}</span>
                <PaletteSwatchPicker :model-value="row.iconColor || 'grey'" no-transparent @update:model-value="(value: string) => row.iconColor = value" />
              </div>
              <div class="mobile-rows-field">
                <span>{{ t('menuStyle.iconSize', { size: row.iconSize || 32 }) }}</span>
                <v-slider
                  class="mobile-rows-slider"
                  hide-details
                  :max="56"
                  :min="20"
                  :model-value="row.iconSize || 32"
                  :step="4"
                  @update:model-value="(value: number) => row.iconSize = value"
                />
              </div>
            </template>

            <template v-if="row.type === 'contact'">
              <ButtonVariantSelect v-model:class="row.buttonClass" />
              <v-text-field
                v-for="locale of locales"
                :key="locale"
                density="compact"
                hide-details
                :label="t('menuStyle.buttonLabel', { locale: locale.toUpperCase() })"
                :model-value="row.label?.[locale] ?? CONTACT_LABEL[locale] ?? ''"
                variant="outlined"
                @update:model-value="(value: string) => setLabel(row, locale, value)"
              />
              <v-btn class="align-self-start" prepend-icon="mdi-form-select" variant="tonal" @click="openForm(row)">{{ t('menuStyle.formTexts') }}</v-btn>
            </template>

            <div v-if="row.type === 'divider'" class="mobile-rows-field">
              <span>{{ t('menuStyle.dividerColor') }}</span>
              <PaletteSwatchPicker :model-value="row.color || 'light-grey'" no-transparent @update:model-value="(value: string) => row.color = value" />
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>

    <v-menu location="bottom start">
      <template #activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" class="mt-3" prepend-icon="mdi-plus" variant="outlined">{{ t('menuStyle.addRow') }}</v-btn>
      </template>
      <v-card theme="editorTheme">
        <v-list density="compact">
          <v-list-item v-for="type of ROW_TYPES" :key="type" :title="t(`menuStyle.row.${type}`)" @click="addRow(type)" />
        </v-list>
      </v-card>
    </v-menu>

    <FeedbackCardDialog v-if="formRow?.form" v-model="formOpen" :card="formRow.form as never" />
  </div>
</template>

<style scoped>
.mobile-rows-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mobile-rows-item {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: #fff;
}
.mobile-rows-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: pointer;
}
.mobile-rows-handle {
  cursor: grab;
  color: #7a8699;
}
.mobile-rows-name {
  font-size: 0.9rem;
}
.mobile-rows-fill {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: solid 1px rgba(0, 0, 0, 0.15);
}
.mobile-rows-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 16px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.08);
}
.mobile-rows-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #7a8699;
}
.mobile-rows-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  font-size: 0.9rem;
}
.mobile-rows-slider {
  flex: 1 1 140px;
  max-width: 220px;
}
</style>
