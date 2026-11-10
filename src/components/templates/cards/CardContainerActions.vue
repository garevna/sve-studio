<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import IconAppearance from '@/components/editors/icon/IconAppearance.vue'
  import NumberToggleButton from '@/components/editors/NumberToggleButton.vue'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import CardStyleMenu from '@/components/templates/cards/CardStyleMenu.vue'
  import { t } from '@/i18n'
  import { defaultCardContentClass, defaultCardTitleClass } from '@/utils/card-text-defaults'
  import { emptyTranslatedModel } from '@/utils/locale-text'
  import { EDITOR_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Container-level actions for a "cards"/"carousel" block as a whole (not an
  // individual card): add another card, switch the shared ver (1/2/3, see
  // TemplateCard.vue) that children without their own ver inherit. Carousel
  // height used to be a pair of +/- buttons here, but adjusting it had no
  // visible effect until switching to preview mode (the edit-mode grid never
  // read that field at all) - moved to a ResizableWrapper drag handle on the
  // grid itself in SliderWithCards.vue, matching ImageEditor.vue's own
  // resize handle, so dragging it shows the real size directly instead of
  // clicking blind. Rendered into EditableBlockWrapper's #actions
  // slot by the caller - deletion is a separate, generic bare fab the
  // caller renders directly into the wrapper's own #delete slot instead of
  // routing through this component, since every block's delete affordance
  // now lives there uniformly.
  //
  // `block` is deliberately a live reference into the page's own reactive
  // content tree (same object commonStore.dynamicPageContent.blocks holds),
  // not a value copied in - editing it in place is how every editor in this
  // project works (EditableCard, HeroParallax, TemplateItem, etc.), so the
  // vue/no-mutating-props warning below is expected, not a bug to design
  // around with emits.
  const props = defineProps<{ block: TemplateBlockModel }>()

  // Drag-to-reorder is off by default and toggled on here, rather than
  // always-on - the caller (DynamicPageTemplate.vue's "cards" branch,
  // SliderWithCards.vue) owns the actual dragActive ref and wires it into
  // useSortableList; this button just flips it, and flips it back.
  const dragActive = defineModel<boolean>('dragActive', { default: false })

  function addCard () {
    // eslint-disable-next-line vue/no-mutating-props
    const children = props.block.children ??= []
    // eslint-disable-next-line unicorn/prefer-at
    const last = children[children.length - 1]
    children.push({
      type: 'card',
      icon: last?.icon || 'mdi-star-outline',
      width: last?.width,
      title: emptyTranslatedModel(),
      content: emptyTranslatedModel(),
    })
  }

  // Icon appearance for EVERY card in the block. It lives here, not on each
  // card, because that's what it actually is: one look shared by all of
  // them. Each card keeps its own icon CHOICE (see EditableCard's own
  // IconEditor, which drops its appearance half when a blockTarget is set).
  //
  // Written straight onto the block - the same object EditableCard reads
  // through its `blockTarget`, and the same live-reference convention every
  // other action in this file uses.
  /* eslint-disable vue/no-mutating-props */
  const iconColor = computed({
    get: () => props.block.color || 'grey',
    set: (value: string) => {
      props.block.color = value
    },
  })
  const iconSize = computed({

    get: () => props.block.size || 52,
    set: (value: number) => {
      props.block.size = value
    },
  })
  // Its size on a phone - unset means the same size.
  const iconMobileSize = computed({
    get: () => props.block.mobileSize,
    set: (value: number | undefined) => {
      props.block.mobileSize = value
    },
  })
  // Colour only reaches an mdi icon - it is a font glyph. An uploaded SVG
  // carries its own colours, so the picker would be a control that does
  // nothing; IconEditor.vue already gates its own copy of this panel the
  // same way (`:colorable="isMdiIcon"`), and this is the block-level
  // equivalent. `some`, not `every`: with a mixed set the control still
  // reaches the mdi icons in it, and hiding it there would remove a setting
  // that does work.
  const anyMdiIcon = computed(() => (props.block.children || []).some(card => (card.icon || '').startsWith('mdi-')))

  const iconBackground = computed({
    get: () => props.block.background || '',
    set: (value: string) => {
      props.block.background = value
    },
  })
  // The CARD's fill, not the icon's disc - a palette key, shared by every
  // card in the block for the same reason the icon's look is: it is one
  // design decision about the set, not four independent ones.
  const cardBackground = computed({
    get: () => props.block.cardBackground || 'transparent',
    set: (value: string) => {
      props.block.cardBackground = value
    },
  })
  /* eslint-enable vue/no-mutating-props */

  // The text format shared by every card in the block - titles in one class,
  // body text in another. Block-level for exactly the reason the icon's
  // look above is: one set of cards is one design decision, not four. Same
  // shape FaqBlockActions.vue uses for its questions and answers, down to
  // reusing TextFormatMenu, which owns the class string itself.
  //
  // The getter falls back to the very class TemplateCard.vue would render
  // without this field, so opening the menu shows the format actually on
  // screen rather than an empty panel that silently resets the look on the
  // first click.
  /* eslint-disable vue/no-mutating-props -- see this component's own top comment */
  const titleFormat = computed({
    get: () => props.block.titleClass || defaultCardTitleClass(props.block.ver || 2),
    set: (value: string) => {
      props.block.titleClass = value
    },
  })
  const contentFormat = computed({
    get: () => props.block.contentClass || defaultCardContentClass(props.block.ver || 2),
    set: (value: string) => {
      props.block.contentClass = value
    },
  })
  /* eslint-enable vue/no-mutating-props */

  // The gaps inside every card, px: under the title, between the lines,
  // above the button (TemplateCard.vue). Unset - the card's own spacing.
  type GapKey = 'title' | 'lines' | 'button'
  // what a card has without a setting (the title's: mb-4 / mb-2 / none by variant)
  function gapDefault (key: GapKey): number {
    if (key === 'title') {
      const ver = props.block.ver || 2
      return ver === 1 ? 16 : (ver === 4 ? 0 : 8)
    }
    return key === 'button' ? 16 : 0
  }
  function gapOf (key: GapKey): number {
    return props.block.cardGaps?.[key] ?? gapDefault(key)
  }
  function setGap (key: GapKey, value: number) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.cardGaps = { ...props.block.cardGaps, [key]: value }
  }

  function setVer (ver: number) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.ver = ver
  }

  // Default true when unset - matches card-with-toolbar-image's own
  // uniformCardFormat convention. Read by DynamicPageTemplate.vue's
  // openCardEditor call site: when true, CardEditDialog.vue's blockTarget
  // is set to this whole block, so EditableCard.vue's icon color/size/
  // background writes land on the shared block (CardSet.vue's own
  // cardWithDefaults() already overlays those onto every card - no
  // separate "snap to reference" needed, unlike the text-format case).
  // When false, each card keeps its own independent icon styling.
  function toggleUniformIcon () {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.uniformCardIcon = props.block.uniformCardIcon === false
  }
