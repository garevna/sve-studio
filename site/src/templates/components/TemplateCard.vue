<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import IconVariant from '../../components/small/IconVariant.vue'
  import { resolveCardStyle } from '../../configs/card-style'

  import { useCommonStore } from '../../stores/common'
  import TemplateItem from '../TemplateItem.vue'

  const { locale, winSize } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const ver = computed(() => props.item.ver || 2)

  const cardWidth = computed(() => props.item.width && props.item.width > 0 ? props.item.width + 'px' : '100%')
  const cardHeight = computed(() => props.item.height && props.item.height > 0 ? props.item.height + 'px' : '100%')

  // On a phone the icon keeps its size, unless the editor gave it one of
  // its own there ("Окремий розмір на телефоні").
  const iconSize = computed(() => {
    const size = props.item.size || 56
    return winSize.value.width > 600 ? size : (props.item.mobileSize || size)
  })

  const iconColor = computed(() => {
    return props.item.color ? `var(--${props.item.color})` : (props.item.background ? 'var(--white)' : 'var(--primary)')
  })

  const iconBackground = computed(() => {
    if (props.item.background) return `var(--${props.item.background})`
    // '' rather than 'transparent', for ver 4 only: IconVariant draws the
    // disc behind the glyph whenever this is truthy, and 'transparent' is
    // truthy - so every card has always carried an invisible disc 32px wider
    // than its icon. ver 4's icons are whole illustrations that bring their
    // own coloured circle, and that phantom padding would make the card half
    // again as tall as the design it reproduces. The other variants keep the
    // old value so none of their spacing shifts.
    return ver.value === 4 ? '' : 'transparent'
  })

  // The card's own fill, as a bare palette key set once on the parent
  // "cards" block. ver 3 used to hardcode light-grey-2 in CSS; that moved
  // here as its default, so the field simply overrides it instead of needing
  // a second rule to fight the first.
  //
  // The rest of the look - fill, border, corners, shadow - is a UI Kit card
  // style (cards.css) the block refers to by name; a block that names none
  // gets its variant's style. The fill stays an inline override, applied
  // only when the block sets one.
  const cardBackground = computed(() => props.item.cardBackground ? `var(--${props.item.cardBackground})` : undefined)
  const cardStyleClass = computed(() => resolveCardStyle(props.item.cardStyle, ver.value))

  const alignClass = computed(() => ver.value === 1 ? 'text-center' : 'text-left')
  // ver 4 carries its whole text in the title and nothing below it, so the
  // gap that separates a title from its content on every other variant is
  // dead space there - it would push the text off the icon's centre line,
  // which is the one alignment this variant is built around.
  const titleGapClass = computed(() => (ver.value === 1 ? 'mb-4' : (ver.value === 4 ? 'mb-0' : 'mb-2')))
  // The text format shared by every card in the block, set once from the
  // visual editor's own card-block toolbar. Falls back to exactly the class
  // this component hardcoded before the field existed, so a block that never
  // set one renders unchanged.
  const titleClass = computed(() => props.item.titleClass || `text-medium ${alignClass.value}`)
  const contentClass = computed(() => props.item.contentClass || `default-text text-thin text-black ${alignClass.value}`)
  const headerClass = computed(() => props.item.class?.includes('header') ? props.item.class : '')
  const title = computed(() => props.item.title?.[locale.value as 'uk' | 'en' | 'de'] || '')
  const content = computed(() => props.item.content?.[locale.value as 'uk' | 'en' | 'de'] || '')

  // The gaps inside the card (the block's "Відступи"), px: under the title,
  // between the lines, above the button. Unset - the card's own spacing.
  const gaps = computed(() => props.item.cardGaps)
  const gapStyle = computed(() => {
    const style: Record<string, string> = {}
    if (gaps.value?.lines !== undefined) style['--card-line-gap'] = `${gaps.value.lines}px`
    if (gaps.value?.button !== undefined) style['--card-button-gap'] = `${gaps.value.button}px`
    return style
  })
  // A card's button opens a popup about this card: its title goes with it
  // unless the button says otherwise.
  const cardButton = computed(() => {
    const button = props.item.button
    if (!button) return null
    return button.action === 'popup' && !button.popupContext && props.item.title ? { ...button, popupContext: props.item.title } : button
  })
</script>

