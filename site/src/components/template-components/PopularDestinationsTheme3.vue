<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref } from 'vue'

  import { useCommonStore } from '@/stores/common'

  import { formatTripDistance, formatTripDuration } from '../../services/trip-duration'
  import CurrencyIcon from '../small/CurrencyIcon.vue'

  // The third way to draw "Популярні напрямки": the search-results table from
  // the /search page (theme_2/TripVariants.vue) - fixed header, a row per
  // route, price and button in the last column, cards below 960px.
  //
  // Without the expansion the search page has: its chevron opens a full trip
  // card with segments, stations and vehicle, and a popular route carries none
  // of that. /marshrut/routes/popular answers with cityFrom, cityTo, duration,
  // distance, minPrice and a link - so the two columns the search table fills
  // from a searched TRIP (Відправлення / Прибуття) are replaced by the two
  // facts a ROUTE actually has, rather than left empty or faked.
  //
  // Which variant a page uses is the block's own `content`, set in the visual
  // editor; all three variants share these props, so the heading survives a
  // switch between them.
  // popularTrips is a plain static array on the store, not a ref - storeToRefs
  // would drop it. Same reason as this block's other variants.
  const commonStore = useCommonStore()
  const { locale } = storeToRefs(commonStore)
  const { popularTrips } = commonStore

  const props = defineProps<{
    title?: { uk: string, en: string, de: string }
    subtitle?: { uk: string, en: string, de: string }
    titleClass?: string
    subtitleClass?: string
  }>()

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')
  const titleText = computed(() => props.title?.[lang.value] || '')
  const subtitleText = computed(() => props.subtitle?.[lang.value] || '')

  // This app has no i18n: the same strings the site takes from chips.* are
  // spelled out and picked by the current locale.
  const TEXT: Record<string, Record<string, string>> = {
    uk: { route: 'Рейс', duration: 'Час у дорозі', distance: 'Відстань', cost: 'Вартість', schedule: 'Розклад' },
    en: { route: 'Route', duration: 'Journey time', distance: 'Distance', cost: 'Cost', schedule: 'Timetable' },
    de: { route: 'Flug', duration: 'Reisedauer', distance: 'Entfernung', cost: 'Kosten', schedule: 'Zeitplan' },
  }
  function t (key: string) {
    const bag = TEXT[locale.value as string] || TEXT.uk!
    return bag[key.replace('chips.', '')] || ''
  }

  // Same-site links only.
  const linkOrigin = ''
  const linkTarget = import.meta.env.DEV ? '_blank' : '_self'

  function destinationHref (link: string) {
    return `${linkOrigin}${link}`
  }

  const headers = computed(() => [
    { title: t('chips.route'), align: 'center' as const, key: 'title', sortable: false },
    { title: t('chips.duration'), align: 'start' as const, key: 'duration', sortable: false },
    { title: t('chips.distance'), align: 'start' as const, key: 'distance', sortable: false },
    { title: t('chips.cost'), align: 'center' as const, key: 'price', sortable: false },
  ])

  // Below 960px the search page swaps its table for a card per trip - a
  // four-column table does not survive a phone. Same threshold and the same
  // plain resize listener that page uses.
  const winWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
  function onResize () {
    winWidth.value = window.innerWidth
  }
  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))
  const isMobile = computed(() => winWidth.value < 960)

  interface PopularRoute {
    id: number
    link: string
    cityFrom: string
    cityTo: string
    price: number
    duration?: number
    distance?: number
  }

  // The rows a mobile card lists, in the table's own column order minus the
  // route itself, which is the card's title.
  function cardRows (destination: PopularRoute) {
    return [
      { title: t('chips.duration'), value: formatTripDuration(destination.duration, lang.value), price: false },
      { title: t('chips.distance'), value: formatTripDistance(destination.distance, lang.value), price: false },
      { title: t('chips.cost'), value: String(destination.price), price: true },
    ]
  }
</script>