</script>

<template>
  <ToolbarIconButton icon="mdi-plus" :tooltip="t('cards.add')" @click="addCard" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    :tooltip="t('cards.drag')"
    @click="dragActive = !dragActive"
  />
  <ToolbarIconButton
    :active="block.uniformCardIcon !== false"
    icon="mdi-content-duplicate"
    :tooltip="t('cards.iconFormatAll')"
    @click="toggleUniformIcon"
  />

  <v-menu :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-cog-box"
        :tooltip="t('cards.iconLookAll')"
      />
    </template>
    <v-card class="card-icon-appearance" theme="editorTheme">
      <v-card-text>
        <IconAppearance
          v-model:icon-background="iconBackground"
          v-model:icon-color="iconColor"
          v-model:icon-mobile-size="iconMobileSize"
          v-model:icon-size="iconSize"
          :colorable="anyMdiIcon"
          mobile-sizable
        />
      </v-card-text>
    </v-card>
  </v-menu>

  <v-menu :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-format-font"
        :tooltip="t('cards.titleFormatAll')"
      />
    </template>
    <div :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
      <v-theme-provider theme="editorTheme">
        <TextFormatMenu v-model:class="titleFormat" parent-type="usual" />
      </v-theme-provider>
    </div>
  </v-menu>

  <v-menu :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-format-letter-case"
        :tooltip="t('cards.textFormatAll')"
      />
    </template>
    <div :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
      <v-theme-provider theme="editorTheme">
        <TextFormatMenu v-model:class="contentFormat" parent-type="usual" />
      </v-theme-provider>
    </div>
  </v-menu>

  <v-menu :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-arrow-split-horizontal"
        :tooltip="t('cards.gaps')"
      />
    </template>
    <v-card class="card-gaps" theme="editorTheme">
      <v-card-text>
        <v-slider
          v-for="key of (['title', 'lines', 'button'] as const)"
          :key="key"
          color="primary"
          density="compact"
          hide-details
          :label="`${t(`cards.gap.${key}`)}: ${gapOf(key)}px`"
          :max="64"
          :min="0"
          :model-value="gapOf(key)"
          :step="2"
          @update:model-value="(value: number) => setGap(key, value)"
        />
      </v-card-text>
    </v-card>
  </v-menu>

  <CardStyleMenu :block="block" />

  <PaletteSwatchPicker v-model="cardBackground" gradients>
    <template #activator="{ menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-format-color-fill"
        :tooltip="t('cards.background')"
      />
    </template>
  </PaletteSwatchPicker>

  <!-- Version choice: a toggle, not a menu - fits fine flat. Ver 3
    (.template-card-3 in TemplateCard.vue) and ver 4 are both width:100% by
    design, which breaks a swiper slide's own width - only offered outside
    a carousel. -->
  <v-btn-toggle density="compact" :model-value="block.ver || 2" variant="text">
    <NumberToggleButton :tooltip="t('common.variant1')" :value="1" @click="setVer(1)" />
    <NumberToggleButton :tooltip="t('common.variant2')" :value="2" @click="setVer(2)" />
    <NumberToggleButton v-if="block.type !== 'carousel'" :tooltip="t('cards.variant3')" :value="3" @click="setVer(3)" />
    <NumberToggleButton v-if="block.type !== 'carousel'" :tooltip="t('cards.variant4')" :value="4" @click="setVer(4)" />
  </v-btn-toggle>
</template>

<style scoped>
.card-icon-appearance {
  width: 360px;
  max-width: calc(100vw - 48px);
}
.card-gaps {
  width: 320px;
  max-width: calc(100vw - 32px);
}
.card-gaps :deep(.v-slider) {
  flex-direction: column;
  align-items: stretch;
}
</style>