<template>
  <div
    :class="[`template-card-${ver || 2}`, cardStyleClass, props.item.class]"
    :style="{ ...(cardBackground ? { background: cardBackground } : {}), ...gapStyle }"
  >
    <div style="grid-area: icon; align-content: center;">
      <icon-variant
        v-if="props.item.icon && !props.item.iconHidden"
        :background="iconBackground"
        :color="iconColor"
        :icon="props.item.icon"
        :size="iconSize"
        :variant="ver"
      />
    </div>
    <h4
      v-if="props.item.title"
      :class="[titleClass, gaps?.title === undefined ? titleGapClass : '', headerClass]"
      :style="{ gridArea: 'title', ...(gaps?.title === undefined ? {} : { marginBottom: `${gaps.title}px` }) }"
    >
      {{ title }}
    </h4>
    <template v-if="props.item.content">
      <div v-if="Array.isArray(content)" class="card-lines">
        <template v-for="(line, index) in content" :key="index">
          <p :class="contentClass" style="grid-area: content">
            {{ line }}
          </p>
        </template>
      </div>
      <p v-else :class="contentClass" style="grid-area: content">
        {{ content }}
      </p>
    </template>
    <!-- The card's own button (a "button" block): under the text. -->
    <div v-if="cardButton" class="card-button">
      <template-item :item="cardButton" />
    </div>
  </div>
</template>

<style scoped>
.template-card-1, .template-card-2, .template-card-21, .template-card-3, .template-card-4 {
  display: grid;
  width: v-bind(cardWidth);
  /* The width set on the block is what the card wants, not more than it has.
     A card wider than its column is centred by the set around it, so it hung
     over BOTH edges by half the difference - visible as the whole page
     scrolling sideways on a phone, with nothing apparently sticking out on
     the right. */
  max-width: 100%;
  min-height: v-bind(cardHeight);
  padding: 20px;
  /* A word longer than the card breaks rather than hanging over its edge.
     Only words with nowhere else to go are broken. */
  overflow-wrap: break-word;
}
/* Layout only from here on - fill, border, corners and shadow come from
   the card style (cards.css). */
.template-card-1 {
  grid-template-columns: 1fr;
  grid-template-areas:
    "icon"
    "title"
    "content";
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}
/* .template-card-1 div {
  text-shadow: 0 0 8px #0008;
} */

/* minmax(0, 1fr), not 1fr: a grid track's automatic minimum is the widest
   thing in it, so a title with one long word (German compounds reach it
   first - "Abschlussdokumente") made the track wider than the card, and
   both the title and the body below it hung over the card's edge. The
   track may now be narrower than its content, and the title wraps inside
   the word instead. The editor's copy carries the same fix
   (src/components/templates/cards/TemplateCard.vue). */
.template-card-2, .template-card-21 {
  grid-template-columns: auto 12px minmax(0, 1fr);
  grid-template-areas:
        "icon . title"
        "content content content";
  align-items: center;
}
.template-card-2 {
  align-content: space-between;
  align-items: center;
}
.template-card-21 {
  width: calc(50% - 20px) !important;
  padding: 0 !important;
  border: none !important;
  height: max-content !important;
}
.template-card-21 h4 {
  font-size: 20px;
  font-weight: 600;
}
.template-card-21 p {
  font-size: 18px;
  font-weight: 300;
}

.template-card-3 {
  width: 100%;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "icon title"
    "icon content";
  column-gap: 12px;
  justify-items: start;
  align-content: space-between;
  align-items: center;
}
.template-card-3 div {
  display: flex;
  align-items: center;
}

/* ver 4: icon on the left, text beside it, the card as wide as its column -
   the shape a list of short statements takes when each one gets its own
   filled strip. Same grid as ver 3 (the icon spans both text rows, so a
   card with only a title still centres it against the icon), minus the pill
   radius and the fixed grey. No border: the fill already separates it from
   the page. */
.template-card-4 {
  width: 100%;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "icon title"
    "icon content";
  column-gap: 16px;
  align-content: center;
  align-items: center;
  justify-items: start;
}
.template-card-4 div {
  display: flex;
  align-items: center;
}

.header-primary {
  color: var(--primary);
}
.header-blue {
  color: var(--dark);
}

@media screen and (max-width: 1200px) {
  .template-card-21 h4 {
    font-size: 18px;
  }
  .template-card-21 p {
    font-size: 16px;
  }
}

@media screen and (max-width: 600px) {
  .template-card-21 {
    width: 100% !important;
    margin-bottom: 20px;
  }
  .template-card-3 {
    height: max-content;
    grid-template-columns: auto 12px 1fr;
    grid-template-areas:
          "icon . title"
          "content content content";
    align-items: center;
    row-gap: 20px;
  }
}
/* The lines of the text, apart by the block's gap; the button under them. */
.card-lines {
  display: flex;
  flex-direction: column;
  gap: var(--card-line-gap, 0);
  grid-area: content;
}
.card-lines > p {
  margin-bottom: 0;
}
.card-button {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding-top: var(--card-button-gap, 16px);
}
</style>
