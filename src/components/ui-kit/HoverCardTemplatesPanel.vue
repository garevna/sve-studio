<script setup lang="ts">
  import type { HoverCardTemplate } from '@/configs/hover-card-templates'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import HoverTemplate from '@/components/templates/cards/HoverTemplate.vue'
  import { useCardTemplates } from '@/composables/useCardTemplates'
  import { t } from '@/i18n'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // The UI Kit's templates of the cards with a hover side
  // (configs/hover-card-templates.ts): the resting side's fill and picture,
  // the hover side's fill and picture, the layout - under a name; on a page
  // the group's «Шаблон оформлення» picks it (HoverTemplateMenu.vue). Saved
  // at once.
  const { hoverTemplates, load, saveHover } = useCardTemplates()
  const list = ref<HoverCardTemplate[]>([])
  const expanded = ref<string | null>(null)
  let ready = false

  onMounted(async () => {
    await load()
    list.value = structuredClone(toRaw(hoverTemplates.value))
    // the watch below sees this load too - only what comes after is an edit
    await nextTick()
    ready = true
  })

  let timer: ReturnType<typeof setTimeout> | null = null
  watch(list, () => {
    if (!ready) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void saveHover(structuredClone(toRaw(list.value))), 700)
  }, { deep: true })

  function side (title: string, text: string): TemplateBlockModel {
    return {
      type: 'card',
      icon: 'mdi-star-outline',
      title: { uk: title, en: title, de: title },
      content: { uk: text, en: text, de: text },
    }
  }
  const SIDES = computed((): [TemplateBlockModel, TemplateBlockModel] => [
    side(t('cardTemplates.sampleTitle'), t('cardTemplates.hoverRest')),
    side(t('cardTemplates.sampleTitle'), t('cardTemplates.hoverOpen')),
  ])

  function add () {
    let index = list.value.length + 1
    while (list.value.some(template => template.id === `hover-template-${index}`)) index++
    const id = `hover-template-${index}`
    list.value.push({ id, name: t('cardTemplates.newName', { n: index }), hoverColor: 'secondary', ver: 1 })
    expanded.value = id
  }
  function remove (id: string) {
    list.value = list.value.filter(template => template.id !== id)
  }

  function setKey (template: HoverCardTemplate, field: 'backgroundColor' | 'hoverColor', value: string) {
    if (value && value !== 'transparent') {
      template[field] = value
    } else {
      delete template[field]
    }
  }
  function setImage (template: HoverCardTemplate, field: 'backgroundImage' | 'hoverImage', value: string) {
    if (value) {
      template[field] = value
    } else {
      delete template[field]
    }
  }
</script>

<template>
  <section class="hover-templates">
    <h2 class="hover-templates-title">{{ t('cardTemplates.hoverTitle') }}</h2>
    <p class="hover-templates-hint">{{ t('cardTemplates.hoverHint') }}</p>

    <div class="hover-templates-list">
      <div v-for="template of list" :key="template.id" class="hover-templates-row">
        <div class="hover-templates-row-head" @click="expanded = expanded === template.id ? null : template.id">
          <v-theme-provider :theme="APP_THEME_NAME">
            <div :class="['hover-templates-stage', EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
              <HoverTemplate
                :background-color="template.backgroundColor || 'transparent'"
                :background-image="template.backgroundImage"
                :height="220"
                :hover-color="template.hoverColor || 'secondary'"
                :hover-image="template.hoverImage || ''"
                :items="SIDES"
                :ver="template.ver || 1"
                :width="200"
              />
            </div>
          </v-theme-provider>
          <div class="hover-templates-name">
            <span>{{ template.name }}</span>
            <small>{{ t('cardTemplates.hoverTry') }}</small>
          </div>
          <v-spacer />
          <v-btn density="comfortable" icon="mdi-delete" variant="text" @click.stop="remove(template.id)" />
          <v-btn density="comfortable" :icon="expanded === template.id ? 'mdi-chevron-up' : 'mdi-chevron-down'" variant="text" />
        </div>

        <v-expand-transition>
          <div v-if="expanded === template.id" class="hover-templates-body">
            <v-text-field
              v-model="template.name"
              density="compact"
              hide-details
              :label="t('cardTemplates.name')"
              variant="outlined"
            />
            <div class="hover-templates-sides">
              <div class="hover-templates-side">
                <span class="hover-templates-side-title">{{ t('cardTemplates.restSide') }}</span>
                <div class="hover-templates-field">
                  <span>{{ t('cardTemplates.cardFill') }}</span>
                  <PaletteSwatchPicker gradients :model-value="template.backgroundColor || 'transparent'" @update:model-value="(value: string) => setKey(template, 'backgroundColor', value)" />
                </div>
                <div class="hover-templates-image">
                  <span>{{ t('cardTemplates.picture') }}</span>
                  <ImageEditor fit="cover" :src="template.backgroundImage || ''" @update:src="(value: string) => setImage(template, 'backgroundImage', value)" />
                  <v-btn v-if="template.backgroundImage" size="small" variant="text" @click="setImage(template, 'backgroundImage', '')">{{ t('cardTemplates.noPicture') }}</v-btn>
                </div>
              </div>
              <div class="hover-templates-side">
                <span class="hover-templates-side-title">{{ t('cardTemplates.hoverSide') }}</span>
                <div class="hover-templates-field">
                  <span>{{ t('cardTemplates.cardFill') }}</span>
                  <PaletteSwatchPicker gradients :model-value="template.hoverColor || 'secondary'" @update:model-value="(value: string) => setKey(template, 'hoverColor', value)" />
                </div>
                <div class="hover-templates-image">
                  <span>{{ t('cardTemplates.picture') }}</span>
                  <ImageEditor fit="cover" :src="template.hoverImage || ''" @update:src="(value: string) => setImage(template, 'hoverImage', value)" />
                  <v-btn v-if="template.hoverImage" size="small" variant="text" @click="setImage(template, 'hoverImage', '')">{{ t('cardTemplates.noPicture') }}</v-btn>
                </div>
              </div>
            </div>
            <p class="hover-templates-hint">{{ t('cardTemplates.hoverNeonNote') }}</p>
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
.hover-templates {
  margin-bottom: 32px;
}
.hover-templates-title {
  margin: 0 0 4px;
  font-size: 1.05rem;
  font-weight: 600;
}
.hover-templates-hint {
  max-width: 900px;
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: #7A8699;
}
.hover-templates-list {
  display: grid;
  gap: 10px;
}
.hover-templates-row {
  border: 1px solid #DCE4EA;
  border-radius: 14px;
  background: #FFFFFF;
}
.hover-templates-row-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
}
.hover-templates-stage {
  padding: 14px;
  border-radius: 14px;
}
.hover-templates-name {
  display: grid;
  gap: 2px;
  font-weight: 600;
}
.hover-templates-name small {
  font-weight: 400;
  color: #7A8699;
}
.hover-templates-body {
  display: grid;
  gap: 14px;
  padding: 4px 16px 16px;
}
.hover-templates-sides {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.hover-templates-side {
  display: grid;
  gap: 10px;
  align-content: start;
}
.hover-templates-side-title {
  font-weight: 600;
}
.hover-templates-field {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hover-templates-image {
  display: grid;
  gap: 6px;
  max-width: 240px;
}
</style>
