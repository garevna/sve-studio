<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import IconVariant from '@/components/small/IconVariant.vue'
  import { resolveCardStyle } from '@/configs/card-style'
  import { useCommonStore } from '@/stores/common'
  import { cardTitleGapClass, defaultCardContentClass, defaultCardTitleClass } from '@/utils/card-text-defaults'
  import { resolveLocaleText } from '@/utils/locale-text'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'

  const commonStore = useCommonStore()

  // `defaults` carries the shared styling set once on the parent "cards"/
  // "carousel" block (ver, width, height, size, color) - individual card
  // children only override what's different about them.
  const props = defineProps<{
    item: TemplateBlockModel
    defaults?: Partial<TemplateBlockModel>
  }>()

  const title = computed(() => resolveLocaleText(props.item.title, commonStore.locale))
  const content = computed(() => resolveLocaleText(props.item.content, commonStore.locale))
  const ver = computed(() => props.item.ver || props.defaults?.ver || 2)

  // IconVariant branches on mdi-* vs. everything else internally - only the
  // theme-scoping (necessary here since public/ hosts multiple themes,
  // unlike production's single-theme deployment) needs handling on this side.
  const iconSrc = computed(() => resolveThemeAssetPath(props.item.icon, commonStore.activeTheme))

  const cardWidth = computed(() => {
    const width = props.item.width || props.defaults?.width
    return width ? width + 'px' : '100%'
  })
  // const cardHeight = computed(() => {
  //   const height = props.item.height || props.defaults?.height
  //   return height ? height + 'px' : '180px'
  // })
  // Mirrors the production TemplateCard.vue exactly: item.class only reaches
  // the title when it's a "header-*" color class (header-primary etc, see
  // scoped styles below) - production doesn't apply it to the body text
  // either, both use a fixed class combo there.
  const headerClass = computed(() => props.item.class?.includes('header') ? props.item.class : '')

  // The shared text format for every card in the block, set once from the
  // block's own toolbar (CardContainerActions.vue) - one look for the set,
  // the same rule the icon's colour/size/background already follow, and the
  // same shape FAQ uses for its questions and answers.
  //
  // There used to be a PER-CARD titleClass/contentClass here that production
  // ignored outright, so it was removed as a misleading no-op. This one is
  // read by production's own TemplateCard.vue as well - the editor is not
  // offering a setting that stops at its own preview.
  //
  // The gap under the title is resolved separately: it is spacing, not
  // format, and must survive whatever the format menu writes into the class.
  const titleClass = computed(() => props.item.titleClass || props.defaults?.titleClass || defaultCardTitleClass(ver.value))
  const contentClass = computed(() => props.item.contentClass || props.defaults?.contentClass || defaultCardContentClass(ver.value))
  const titleGap = computed(() => cardTitleGapClass(ver.value))

  const iconColor = computed(() => {
    const color = props.item.color || props.defaults?.color
    if (color) return `var(--${color})`
    return (props.item.background || props.defaults?.background) ? 'var(--white)' : 'var(--primary)'
  })
  const iconBackground = computed(() => {
    const background = props.item.background || props.defaults?.background
    if (background) return `var(--${background})`
    // '' rather than 'transparent', for ver 4 only: IconVariant draws the
    // disc behind the glyph whenever this is truthy, and 'transparent' is
    // truthy - so every card has always carried an invisible disc 32px
    // wider than its icon. ver 4's icons are whole illustrations that bring
    // their own coloured circle, and that phantom padding would make the
    // card half again as tall as the design it reproduces. The other
    // variants keep the old value so none of their spacing shifts.
    return ver.value === 4 ? '' : 'transparent'
  })

  // The card's own fill, as a bare palette key on the parent "cards" block.
  // ver 3 used to hardcode light-grey-2 in CSS; that moved here as its
  // default, so the field can simply override it instead of needing a second
  // rule to fight the first.
  //
  // The rest of the card's look - fill, border, corners, shadow - is a UI
  // Kit card style (content/styles/cards.css) the block refers to by name;
  // a block that names none gets its variant's style. The fill above stays
  // an inline override, so it only applies when the block sets one.
  const cardBackground = computed(() => {
    const key = props.item.cardBackground || props.defaults?.cardBackground
    return key ? `var(--${key})` : undefined
  })
  const cardStyleClass = computed(() => resolveCardStyle(props.item.cardStyle || props.defaults?.cardStyle, ver.value))
  const iconSize = computed(() => (props.item.size ?? 0) > 0 ? props.item.size as number : props.defaults?.size || 52)

  // Vertical gap between the icon and the text below it - ver 1 stacks them
  // in a flex column (justify-content:space-between doesn't guarantee a real
  // gap once content is short), ver 2 puts them in separate grid rows with
  // no row-gap set. mb-8/gr-8 are Vuetify's own generated spacing utilities
  // (margin-bottom/row-gap: 32px), not custom CSS. ver 3's grid already has
  // a real column-gap between icon and text, so it needs nothing extra.
  const iconWrapperClass = computed(() => (ver.value === 1 ? 'mb-8' : ''))
  const cardGapClass = computed(() => (ver.value === 2 ? 'gr-8' : ''))

  // The gaps inside the card (the block's "Відступи"), px: under the title,
  // between the lines, above the button. Unset - the card's own spacing.
  const gaps = computed(() => props.item.cardGaps ?? props.defaults?.cardGaps)
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
  const cardButtonClass = computed(() => {
    const own = cardButton.value?.class || ''
    return own.split(' ').some(token => token.includes('button')) ? own : `primary-button ${own}`
  })
  const cardButtonText = computed(() => resolveLocaleText(cardButton.value?.content as TranslatedModel | undefined, commonStore.locale))
