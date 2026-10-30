<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import IconVariant from '../../components/small/IconVariant.vue'
  import { resolveCardStyle } from '../../configs/card-style'

  import { useCommonStore } from '../../stores/common'

  const { locale, winSize } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const ver = computed(() => props.item.ver || 2)

  const cardWidth = computed(() => props.item.width && props.item.width > 0 ? props.item.width + 'px' : '100%')
  const cardHeight = computed(() => props.item.height && props.item.height > 0 ? props.item.height + 'px' : '100%')

  const iconSize = computed(() => (props.item.size || 56) / (winSize.value.width > 600 ? 1 : 1.5))

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
</script>

<template>
  <div
    :class="[`template-card-${ver || 2}`, cardStyleClass, props.item.class]"
    :style="cardBackground ? { background: cardBackground } : undefined"
  >
    <div style="grid-area: icon; align-content: center;">
      <icon-variant
        v-if="props.item.icon"
        :background="iconBackground"
        :color="iconColor"
        :icon="props.item.icon"
        :size="iconSize"
        :variant="ver"
      />
    </div>
    <h4
      v-if="props.item.title"
      :class="[titleClass, titleGapClass, headerClass]"
      style="grid-area: title;"
    >
      {{ title }}
    </h4>
    <template v-if="props.item.content">
      <div v-if="Array.isArray(content)">
        <template v-for="(line, index) in content" :key="index">
          <p :class="contentClass" style="grid-area: content">
            • {{ line }}
          </p>
        </template>
      </div>
      <p v-else :class="contentClass" style="grid-area: content">
        {{ content }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.template-card-1, .template-card-2, .template-card-21, .template-card-3, .template-card-4 {
  display: grid;
  width: v-bind(cardWidth);
  min-height: v-bind(cardHeight);
  padding: 20px;
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

.template-card-2, .template-card-21 {
  grid-template-columns: auto 12px 1fr;
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
</style>