<template>
  <div class="popular-destinations-block">
    <h2 :class="props.titleClass || 'my-8'">{{ titleText }}</h2>
    <p v-if="subtitleText" :class="props.subtitleClass">{{ subtitleText }}</p>

    <template v-if="isMobile">
      <v-card
        v-for="destination in (popularTrips as PopularRoute[])"
        :key="destination.id"
        class="popular-trip-card mb-4"
        flat
      >
        <v-card-title class="d-flex align-center justify-space-between">
          <p class="default-text text-medium text-special">{{ t('chips.route') }}</p>
          <a
            class="popular-destination-link"
            :href="destinationHref(destination.link)"
            :target="linkTarget"
          >
            <h2 class="popular-destination-route default-text text-bold text-right">{{ destination.cityFrom }} - {{ destination.cityTo }}</h2>
          </a>
        </v-card-title>
        <div class="popular-trip-card-content">
          <div v-for="row of cardRows(destination)" :key="row.title">
            <div class="d-flex justify-space-between my-2">
              <p class="small-text text-medium text-special">{{ row.title }}</p>
              <p class="small-text text-bold text-right">
                {{ row.value }}
                <CurrencyIcon v-if="row.price" :size="16" />
              </p>
            </div>
            <v-divider />
          </div>
        </div>
        <v-btn
          class="primary-button"
          :href="destinationHref(destination.link)"
          :target="linkTarget"
        >
          {{ t('chips.schedule') }}
        </v-btn>
      </v-card>
    </template>

    <!-- hide-default-footer: the search table paginates because a search can
      return dozens of trips; a popular-routes block is a short curated list,
      and a pager under four rows reads as a control that does nothing. -->
    <v-data-table
      v-else
      class="popular-destinations-table"
      fixed-header
      :headers="headers"
      hide-default-footer
      item-value="id"
      :items="popularTrips"
      :items-per-page="-1"
    >
      <template #[`item.title`]="{ item }">
        <!-- The route's name is both the heading and the link's text - an
          anchor reading "Київ - Варшава" says where it goes, which "Розклад"
          on every row does not. Same shape as the other two variants. -->
        <a
          class="popular-destination-link"
          :href="destinationHref(item.link)"
          :target="linkTarget"
        >
          <h2 class="popular-destination-route default-text text-bold">{{ item.cityFrom }} - {{ item.cityTo }}</h2>
        </a>
      </template>
      <template #[`item.duration`]="{ item }">
        <p class="default-text text-medium">{{ formatTripDuration(item.duration, lang) }}</p>
      </template>
      <template #[`item.distance`]="{ item }">
        <p class="default-text text-medium">{{ formatTripDistance(item.distance, lang) }}</p>
      </template>
      <template #[`item.price`]="{ item }">
        <h3 class="text-center">
          {{ item.price }}
          <CurrencyIcon :size="24" />
        </h3>
        <v-btn
          class="primary-button"
          :href="destinationHref(item.link)"
          :target="linkTarget"
        >
          {{ t('chips.schedule') }}
        </v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<style scoped>
/* The route name is a heading that must not look like one. Variant 2 does
   that with `font-size: inherit`, because there the size comes from spans
   INSIDE the heading; here the classes sit on the heading itself, and
   `inherit` overrode them - the name came out at the cell's own 14px/400
   instead of default-text/text-bold's 16px/600. So only the margin is reset
   and the text classes decide, exactly as in every other cell of the row. */
.popular-destination-route {
  margin-block: 0;
}
.popular-destination-link {
  color: inherit;
  text-decoration: none;
}

.popular-destinations-table {
  max-width: 1440px;
  margin-inline: auto;
}
/* The theme paints this header (vuetify-tables.css), but Vuetify's identical
   selector can win on source order wherever its table CSS loads last. Naming
   the th's own class puts one more class on this side and settles it without
   an !important. */
.popular-destinations-table :deep(.v-table__wrapper > table > thead > tr > th.v-data-table__th) {
  background: var(--bright-grey);
}

/* The theme already draws the line between rows - vuetify-tables.css sets
   `.v-data-table__tr { border-bottom: var(--light-border) }` - but a row
   border only paints in a collapsed table, and Vuetify's own
   `.v-table__wrapper table` is `border-collapse: separate`, so it never
   showed. Collapsing the table here lets the theme's own rule and its own
   colour render, rather than restating a border with a colour of mine. The
   theme's `td { border-bottom: none !important }` is untouched: it lives in
   a cascade layer and would outrank anything stated here anyway. */
.popular-destinations-table :deep(.v-table__wrapper > table) {
  border-collapse: collapse;
}

/* Mobile card, after the search page's own TripMobileCard.vue. */
.popular-trip-card {
  border: solid 1px var(--light-grey-1);
}
/* The header bleeds out over the card's own padding instead of sitting inset
   inside it. The card keeps that padding whatever this file says: theme_2's
   vuetify-card.css sets `.v-card--variant-flat { padding: 16px !important }`
   and is loaded into a cascade layer, where an important declaration outranks
   an unlayered one no matter how specific - so `padding: 0` here loses.
   Pulling the title out by the same 16px gets the same result without
   fighting the layer, and the card's own overflow:hidden rounds the corners
   for free. */
.popular-trip-card :deep(.v-card-title) {
  margin: -16px -16px 0;
}
.popular-trip-card-content {
  padding: 16px;
}
/* Vuetify ships dividers at opacity .12, which on this card reads as no line
   at all. Same colour the card's own border uses, at full strength, so the
   rows are actually separated. */
.popular-trip-card :deep(.v-divider) {
  border-color: var(--light-grey-1);
  opacity: 1;
}
.popular-trip-card button {
  width: calc(100% - 32px) !important;
  margin: 16px;
}
</style>
