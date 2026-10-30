<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import EditableBlockHeading from '@/components/editors/EditableBlockHeading.vue'
  import PopularDestinationsRowColors from '@/components/home-page-components/PopularDestinationsRowColors.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { MOCK_DESTINATIONS } from '@/configs/mock-destinations'
  import { useCommonStore } from '@/stores/common'

  // The second way to draw "Популярні напрямки": a plain list of rows
  // instead of Theme2's grid of cards. Markup and CSS ported verbatim from
  // production's own template-components/PopularDestinationsTheme1.vue -
  // only the data source differs, the same rule every ported component here
  // follows.
  //
  // Which of the two a page uses is the block's own `content` (see
  // configs/component-variants.ts): TemplateItem imports the component by
  // that name, so switching variants is switching which file gets imported,
  // not a flag this component has to read.
  //
  // The heading is deliberately NOT this component's own text: it lives in
  // the block's props and is drawn by EditableBlockHeading, shared with
  // Theme2, so the words the client typed survive switching between them.
  // Production reads it from i18n (`destinations.header`) because it has no
  // editor behind it; here the block owns it.
  defineOptions({ inheritAttrs: false })

  interface PropsModel {
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass?: string
    subtitleClass?: string
    colors?: Partial<typeof DEFAULT_ROW_COLORS>
  }

  // The two colours this variant's rows are built from, as palette KEYS
  // applied as var(--key) - the convention every other colour setting in
  // this editor uses.
  //
  // Production's own file asks for --accent-blue and --light-blue, which
  // exist only in theme_1's palette: under theme_2 both resolve to nothing
  // and the rows lose their rule and their hover fill entirely. These are
  // theme_2's nearest equivalents, and they are settings rather than
  // constants because "nearest" is a judgement the client may not share.
  const DEFAULT_ROW_COLORS = {
    rowBorder: 'accent',
    rowHover: 'light-grey-2',
  }

  const model = defineModel<PropsModel>({ default: () => ({}) })

  const { locale } = storeToRefs(useCommonStore())

  const mode = useEditorMode()

  // The classes the heading carries on the real page - see Theme2, which
  // uses the same two, so a variant switch does not silently restyle the
  // text along with the layout.
  const DEFAULT_TITLE_CLASS = 'h2 text-bold text-black mb-5 text-center'
  const DEFAULT_SUBTITLE_CLASS = 'h6 text-black mb-5 text-center'

  // Assigns a new props object rather than mutating the current one: this
  // block's JSON may have no `props` key at all, in which case the model
  // falls back to a local default and mutating it emits nothing.
  function patch (changes: Partial<PropsModel>) {
    model.value = { ...model.value, ...changes }
  }

  const titleClass = computed(() => model.value?.titleClass || DEFAULT_TITLE_CLASS)
  const subtitleClass = computed(() => model.value?.subtitleClass || DEFAULT_SUBTITLE_CLASS)

  // Production prefixes the price with $t('booking.minPrice'); this app has
  // no i18n, so the same three strings are spelled out and picked by the
  // current locale - the shape every ported component here uses.
  const MIN_PRICE_LABEL: Record<string, string> = {
    uk: 'від',
    en: 'from',
    de: 'ab',
  }
  const minPriceLabel = computed(() => MIN_PRICE_LABEL[locale.value as string] || MIN_PRICE_LABEL.uk)

  const rowColors = computed(() => ({ ...DEFAULT_ROW_COLORS, ...model.value.colors }))
  const rowBorderColor = computed(() => `var(--${rowColors.value.rowBorder})`)
  const rowHoverColor = computed(() => `var(--${rowColors.value.rowHover})`)

  function setColors (changes: Partial<typeof DEFAULT_ROW_COLORS>) {
    patch({ colors: { ...model.value.colors, ...changes } })
  }

  const blockActionsTarget = useBlockActionsTarget()

  const destinations = MOCK_DESTINATIONS
</script>

<template>
  <div class="popular-destinations-block">
    <EditableBlockHeading
      :subtitle="model.subtitle"
      :subtitle-class="subtitleClass"
      :title="model.title"
      :title-class="titleClass"
      @update="patch"
    />

    <Teleport v-if="mode === 'edit'" :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
      <PopularDestinationsRowColors :colors="rowColors" @update="setColors" />
    </Teleport>

    <div class="my-12 mx-0">
      <div class="card-content">
        <!-- Same tags as the site, minus the <a>: there the row IS the link
          and the route name its text (that is the SEO shape), here the
          sample routes lead nowhere, and a real anchor to nothing would be
          a worse imitation than none. The h2 stays - it is what sets the
          row's own type scale. -->
        <div
          v-for="(destination, index) of destinations"
          :key="index"
          class="destination-item"
        >
          <h2 class="poular-route-name">
            {{ destination.cityFrom }} ➔ {{ destination.cityTo }}
          </h2>
          <v-spacer />
          <span class="destinamtion-price">{{ minPriceLabel }} {{ destination.price }} €</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Verbatim from production's own PopularDestinationsTheme1.vue, including
   the `.destinamtion-price` spelling - renaming it here would make the two
   files stop matching for no gain.

   The two colours are the exception: production names --accent-blue and
   --light-blue, which exist only in theme_1's palette, so under theme_2 the
   rule and the hover fill resolved to nothing at all. They come from the
   block's own settings now - see DEFAULT_ROW_COLORS. */
.card-content {
  border-radius: var(--default-border-radius);
  background: transparent;
}

.destination-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 32px 16px;
  margin: 4px 0;
  background: var(--white);
  border-radius: var(--super-border-radius);
  border-bottom: 2px solid v-bind(rowBorderColor);
  /* The same shadow theme_2 gives its destination cards (home.css). */
  box-shadow: 0 0 12px #00000020;
  /* The row reacts to hover, so it has to say it is reachable. On the site
     and in the preview it is an <a> and the browser does this anyway; in the
     editor the row is a plain <div> (there is nowhere to go), and without
     this the fill changed under an ordinary arrow cursor. Stated in all
     three so the CSS stays identical across the copies. */
  cursor: pointer;
}
.destination-item:hover {
  background: v-bind(rowHoverColor);
}

/* theme_1 sizes this from its own headers.css (`h2.poular-route-name`),
   which theme_2 has no equivalent of. */
h2.poular-route-name {
  font-size: 18px !important;
  font-weight: 400 !important;
  color: var(--black);
}

.destinamtion-price {
  color: var(--primary);
}

/* The row has two things in it now - the route's name and its price - where
   it used to have four (two city spans and an arrow between them), so the
   three-column grid that placed them has nothing left to place: city-from,
   city-to and arrow are gone, and a grid area with no element in it just
   leaves an empty column. Stacking the two that remain is the whole layout,
   and the row is already a flex line, so it only has to turn. */
@media screen and (max-width: 390px) {
  .destination-item {
    padding: 16px;
    flex-direction: column;
    align-items: center;
  }
  h2.poular-route-name {
    text-align: center;
  }
  .destinamtion-price {
    text-align: center;
    margin-top: 20px;
  }
}
</style>
