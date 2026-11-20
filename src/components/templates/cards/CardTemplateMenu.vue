<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import type { CardStyleEntry } from '@/utils/card-style-entry'
  import { computed, ref } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useCardTemplates } from '@/composables/useCardTemplates'
  import { clearCardTemplateFields, findCardTemplate, overridesCardTemplate } from '@/configs/card-templates'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { cardStyleInline, extractCardStyles } from '@/utils/card-style-entry'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // The block's look picked from the UI Kit's card templates
  // (configs/card-templates.ts) - the way a client styles a cards block. The
  // block keeps only the template's id; picking one clears what the block
  // had set itself, so the template decides. Set on the block afterwards
  // (its detailed settings - the exception), a setting wins over the
  // template's: the menu says so and takes it back to the template.
  //
  // `block` is a live reference into the page content - same convention as
  // CardContainerActions.vue.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const { templates, load } = useCardTemplates()
  const ajaxStore = useAjaxStore()
  const styles = ref<CardStyleEntry[]>([])
  const open = ref(false)

  async function onOpen (value: boolean) {
    if (value) {
      await load()
      styles.value = extractCardStyles(await ajaxStore.getStyleFile('cards.css') ?? '').entries
    }
  }

  const current = computed(() => findCardTemplate(props.block.cardTemplate, templates.value))
  const overridden = computed(() => overridesCardTemplate(props.block))

  function styleOf (className?: string): Record<string, string> {
    const entry = styles.value.find(item => item.className === className)
    return entry ? cardStyleInline(entry) : {}
  }

  /* eslint-disable vue/no-mutating-props */
  function pick (id: string | undefined) {
    if (id) {
      props.block.cardTemplate = id
      clearCardTemplateFields(props.block)
    } else {
      delete props.block.cardTemplate
    }
    open.value = false
  }
  function reset () {
    clearCardTemplateFields(props.block)
  }
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <v-menu v-model="open" :close-on-content-click="false" location="bottom start" @update:model-value="onOpen">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        :active="!!current"
        icon="mdi-palette-swatch-variant"
        :tooltip="current ? t('cardTemplates.current', { name: current.name }) : t('cardTemplates.pick')"
      />
    </template>
    <v-card class="card-template-menu" theme="editorTheme">
      <v-card-text>
        <div class="card-template-menu-title">{{ t('cardTemplates.pick') }}</div>
        <p class="card-template-menu-hint">{{ t('cardTemplates.pickHint') }}</p>

        <div v-if="current && overridden" class="card-template-menu-overridden">
          <span>{{ t('cardTemplates.overridden') }}</span>
          <v-btn size="small" variant="text" @click="reset">{{ t('cardTemplates.reset') }}</v-btn>
        </div>

        <!-- Not <button>: the site theme styles every bare button
          (font, radius, padding) with !important. -->
        <div
          :class="['card-template-menu-item', { 'card-template-menu-item--active': !current }]"
          role="button"
          tabindex="0"
          @click="pick(undefined)"
          @keydown.enter="pick(undefined)"
        >
          {{ t('cardTemplates.none') }}
        </div>
        <div
          v-for="template of templates"
          :key="template.id"
          :class="['card-template-menu-item', { 'card-template-menu-item--active': current?.id === template.id }]"
          role="button"
          tabindex="0"
          @click="pick(template.id)"
          @keydown.enter="pick(template.id)"
        >
          <v-theme-provider :theme="APP_THEME_NAME">
            <span :class="['card-template-menu-swatch', themeClass(APP_THEME_NAME)]" :style="{ ...styleOf(template.cardStyle), ...(template.cardBackground ? { background: `var(--${template.cardBackground})` } : {}) }">
              <i class="mdi mdi-star-outline" :style="{ color: template.color ? `var(--${template.color})` : undefined, background: template.background ? `var(--${template.background})` : undefined }" />
            </span>
          </v-theme-provider>
          {{ template.name }}
        </div>
        <p v-if="templates.length === 0" class="card-template-menu-hint">{{ t('cardTemplates.empty') }}</p>
        <v-btn class="mt-3" size="small" to="/ui-kit" variant="text">UI Kit →</v-btn>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<style scoped>
.card-template-menu {
  width: 320px;
  max-width: calc(100vw - 32px);
}
.card-template-menu-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.card-template-menu-hint {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: #7A8699;
}
.card-template-menu-overridden {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(195, 132, 15, 0.12);
  font-size: 0.85rem;
}
.card-template-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  text-align: start;
  cursor: pointer;
}
.card-template-menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}
.card-template-menu-item--active {
  background: rgba(48, 80, 177, 0.12);
}
.card-template-menu-swatch {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 32px;
  padding: 0 !important;
}
.card-template-menu-swatch .mdi {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 15px;
}
</style>