</script>

<template>
  <div
    :class="[`template-card-${ver || 2}`, cardStyleClass, props.item.class, cardGapClass]"
    :style="{ ...(cardBackground ? { background: cardBackground } : {}), ...gapStyle }"
  >
    <div :class="iconWrapperClass" style="grid-area: icon; align-content: center;">
      <icon-variant
        v-if="props.item.icon && !props.item.iconHidden"
        :background="iconBackground"
        :color="iconColor"
        :icon="iconSrc"
        :size="iconSize"
        :variant="ver"
      />
    </div>
    <h4
      v-if="props.item.title"
      :class="[titleClass, gaps?.title === undefined ? titleGap : '', headerClass]"
      :style="{ gridArea: 'title', ...(gaps?.title === undefined ? {} : { marginBottom: `${gaps.title}px` }) }"
    >
      {{ title }}
    </h4>
    <template v-if="props.item.content">
      <div v-if="Array.isArray(content)" class="card-lines">
        <template v-for="(line, index) in content" :key="index">
          <p :class="['card-content-text', contentClass]" style="grid-area: content">
            {{ line }}
          </p>
        </template>
      </div>
      <p v-else :class="['card-content-text', contentClass]" style="grid-area: content">
        {{ content }}
      </p>
    </template>
    <!-- The card's own button (a "button" block): under the text. -->
    <div v-if="cardButton" class="card-button">
      <!-- The look only: the button is edited in the card's dialog. -->
      <v-btn :class="cardButtonClass" :text="cardButtonText" />
    </div>
  </div>
</template>

<style scoped>
/* EditableCard.vue's "Пункт" fields are plain v-textarea - pressing Enter
   inside one embeds a literal newline in that single string rather than
   creating a new bullet entry (that's what "Додати пункт" is for). Without
   this, a browser's default white-space:normal collapses that newline
   entirely, making manually-typed line breaks disappear and the text look
   glued into one run-on line. Scoped to a dedicated class (not the shared
   .default-text utility) so this doesn't affect that class anywhere else
   in the app. */
.card-content-text {
  white-space: pre-line;
}

.template-card-1, .template-card-2, .template-card-21, .template-card-3, .template-card-4 {
  display: grid;
  width: v-bind(cardWidth);
  /* The width set on the block is what the card wants, not more than it has.
     A card wider than its column is centred by the set around it, so it hung
     over BOTH edges by half the difference - visible as the whole page
     scrolling sideways on a phone, with nothing apparently sticking out on
     the right. */
  max-width: 100%;
  /* min-height: v-bind(cardHeight); */
  padding: 20px;
  /* A word longer than the card breaks rather than hanging over its edge.
     Only words with nowhere else to go are broken. */
  overflow-wrap: break-word;
}
/* Layout only from here on - fill, border, corners and shadow come from
   the card style (content/styles/cards.css). */
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
  /* box-shadow: 0 0 12px #0002; */
}
/* .template-card-1 div {
  text-shadow: 0 0 8px #0008;
} */

/* minmax(0, 1fr), not 1fr: a grid track's automatic minimum is the widest
   thing in it, so a title with one long word (German compounds reach it
   first - "Abschlussdokumente") made the track wider than the card, and
   both the title and the body below it hung over the card's edge. The
   track may now be narrower than its content, and the title wraps inside
   the word instead. The site's copy carries the same fix
   (site/src/templates/components/TemplateCard.vue). */
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
   card with only a title still centres it against the icon), minus the
   pill radius and the fixed grey. */
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
