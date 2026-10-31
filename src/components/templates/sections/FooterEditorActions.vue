<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { BENTO_TILE_SETS, bentoTile, FOOTER_BENTO, FOOTER_VARIANTS, resolveFooterVariant } from '@/configs/footer-variants'
  import { useAjaxStore } from '@/stores/ajax'

  const props = defineProps<{ block: TemplateBlockModel }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })
  // Shows the drag handles on every section border and on the gap between
  // them. A mode rather than always-on for the same reason drag-to-reorder
  // is: resizing is an occasional, deliberate act, and permanent handles
  // sitting on every border would be in the way of everyday editing.

  function toggleDrag () {
    dragActive.value = !dragActive.value
  }

  // Column count, widths and the gap are the designer's settings, edited in
  // UI Kit -> Футер and stored in global.json. They used to be adjusted from
  // this toolbar; dragging borders in a live footer proved unreadable, and a
  // count toggle here competed with the same setting in two places.

  function setBackground (value: string) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.background = value
  }

  const variant = computed(() => resolveFooterVariant(props.block.ver))
  function setVariant (id: number) {
    // eslint-disable-next-line vue/no-mutating-props -- the footer block is edited in place, like its background
    props.block.ver = id
  }

  // "Bento": the three tiles are coloured as a set (configs/footer-variants.ts).
  // Only the sets whose colours are all in this site's palette are offered.
  const { t } = useI18n()
  const palette = ref<Record<string, string>>({})
  onMounted(async () => {
    palette.value = await useAjaxStore().getPalette() ?? {}
  })
  const tileSets = computed(() => BENTO_TILE_SETS.filter(set => set.tiles.every(key => key in palette.value)))
  const currentTiles = computed(() => [0, 1, 2].map(index => bentoTile(props.block.tiles as string[] | undefined, index)))
  function isCurrent (tiles: readonly string[]) {
    return tiles.every((key, index) => key === currentTiles.value[index])
  }
  function setTiles (tiles: readonly string[]) {
    // eslint-disable-next-line vue/no-mutating-props -- the footer block is edited in place, like its background
    props.block.tiles = [...tiles]
    // The footer's own colour follows the first tile: the dialogs that show
    // the footer's texts (FooterContactsDialog) are drawn on it.
    // eslint-disable-next-line vue/no-mutating-props
    props.block.background = tiles[0]
  }

  function toggleVisible () {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.visible = props.block.visible === false
  }

</script>

<template>
  <!-- The footer's look: one button per variant (configs/footer-variants.ts). -->
  <ToolbarIconButton
    v-for="item of FOOTER_VARIANTS"
    :key="item.id"
    :active="variant === item.id"
    :icon="item.icon"
    :tooltip="`Вигляд футера: ${item.title}`"
    @click="setVariant(item.id)"
  />
  <v-menu v-if="variant === FOOTER_BENTO" location="bottom">
    <template #activator="{ props: menuProps }">
      <v-tooltip location="top" :text="t('footer.tileSets')" theme="editorTheme">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...tooltipProps, ...menuProps }" icon="mdi-format-color-fill" variant="text" />
        </template>
      </v-tooltip>
    </template>
    <v-card class="pa-3" theme="editorTheme">
      <div class="tile-sets-label">{{ t('footer.tileSets') }}</div>
      <div class="tile-sets">
        <button
          v-for="set of tileSets"
          :key="set.id"
          :class="['tile-set', { 'tile-set--active': isCurrent(set.tiles) }]"
          type="button"
          @click="setTiles(set.tiles)"
        >
          <span class="tile-set-preview">
            <span v-for="(key, index) of set.tiles" :key="index" :style="{ background: palette[key] }" />
          </span>
          <span class="tile-set-name">{{ t(`footer.tileSetNames.${set.id}`) }}</span>
        </button>
      </div>
    </v-card>
  </v-menu>
  <PaletteSwatchPicker v-else dark-only :model-value="block.background || 'primary'" @update:model-value="setBackground">
    <template #activator="{ menuProps }">
      <v-tooltip location="top" text="Фон футера" theme="editorTheme">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...tooltipProps, ...menuProps }" icon="mdi-format-color-fill" variant="text" />
        </template>
      </v-tooltip>
    </template>
  </PaletteSwatchPicker>
  <v-tooltip location="top" text="Показувати футер" theme="editorTheme">
    <template #activator="{ props: tooltipProps }">
      <v-btn
        v-bind="tooltipProps"
        :color="block.visible === false ? undefined : 'primary'"
        :icon="block.visible === false ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
        variant="text"
        @click="toggleVisible"
      />
    </template>
  </v-tooltip>
  <!-- Reordering is disabled until the footer renders its sections from a
    v-for over block.children. Right now each column is a hardcoded slot
    with a fixed role (feedback card / links / contacts+icons+visa) bound to
    its INDEX, so moving an entry in the array doesn't move its content: the
    section that lands in slot 0 gets rendered as the feedback card whatever
    it actually holds. Confirmed live - a single swap scrambled the whole
    footer. Re-enable together with the section v-for, not before. -->
  <ToolbarIconButton
    :active="dragActive"
    disabled
    icon="mdi-cursor-move"
    tooltip="Перетягування колонок (буде доступне після переходу на конструктор)"
    @click="toggleDrag"
  />

</template>

<style scoped>
.tile-sets-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: #7a8699;
}
.tile-sets {
  display: grid;
  grid-template-columns: repeat(auto-fill, 112px);
  gap: 10px;
  max-width: 372px;
}
.tile-set {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border: solid 2px transparent;
  border-radius: 10px;
  background: none;
  cursor: pointer;
}
.tile-set--active {
  border-color: #4f8cff;
}
/* The Bento shape in small: a tall tile on the left, two on the right. */
.tile-set-preview {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  grid-template-rows: 1fr 1fr;
  gap: 3px;
  height: 56px;
}
.tile-set-preview span {
  border-radius: 5px;
}
.tile-set-preview span:first-child {
  grid-row: span 2;
}
.tile-set-name {
  font-size: 12px;
  text-align: start;
}
</style>
