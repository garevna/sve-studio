<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import { useCommonStore } from '@/stores/common'

  import CurrencyIcon from '../small/CurrencyIcon.vue'

  // popularTrips is the one member of the common store that isn't a ref or
  // computed - it's a plain static config array (configs/popular-trips.ts)
  // re-exported as-is. storeToRefs() only picks up refs/reactive values and
  // silently drops everything else, so pulling it out of storeToRefs left it
  // undefined - which is what v-for below then tried to iterate. It never
  // changes, so read it straight off the store instance instead.
  const commonStore = useCommonStore()
  const { locale, company } = storeToRefs(commonStore)
  const { popularTrips } = commonStore

  // The four icons a card shows, and the only place their defaults live.
  // Passed in as `icons` so a page can override any of them without the
  // component changing; anything not supplied falls back here, so a block
  // whose JSON has no `icons` key at all (which is every one of them today)
  // renders exactly as it did before this existed.
  const DEFAULT_CARD_ICONS = {
    cityFrom: 'mdi-map-marker',
    cityTo: 'mdi-map-marker',
    carrier: 'mdi-map-marker-path',
    duration: 'mdi-clipboard-text-clock-outline',
  }

  // The block's own heading, set in the visual editor. Optional: a page that
  // has not been migrated yet still composes its heading as separate text
  // blocks above this one, and nothing should appear twice.
  const props = defineProps<{
    title?: { uk: string, en: string, de: string }
    subtitle?: { uk: string, en: string, de: string }
    titleClass?: string
    subtitleClass?: string
    icons?: Partial<typeof DEFAULT_CARD_ICONS>
  }>()

  const cardIcons = computed(() => ({ ...DEFAULT_CARD_ICONS, ...props.icons }))

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')
  const titleText = computed(() => props.title?.[lang.value] || '')
  const subtitleText = computed(() => props.subtitle?.[lang.value] || '')

  const scheduleLabel = {
    uk: 'Розклад',
    en: 'Timetable',
    de: 'Zeitplan',
  }

  // Same-site links only.
  const linkOrigin = ''
  const linkTarget = import.meta.env.DEV ? '_blank' : '_self'

  function destinationHref (link: string) {
    return `${linkOrigin}${link}`
  }
  const currentLocale = computed(() => locale.value as string)

  // The API returns hours as a fraction (40.9). Rounded to the minute and
  // spelled out, because "40.9 год" is not how anyone reads a journey time.
  // Minutes are dropped when there are none, so a round trip reads "4 год"
  // rather than "4 год 0 хв".
  const DURATION_UNITS: Record<string, { hour: string, minute: string }> = {
    uk: { hour: 'год', minute: 'хв' },
    en: { hour: 'h', minute: 'min' },
    de: { hour: 'Std.', minute: 'Min.' },
  }
  function formatDuration (hours?: number): string {
    if (!hours || hours <= 0) {
      return ''
    }
    const units = DURATION_UNITS[currentLocale.value] || DURATION_UNITS['uk']!
    const total = Math.round(hours * 60)
    const h = Math.floor(total / 60)
    const m = total % 60
    return m === 0 ? `${h} ${units.hour}` : `${h} ${units.hour} ${m} ${units.minute}`
  }

</script>

