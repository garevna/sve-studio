<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import EditableBlockHeading from '@/components/editors/EditableBlockHeading.vue'
  import { MOCK_DESTINATIONS } from '@/configs/mock-destinations'
  import { useCommonStore } from '@/stores/common'
  import { formatTripDistance, formatTripDuration } from '@/utils/trip-duration'

  // The third way to draw "Популярні напрямки": the search-results TABLE from
  // the booking app's own search-results page - fixed header, a row per
  // route, price and button
  // in the last column.
  //
  // Without the expansion: that page's chevron opens a full trip card with
  // segments, stations and vehicle, and a popular route has none of that.
  // /marshrut/routes/popular answers with cityFrom, cityTo, duration,
  // distance, minPrice and a link - nothing else - so the two columns the
  // wizard fills from a searched TRIP (Відправлення / Прибуття, both times)
  // are replaced by the two facts a ROUTE actually carries, rather than left
  // empty or faked.
  //
  // Which variant a page uses is the block's own `content` - see
  // configs/component-variants.ts.
  defineOptions({ inheritAttrs: false })

  interface PropsModel {
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass?: string
    subtitleClass?: string
  }

  const model = defineModel<PropsModel>({ default: () => ({}) })

  const { locale } = storeToRefs(useCommonStore())

  const DEFAULT_TITLE_CLASS = 'h2 text-bold text-black mb-5 text-center'
  const DEFAULT_SUBTITLE_CLASS = 'h6 text-black mb-5 text-center'

  function patch (changes: Partial<PropsModel>) {
    model.value = { ...model.value, ...changes }
  }

  const titleClass = computed(() => model.value?.titleClass || DEFAULT_TITLE_CLASS)
  const subtitleClass = computed(() => model.value?.subtitleClass || DEFAULT_SUBTITLE_CLASS)

  // Column titles and the button label, spelled out per locale - production
  // takes them from i18n, and this app has none. The button says exactly what
  // variant 2's says (chips.schedule): one block in three shapes, and a
  // button that renames itself per variant reads as a different action.
  const TEXT: Record<string, Record<string, string>> = {
    uk: { route: 'Рейс', duration: 'Тривалість', distance: 'Відстань', price: 'Вартість', schedule: 'Розклад' },
    en: { route: 'Route', duration: 'Duration', distance: 'Distance', price: 'Price', schedule: 'Timetable' },
    de: { route: 'Route', duration: 'Dauer', distance: 'Entfernung', price: 'Preis', schedule: 'Zeitplan' },
  }
  const text = computed(() => TEXT[locale.value as string] || TEXT.uk!)

  const headers = computed(() => [
    { title: text.value.route, align: 'center' as const, key: 'title', sortable: false },
    { title: text.value.duration, align: 'start' as const, key: 'duration', sortable: false },
    { title: text.value.distance, align: 'start' as const, key: 'distance', sortable: false },
    { title: text.value.price, align: 'center' as const, key: 'price', sortable: false },
  ])

  const currentLocale = computed(() => locale.value as string)
  const destinations = MOCK_DESTINATIONS

  // Below 960px the wizard's own page swaps the table for a card per trip
  // (one card per trip) - a four-column table does
  // not survive a phone. Same threshold and the same plain resize listener it
  // uses, since there is no store behind this either.
  const winWidth = ref(window.innerWidth)
  function onResize () {
    winWidth.value = window.innerWidth
  }
  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))
  const isMobile = computed(() => winWidth.value < 960)

  // The rows a mobile card lists, in the table's own column order minus the
  // route itself, which is the card's title.
  function cardRows (destination: typeof MOCK_DESTINATIONS[number]) {
    return [
      { title: text.value.duration, value: formatTripDuration(destination.duration, currentLocale.value) },
      { title: text.value.distance, value: formatTripDistance(destination.distance, currentLocale.value) },
      { title: text.value.price, value: `${destination.price} €` },
    ]
  }
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

    <!-- Phones get a card per route, exactly as the wizard's own page does
      below the same 960px - a four-column table does not survive that width.
      Without the chevron: there is nothing to expand into. -->
    <template v-if="isMobile">
      <v-card
        v-for="(destination, index) of destinations"
        :key="index"
        class="popular-trip-card mb-4"
        flat
      >
        <v-card-title class="d-flex align-center justify-space-between">
          <p class="default-text text-medium text-special">{{ text.route }}</p>
          <h2 class="popular-destination-route default-text text-bold text-right">{{ destination.cityFrom }} - {{ destination.cityTo }}</h2>
        </v-card-title>
        <div class="popular-trip-card-content">
          <div v-for="row of cardRows(destination)" :key="row.title">
            <div class="d-flex justify-space-between my-2">
              <p class="small-text text-medium text-special">{{ row.title }}</p>
              <p class="small-text text-bold text-right">{{ row.value }}</p>
            </div>
            <v-divider />
          </div>
        </div>
        <v-btn class="primary-button">{{ text.schedule }}</v-btn>
      </v-card>
    </template>

    <!-- hide-default-footer: the wizard's table paginates because a search can
      return dozens of trips; a popular-routes block is a short curated list,
      and a pager under four rows reads as a control that does nothing. -->
    <v-data-table
      v-else
      class="popular-destinations-table"
      fixed-header
      :headers="headers"
      hide-default-footer
      :items="destinations"
      :items-per-page="-1"
    >
      <template #[`item.title`]="{ item }">
        <!-- Same shape as the other two variants: the route's name is the
          heading, and on the site it is also the link's text. Here there is
          no page to link to, so the anchor is left off - the heading is not. -->
        <h2 class="popular-destination-route default-text text-bold">{{ item.cityFrom }} - {{ item.cityTo }}</h2>
      </template>
      <template #[`item.duration`]="{ item }">
        <p class="default-text text-medium">{{ formatTripDuration(item.duration, currentLocale) }}</p>
      </template>
      <template #[`item.distance`]="{ item }">
        <p class="default-text text-medium">{{ formatTripDistance(item.distance, currentLocale) }}</p>
      </template>
      <template #[`item.price`]="{ item }">
        <h3 class="text-center">{{ item.price }} €</h3>
        <!-- No click handler, like every other control in this preview: the
          sample routes have no page to open. On the site this is a link to
          the route's own page, exactly as in variant 2. -->
        <v-btn class="primary-button">{{ text.schedule }}</v-btn>
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

/* Mobile card, after the search-results page's own trip card. */
.popular-trip-card {
  border: solid 1px var(--light-grey-1);
}
/* The header bleeds out over the card's own padding instead of sitting inset
   inside it. The card keeps that padding whatever this file says: theme_2's
   vuetify-card.css sets `.v-card--variant-flat { padding: 16px !important }`
   and is loaded into the `vuetify-app-styles` cascade layer, where an
   important declaration outranks an unlayered one no matter how specific -
   so `padding: 0` here loses. Pulling the title out by the same 16px gets
   the same result without fighting the layer, and the card's own
   overflow:hidden rounds the corners for free. */
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
.popular-destinations-table {
  max-width: 1440px;
  margin-inline: auto;
}
/* The theme paints this header (vuetify-tables.css:
   `.v-table.v-table--fixed-header > .v-table__wrapper > table > thead > tr > th
   { background: var(--bright-grey) }`), but VDataTable's own CSS is injected
   lazily - the component only loads when a page first renders it, which is
   after the theme's stylesheet - and Vuetify's identical selector then wins
   on source order. The scoped attribute alone only TIES it (both end up at
   three classes and four elements), so the th's own .v-data-table__th class
   is named too - that one class settles it without an !important. */
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
</style>
