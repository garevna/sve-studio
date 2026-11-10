<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref, watch } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'
  import TemplateItem from '../TemplateItem.vue'
  import CardContainerActions from './CardContainerActions.vue'
  import TabsLookActions from './TabsLookActions.vue'
  import TabStrip from './TabStrip.vue'

  // A tabs block while it is being edited: the same toolbar as a card set
  // (add a card = add a tab, reorder, icons, text formats, card style,
  // fill, card variant) plus the tabs' own look; the row of tabs to pick a
  // card with, and that one card with its edit/delete buttons - edited in
  // the same card window as any card (DynamicPageTemplate's openCardEditor).
  // A card's title is its tab's name.
  //
  // While reordering, the row turns into plain chips that can be dragged.
  const props = defineProps<{
    block: TemplateBlockModel
    cardDefaults: Partial<TemplateBlockModel>
  }>()
  const emit = defineEmits<{
    'edit-card': [index: number]
    'delete-card': [index: number]
  }>()

  const commonStore = useCommonStore()
  const dragActive = ref(false)
  const active = ref(0)
  const cards = computed(() => props.block.children || [])

  // A new tab is shown at once; a deleted one hands over to its neighbour.
  watch(() => cards.value.length, (count, before) => {
    if (count > before) {
      active.value = count - 1
    } else if (active.value >= count) {
      active.value = Math.max(0, count - 1)
    }
  })

  const labels = computed(() => cards.value.map((card, index) =>
    resolveLocaleText(card.title, commonStore.locale) || t('tabs.untitled', { n: index + 1 })))

  const look = computed(() => props.block.tabLook || 'pill')
  const DEFAULT_PLATE: Record<string, string> = { pill: 'light-grey-2', underline: 'light-grey-1', folder: 'light-grey-2' }
  const accent = computed(() => `var(--${props.block.tabAccent || 'primary'})`)
  const plate = computed(() => `var(--${props.block.tabPlate || DEFAULT_PLATE[look.value] || 'light-grey-2'})`)
  // folder: square corner of the panel under a tab at the row's end
  // (TabStrip.vue tells which end the chosen tab touches).
  const edges = ref({ start: true, end: false })
  const folderCorners = computed(() => ({
    '--folder-start': edges.value.start ? '0' : 'var(--large-border-radius)',
    '--folder-end': edges.value.end ? '0' : 'var(--large-border-radius)',
  }))
</script>

<template>
  <EditableBlockWrapper :block="block" no-inline-padding type="block">
    <template #actions>
      <CardContainerActions v-model:drag-active="dragActive" :block="block" />
      <TabsLookActions :block="block" />
    </template>
    <div :class="['tabs-editor', `tabs-editor--${look}`]" :style="{ '--tab-plate': plate, ...folderCorners }">
      <SortableList v-if="dragActive" v-model:active="dragActive" class="tabs-editor-order" :items="block.children">
        <template #item="{ index, dragClass, contentClass }">
          <span :class="['tabs-editor-chip', dragClass]">
            <span :class="contentClass">{{ labels[index] }}</span>
          </span>
        </template>
      </SortableList>
      <TabStrip
        v-else
        v-model="active"
        :accent="accent"
        :labels="labels"
        :look="look"
        :plate="plate"
        @edges="edges = $event"
      />

      <div class="tabs-editor-panel">
        <EditableBlockWrapper v-if="cards[active]" type="card">
          <template #actions>
            <ToolbarIconButton icon="mdi-pencil" :tooltip="t('cards.edit')" @click="emit('edit-card', active)" />
          </template>
          <template #delete>
            <ToolbarIconButton icon="mdi-delete" :tooltip="t('cards.delete')" @click="emit('delete-card', active)" />
          </template>
          <template-item
            :block-index="active"
            :blocks="block.children as TemplateBlockModel[]"
            :defaults="cardDefaults"
          />
        </EditableBlockWrapper>
      </div>
    </div>
  </EditableBlockWrapper>
</template>

<style scoped>
.tabs-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tabs-editor--folder {
  gap: 0;
}
.tabs-editor--folder .tabs-editor-panel {
  padding: 8px;
  border-radius: var(--folder-start) var(--folder-end) var(--large-border-radius) var(--large-border-radius);
  background: var(--tab-plate);
}
/* The card is the panel (as on the site, TabSet.vue): no fill or corners
   of its own. */
.tabs-editor--folder .tabs-editor-panel :deep(.v-card) {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.tabs-editor-order {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tabs-editor-chip {
  padding: 8px 16px;
  border: dashed 1px var(--grey);
  border-radius: var(--large-border-radius);
  color: var(--dark-grey);
}
</style>