<template>
  <!-- One root element, not a heading plus a grid side by side. A component
    that renders a fragment cannot inherit the attributes its host passes -
    and the host passes `id`, which is exactly what an in-page link needs to
    land on. Vue says so out loud ("Extraneous non-props attributes (id)
    were passed... could not be automatically inherited"); the block would
    have become unreachable as a jump target. -->
  <div class="popular-destinations-block">

    <!-- <div class="my-16 mx-0 text-center"> -->
    <!-- <h2 class="mb-12">{{ $t('destinations.header') }}</h2> -->
    <!-- <p v-if="props.subheader" :class="props.subheaderClass">
        {{ props.subheader }}
      </p> -->
    <p v-if="titleText" :class="props.titleClass || 'h2 text-bold text-black mb-5 text-center'">{{ titleText }}</p>
    <p v-if="subtitleText" :class="props.subtitleClass || 'h6 text-black mb-5 text-center'">{{ subtitleText }}</p>

    <div class="popular-destinations">
      <div
        v-for="(destination, index) of popularTrips"
        :key="index"
        class="popular-destination-card"
      >
        <h2 class="popular-destination-route">
          <!-- The route name is the link text. The card already linked to
            the same page through its "Розклад" button, but that anchor says
            "Розклад" on every card - identical, meaningless link text
            repeated as many times as there are routes. This one says which
            route it leads to.

            The <a> is INSIDE the heading, not around it: the heading is the
            thing, the link is what it does. It also carries the flex row, so
            the layout is unchanged and the heading stays a plain block.

            click.stop because the whole card has its own click handler going
            to the same place - without it the browser would follow the href
            and the card would open it a second time. -->
          <a
            class="popular-destination-link d-flex align-center justify-space-between"
            :href="destinationHref(destination.link)"
            :target="linkTarget"
            @click.stop
          >
            <span class="d-flex align-center gc-3">
              <v-icon v-if="cardIcons.cityFrom.startsWith('mdi-')" class="popular-destination-icon">{{ cardIcons.cityFrom }}</v-icon>
              <img v-else alt="" class="popular-destination-icon popular-destination-icon-image" :src="cardIcons.cityFrom">
              <span class="default-text text-bold text-black text-left">{{ destination.cityFrom }}</span>
            </span>

            <v-icon aria-hidden="true" color="primary">mdi-chevron-right</v-icon>
            <span class="route-separator"> — </span>
            <span class="d-flex align-center gc-3">
              <span class="default-text text-bold text-black text-right">{{ destination.cityTo }}</span>
              <v-icon v-if="cardIcons.cityTo.startsWith('mdi-')" class="popular-destination-icon">{{ cardIcons.cityTo }}</v-icon>
              <img v-else alt="" class="popular-destination-icon popular-destination-icon-image" :src="cardIcons.cityTo">
            </span>
          </a>
        </h2>
        <v-divider class="my-5" />
        <!-- Carrier and journey time. The carrier is the client's own name
          from global.json, not something the route data carries - the API
          returns no operator at all. The time comes from `duration`, which
          it returns as fractional hours (40.9), so it is formatted here
          rather than shown raw. -->
        <div class="popular-destination-meta">
          <span class="d-flex align-center gc-2">
            <v-icon v-if="cardIcons.carrier.startsWith('mdi-')" class="popular-destination-meta-icon" :size="18">{{ cardIcons.carrier }}</v-icon>
            <img v-else alt="" class="popular-destination-meta-icon-image" :src="cardIcons.carrier">
            {{ company?.name }}
          </span>
          <span class="d-flex align-center gc-2">
            <v-icon v-if="cardIcons.duration.startsWith('mdi-')" class="popular-destination-meta-icon" :size="18">{{ cardIcons.duration }}</v-icon>
            <img v-else alt="" class="popular-destination-meta-icon-image" :src="cardIcons.duration">
            {{ formatDuration(destination.duration) }}
          </span>
        </div>
        <v-divider class="my-5" />
        <div class="d-flex align-center justify-space-between">
          <p class="h4 text-bold text-primary">
            {{ destination.price }}
            <currency-icon color="dark-grey" :size="24" />
          </p>
          <v-btn
            class="primary-button w-33 mt-n3"
            :href="destinationHref(destination.link)"
            :target="linkTarget"
            @click.stop
          >
            {{ scheduleLabel[locale as keyof typeof scheduleLabel] }}
          </v-btn>
        </div>
        <v-spacer />
      </div>
    </div>
    <!-- </div> -->
  </div>
</template>

<style scoped>
/* The quiet middle line of the card: carrier on the left, journey time on
   the right. */
/* Small, quiet, and inheriting the row's own dark-grey - the meta line is a
   caption, not a heading, and an icon that outweighs its text would read as
   one. Sized via the `size` prop rather than CSS: it lands as an inline
   style and so never has to argue with Vuetify's own .v-icon--size-default. */
/* An icon may arrive as an mdi-* name or as an uploaded image - the site
   stores those as a base64 data URI, so no extra loading is involved either
   way and the two branches differ only in the tag. The image variants get
   an explicit box because <img> has no font-size to inherit. */
.popular-destination-icon-image {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.popular-destination-meta-icon-image {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.popular-destination-meta-icon {
  color: inherit;
}

.popular-destination-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  color: var(--dark-grey);
}

/* The heading's link carries the row's layout, so the heading itself stays a
   plain block and nothing about the card moves. It must not LOOK like a
   link either - the whole card has always been clickable, and an underlined
   blue route name would be a new visual element, not a fix. */
.popular-destination-link {
  color: inherit;
  text-decoration: none;
}

/* The route row is a heading (see the template) but must not look like one:
   its size and weight come from the classes on the words themselves, and the
   spacing from the row's own mb-*. Without this the browser's default h2
   styling would resize the card. */
.popular-destination-route {
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  margin-block: 0;
}
/* The city names used to be <p> elements, and Vuetify's reset gives every
   paragraph a 16px bottom margin - which is where this row's lower half of
   the gap actually came from. Turning them into <span> (a heading may only
   contain phrasing content) took that margin away and the two rows of the
   card closed up. Put back explicitly, on the row itself, so the spacing is
   now something this component states rather than something it inherits by
   accident from a tag choice. */
/* Read by anything parsing the heading's text and by screen readers, never
   seen: the chevron is a picture, and "Київ Варшава" without a separator is
   not the route's name. */
.popular-destination-route .route-separator {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
