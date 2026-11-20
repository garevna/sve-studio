<script setup lang="ts">
  import type { CardTemplate } from '@/configs/card-templates'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import type { CardStyleEntry } from '@/utils/card-style-entry'
  import { computed, onMounted, ref, toRaw, watch } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import TemplateCard from '@/components/templates/cards/TemplateCard.vue'
  import { useCardTemplates } from '@/composables/useCardTemplates'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { extractCardStyles } from '@/utils/card-style-entry'
  import { defaultCardContentClass, defaultCardTitleClass } from '@/utils/card-text-defaults'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // The UI Kit's card templates (configs/card-templates.ts): the designer
  // sets a cards block's whole look here once - card style, fill, the
  // titles' and texts' format, the icons' colour, disc and size - under a
  // name; on a page the client only picks the name (CardTemplateMenu.vue).
  // Saved at once (useCardTemplates.ts).
  provideEditorMode(computed(() => 'edit'))

  const { templates, load, save } = useCardTemplates()
  const ajaxStore = useAjaxStore()
  const list = ref<CardTemplate[]>([])
  const styles = ref<CardStyleEntry[]>([])
  const expanded = ref<string | null>(null)
  let ready = false

  onMounted(async () => {
    await load()
    list.value = structuredClone(toRaw(templates.value))
    styles.value = extractCardStyles(await ajaxStore.getStyleFile('cards.css') ?? '').entries
    ready = true
  })

  let timer: ReturnType<typeof setTimeout> | null = null
  watch(list, () => {
    if (!ready) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void save(structuredClone(toRaw(list.value))), 700)
  }, { deep: true })

  const styleItems = computed(() => [
    { title: t('cardTemplates.bySiteStyle'), value: '' },
    ...styles.value.map(entry => ({ title: entry.label, value: entry.className })),
  ])

  // the sample every template is shown on
  const SAMPLE = computed((): TemplateBlockModel => ({
    type: 'card',
    title: { uk: t('cardTemplates.sampleTitle'), en: t('cardTemplates.sampleTitle'), de: t('cardTemplates.sampleTitle') },
    content: { uk: t('cardTemplates.sampleText'), en: t('cardTemplates.sampleText'), de: t('cardTemplates.sampleText') },
    icon: 'mdi-star-outline',
  }))
  function defaultsOf (template: CardTemplate) {
    return { ...template, ver: 2, width: 280 }
  }

  function add () {
    let index = list.value.length + 1
    while (list.value.some(template => template.id === `card-template-${index}`)) index++
    const id = `card-template-${index}`
    list.value.push({ id, name: t('cardTemplates.newName', { n: index }), size: 40 })
    expanded.value = id
  }
  function remove (id: string) {
    list.value = list.value.filter(template => template.id !== id)
  }

  // a palette key, or '' for none
  function setKey (template: CardTemplate, field: 'cardBackground' | 'color' | 'background', value: string) {
    if (value && value !== 'transparent') {
      template[field] = value
    } else {
      delete template[field]
    }
  }
  function setStyle (template: CardTemplate, value: string) {
    if (value) {
      template.cardStyle = value
    } else {
      delete template.cardStyle
    }
  }

  const sampleTitle = ref(t('cardTemplates.sampleTitle'))
  const sampleText = ref(t('cardTemplates.sampleText'))
</script>

