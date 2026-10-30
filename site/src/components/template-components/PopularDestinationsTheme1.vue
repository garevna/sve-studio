<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import { useCommonStore } from '@/stores/common'

  import CurrencyIcon from '../small/CurrencyIcon.vue'

  // Same reason as this block's Theme2 sibling: popularTrips is a plain
  // static array on the store, not a ref, so storeToRefs would drop it.
  const commonStore = useCommonStore()
  const { locale } = storeToRefs(commonStore)
  const { popularTrips } = commonStore

  // The block's own heading, set in the visual editor - identical props to
  // Theme2, so switching variants keeps the text.

  // The two colours the rows are built from, as palette keys applied as
  // var(--key). Production's own file names --accent-blue and --light-blue,
  // which live only in theme_1's palette - under theme_2 both resolve to
  // nothing and the rows lose their rule and their hover fill. These are
  // theme_2's nearest equivalents, and the block can override either.
  const DEFAULT_ROW_COLORS = {
    rowBorder: 'accent',
    rowHover: 'light-grey-2',
  }

  const props = defineProps<{
    title?: { uk: string, en: string, de: string }
    subtitle?: { uk: string, en: string, de: string }
    titleClass?: string
    subtitleClass?: string
    colors?: Partial<typeof DEFAULT_ROW_COLORS>
  }>()
  const rowColors = computed(() => ({ ...DEFAULT_ROW_COLORS, ...props.colors }))
  const rowBorderColor = computed(() => `var(--${rowColors.value.rowBorder})`)
  const rowHoverColor = computed(() => `var(--${rowColors.value.rowHover})`)

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')
  const titleText = computed(() => props.title?.[lang.value] || '')
  const subtitleText = computed(() => props.subtitle?.[lang.value] || '')

  // Production prefixes the price with $t('booking.minPrice'); this app has
  // no i18n, so the three strings are spelled out and picked by locale.
  const MIN_PRICE_LABEL: Record<string, string> = {
    uk: 'від',
    en: 'from',
    de: 'ab',
  }
  const minPriceLabel = computed(() => MIN_PRICE_LABEL[locale.value as string] || MIN_PRICE_LABEL.uk)

  // Same-site links only.
  const linkOrigin = ''
  const linkTarget = import.meta.env.DEV ? '_blank' : '_self'

  function destinationHref (link: string) {
    return `${linkOrigin}${link}`
  }
</script>

<template>
  <div class="my-12 mx-0">
    <h2 :class="props.titleClass || 'my-8'">{{ titleText }}</h2>
    <p v-if="subtitleText" :class="props.subtitleClass">{{ subtitleText }}</p>
    <div class="card-content">
      <!-- The row is the link and the route's name is its text - see the
        client-side file this is copied from. -->
      <a
        v-for="(destination, index) of popularTrips"
        :key="index"
        class="destination-item"
        :href="destinationHref(destination.link)"
        :target="linkTarget"
      >
        <h2 class="poular-route-name">
          {{ destination.cityFrom }} ➔ {{ destination.cityTo }}
        </h2>
        <v-spacer />
        <span class="destinamtion-price">{{ minPriceLabel }} {{ destination.price }}
          <currency-icon class="ml-1" color="primary" :size="20" />
        </span>
      </a>
    </div>
  </div>
</template>

<style scoped>
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
  /* The same shadow theme_2 gives its destination cards (home.css) - the two
     variants are the same block in two shapes, so a row should sit off the
     page exactly as far as a card does. */
  box-shadow: 0 0 12px #00000020;
  /* The row reacts to hover, so it has to say it is reachable. On the site
     and in the preview it is an <a> and the browser does this anyway; in the
     editor the row is a plain <div> (there is nowhere to go), and without
     this the fill changed under an ordinary arrow cursor. Stated in all
     three so the CSS stays identical across the copies. */
  cursor: pointer;
  color: inherit;
  text-decoration: none;
}
.destination-item:hover {
  background: v-bind(rowHoverColor);
}

/* theme_1 sizes this from its own headers.css; theme_2 has no equivalent. */
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
