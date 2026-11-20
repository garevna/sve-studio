<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useCardTemplates } from '@/composables/useCardTemplates'
  import { clearHoverTemplateFields, findHoverTemplate, overridesHoverTemplate } from '@/configs/hover-card-templates'
  import { t } from '@/i18n'

  // The look of a group of cards with a hover side, picked from the UI
  // Kit's templates (configs/hover-card-templates.ts) - set on every card of
  // the group, as the group's width and height are. Picking clears what the
  // cards had set themselves; set afterwards in a card's dialog (the
  // exception), a setting wins over the template's - the menu says so and
  // takes it back.
  //
  // `block` (the group) is a live reference into the page content - same
  // convention as CardWithHoverGroupActions.vue.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const { hoverTemplates, load } = useCardTemplates()
  const open = ref(false)

  function cardProps (card: TemplateBlockModel): Record<string, unknown> {
    return (card.props ??= {}) as Record<string, unknown>
  }
  const cards = computed(() => props.block.children ?? [])
  const currentId = computed(() => cards.value[0] ? cardProps(cards.value[0]).hoverTemplate as string | undefined : undefined)
  const current = computed(() => findHoverTemplate(currentId.value, hoverTemplates.value))
  const overridden = computed(() => cards.value.some(card => overridesHoverTemplate(cardProps(card))))

  function pick (id: string | undefined) {
    for (const card of cards.value) {
      const own = cardProps(card)
      if (id) {
        own.hoverTemplate = id
        clearHoverTemplateFields(own)
      } else {
        delete own.hoverTemplate
      }
    }
    open.value = false
  }
  function reset () {
    for (const card of cards.value) {
      clearHoverTemplateFields(cardProps(card))
    }
  }

  function swatch (key?: string): Record<string, string> {
    return key && key !== 'transparent' ? { background: `var(--${key})` } : {}
  }
</script>

<template>
  <v-menu v-model="open" :close-on-content-click="false" location="bottom start" @update:model-value="value => value && load()">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        :active="!!current"
        icon="mdi-palette-swatch-variant"
        :tooltip="current ? t('cardTemplates.current', { name: current.name }) : t('cardTemplates.pick')"
      />
    </template>
    <v-card class="hover-template-menu" theme="editorTheme">
      <v-card-text>
        <div class="hover-template-menu-title">{{ t('cardTemplates.pick') }}</div>
        <p class="hover-template-menu-hint">{{ t('cardTemplates.hoverPickHint') }}</p>

        <div v-if="current && overridden" class="hover-template-menu-overridden">
          <span>{{ t('cardTemplates.overridden') }}</span>
          <v-btn size="small" variant="text" @click="reset">{{ t('cardTemplates.reset') }}</v-btn>
        </div>

        <!-- Not <button>: the site theme styles every bare button. -->
        <div
          :class="['hover-template-menu-item', { 'hover-template-menu-item--active': !current }]"
          role="button"
          tabindex="0"
          @click="pick(undefined)"
          @keydown.enter="pick(undefined)"
        >
          {{ t('cardTemplates.none') }}
        </div>
        <div
          v-for="template of hoverTemplates"
          :key="template.id"
          :class="['hover-template-menu-item', { 'hover-template-menu-item--active': current?.id === template.id }]"
          role="button"
          tabindex="0"
          @click="pick(template.id)"
          @keydown.enter="pick(template.id)"
        >
          <span class="hover-template-menu-swatch">
            <span :style="swatch(template.backgroundColor)" />
            <span :style="swatch(template.hoverColor || 'secondary')" />
          </span>
          {{ template.name }}
        </div>
        <p v-if="hoverTemplates.length === 0" class="hover-template-menu-hint">{{ t('cardTemplates.hoverEmpty') }}</p>
        <v-btn class="mt-3" size="small" to="/ui-kit" variant="text">UI Kit →</v-btn>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<style scoped>
.hover-template-menu {
  width: 320px;
  max-width: calc(100vw - 32px);
}
.hover-template-menu-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.hover-template-menu-hint {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: #7A8699;
}
.hover-template-menu-overridden {
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
.hover-template-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}
.hover-template-menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}
.hover-template-menu-item--active {
  background: rgba(48, 80, 177, 0.12);
}
/* the two sides, resting and hover, half and half */
.hover-template-menu-swatch {
  display: flex;
  flex: none;
  width: 48px;
  height: 32px;
  overflow: hidden;
  border: 1px solid #DCE4EA;
  border-radius: 8px;
}
.hover-template-menu-swatch > span {
  flex: 1;
}
</style>