<template>
  <section class="card-templates">
    <h2 class="card-templates-title">{{ t('cardTemplates.title') }}</h2>
    <p class="card-templates-hint">{{ t('cardTemplates.hint') }}</p>

    <div class="card-templates-list">
      <div v-for="template of list" :key="template.id" class="card-templates-row">
        <div class="card-templates-row-head" @click="expanded = expanded === template.id ? null : template.id">
          <v-theme-provider :theme="APP_THEME_NAME">
            <div :class="['card-templates-stage', EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
              <TemplateCard :defaults="defaultsOf(template)" :item="SAMPLE" />
            </div>
          </v-theme-provider>
          <span class="card-templates-name">{{ template.name }}</span>
          <v-spacer />
          <v-btn density="comfortable" icon="mdi-delete" variant="text" @click.stop="remove(template.id)" />
          <v-btn density="comfortable" :icon="expanded === template.id ? 'mdi-chevron-up' : 'mdi-chevron-down'" variant="text" />
        </div>

        <v-expand-transition>
          <div v-if="expanded === template.id" class="card-templates-body">
            <v-text-field
              v-model="template.name"
              density="compact"
              hide-details
              :label="t('cardTemplates.name')"
              variant="outlined"
            />
            <v-select
              density="compact"
              hide-details
              :items="styleItems"
              :label="t('cardTemplates.cardStyle')"
              :model-value="template.cardStyle || ''"
              variant="outlined"
              @update:model-value="(value: string) => setStyle(template, value)"
            />
            <div class="card-templates-swatches">
              <div class="card-templates-field">
                <span>{{ t('cardTemplates.cardFill') }}</span>
                <PaletteSwatchPicker gradients :model-value="template.cardBackground || 'transparent'" @update:model-value="(value: string) => setKey(template, 'cardBackground', value)" />
              </div>
              <div class="card-templates-field">
                <span>{{ t('cardTemplates.iconColor') }}</span>
                <PaletteSwatchPicker :model-value="template.color || 'primary'" no-transparent @update:model-value="(value: string) => setKey(template, 'color', value)" />
              </div>
              <div class="card-templates-field">
                <span>{{ t('cardTemplates.iconDisc') }}</span>
                <PaletteSwatchPicker :model-value="template.background || 'transparent'" @update:model-value="(value: string) => setKey(template, 'background', value)" />
              </div>
            </div>
            <v-slider
              v-model="template.size"
              color="primary"
              density="compact"
              hide-details
              :label="`${t('cardTemplates.iconSize')}: ${template.size || 52}px`"
              :max="120"
              :min="16"
              :step="4"
            />
            <!-- the formats: the editor's usual format button on a sample -->
            <div class="card-templates-formats">
              <div class="card-templates-format">
                <span class="card-templates-format-label">{{ t('cardTemplates.titleFormat') }}</span>
                <TextEditor
                  v-model:content="sampleTitle"
                  :class="template.titleClass || defaultCardTitleClass(2)"
                  parent-type="usual"
                  type="text"
                  @update:class="(value: string) => template.titleClass = value"
                />
              </div>
              <div class="card-templates-format">
                <span class="card-templates-format-label">{{ t('cardTemplates.textFormat') }}</span>
                <TextEditor
                  v-model:content="sampleText"
                  :class="template.contentClass || defaultCardContentClass(2)"
                  parent-type="usual"
                  type="text"
                  @update:class="(value: string) => template.contentClass = value"
                />
              </div>
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>

    <v-btn
      class="mt-3"
      color="secondary"
      prepend-icon="mdi-plus"
      variant="outlined"
      @click="add"
    >{{ t('cardTemplates.add') }}</v-btn>
  </section>
</template>

<style scoped>
.card-templates {
  margin-bottom: 32px;
}
.card-templates-title {
  margin: 0 0 4px;
  font-size: 1.05rem;
  font-weight: 600;
}
.card-templates-hint {
  max-width: 900px;
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: #7A8699;
}
.card-templates-list {
  display: grid;
  gap: 10px;
}
.card-templates-row {
  border: 1px solid #DCE4EA;
  border-radius: 14px;
  background: #FFFFFF;
}
.card-templates-row-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
}
.card-templates-stage {
  width: 320px;
  max-width: 100%;
  padding: 14px;
  border-radius: 14px;
}
.card-templates-name {
  font-weight: 600;
}
.card-templates-body {
  display: grid;
  gap: 14px;
  padding: 4px 16px 16px;
}
.card-templates-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
}
.card-templates-field {
  display: flex;
  align-items: center;
  gap: 10px;
}
.card-templates-formats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.card-templates-format {
  display: grid;
  gap: 4px;
}
.card-templates-format-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #3A4A58;
}
</style>
