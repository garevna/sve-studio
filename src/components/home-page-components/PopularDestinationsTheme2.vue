<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import EditableBlockHeading from '@/components/editors/EditableBlockHeading.vue'
  import PopularDestinationsActions from '@/components/home-page-components/PopularDestinationsActions.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useCommonStore } from '@/stores/common'

  // See EditableBlockWrapper: TemplateItem spreads item.props onto this
  // component as attributes as well as binding them as a model, so anything
  // not declared here would otherwise land on the root element - `title`
  // among them, as title="[object Object]", which the browser shows as a
  // native tooltip.
  defineOptions({ inheritAttrs: false })

  // Real markup ported from client-side's own PopularDestinationsTheme2.vue
  // (card grid, map-marker icons, chevron, price, "Розклад" button) - only
  // the data source differs: production reads commonStore.popularRoutes (a
  // live API call this editor has no equivalent for), so this renders a
  // small hardcoded example array through the same real markup instead.
  // Insert/delete only, per the user's own instruction - no edit-mode UI
  // here. No scoped CSS needed: .popular-destinations/.popular-destination-card/
  // .popular-destination-icon already ship in this editor's own copy of
  // production's theme_2/styles/home.css (public/files/theme_2/styles/home.css),
  // loaded globally the same way it is in production.
  //
  // The heading and lead line belong to this block now, as its own props -
  // they used to be two separate text blocks sitting above it in the page
  // JSON, which meant they could be reordered away from it, deleted
  // independently, or left behind when the block moved. A heading that
  // belongs to a component is part of that component.
  //
  // Only alignment and the gap below are editable: size, weight and colour
  // are the theme's, and offering them would be offering settings that do
  // not reach the site.
  //
  // The button and currency icon are non-functional here (no real schedule
  // route or customer-currency store in this editor) - currency is a plain
  // "€" instead of porting production's CurrencyIcon.vue, which depends on
  // useCustomerStore() (real customer currency selection, no equivalent here).
  // The button deliberately has no `disabled` attribute despite not going
  // anywhere real - confirmed live: Vuetify's disabled visual state (washed-
  // out grey) doesn't match production's real, enabled, primary-blue button
  // at all. A plain <v-btn> with no click handler is already a harmless
  // no-op without needing `disabled` to make it one.
  interface PropsModel {
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass?: string
    subtitleClass?: string
    icons?: Partial<typeof DEFAULT_CARD_ICONS>
  }

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

  const model = defineModel<PropsModel>({ default: () => ({}) })

  const cardIcons = computed(() => ({ ...DEFAULT_CARD_ICONS, ...model.value.icons }))

  // Where the block's own settings button goes - the nearest
  // EditableBlockWrapper's toolbar, found by injection rather than threaded
  // through TemplateItem's generic dispatch. Null when there is no wrapper
  // above, which Teleport's own :disabled handles by rendering in place.
  const blockActionsTarget = useBlockActionsTarget()

  function setIcons (changes: Partial<typeof DEFAULT_CARD_ICONS>) {
    patch({ icons: { ...model.value.icons, ...changes } })
  }

  const { locale, companyName } = storeToRefs(useCommonStore())

  const mode = useEditorMode()

  // Exactly the classes the two separate blocks above this component
  // already carry on the real page - moving the text inside must not
  // change how it looks, and an invented default is a redesign nobody
  // asked for. That is also what keeps the format controls honest: with
  // the styling already right, alignment is genuinely the only thing left
  // to decide.
  const DEFAULT_TITLE_CLASS = 'h2 text-bold text-black mb-5 text-center'
  const DEFAULT_SUBTITLE_CLASS = 'h6 text-black mb-5 text-center'

  // Every write ASSIGNS a new props object rather than mutating the current
  // one. That matters here specifically: this block's JSON has no `props`
  // key at all (only type/id/content), so `v-model="item.props"` binds
  // undefined and the model falls back to a local default object. Mutating
  // that object in place changes nothing anybody can see - no update is
  // emitted, `item.props` stays undefined, and the text is gone by the next
  // render. Assigning emits, which is what actually creates the props
  // object on the block.
  function patch (changes: Partial<PropsModel>) {
    model.value = { ...model.value, ...changes }
  }

  const titleClass = computed({
    get: () => model.value?.titleClass || DEFAULT_TITLE_CLASS,
    set: (value: string) => patch({ titleClass: value }),
  })
  const subtitleClass = computed({
    get: () => model.value?.subtitleClass || DEFAULT_SUBTITLE_CLASS,
    set: (value: string) => patch({ subtitleClass: value }),
  })

  interface FakeDestination {
    cityFrom: string
    cityTo: string
    price: number
    // Hours as a fraction, exactly as the real API returns it - the sample
    // has to exercise the same formatting production does.
    duration: number
  }

  const destinations: FakeDestination[] = [
    { cityFrom: 'Київ', cityTo: 'Варшава', price: 45, duration: 12.5 },
    { cityFrom: 'Львів', cityTo: 'Прага', price: 38, duration: 10 },
    { cityFrom: 'Одеса', cityTo: 'Будапешт', price: 52, duration: 18.25 },
    { cityFrom: 'Харків', cityTo: 'Братислава', price: 60, duration: 23.75 },
  ]
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

    <!-- The heading, above the grid it belongs to. In edit mode each line is
      a text field with the two controls that actually apply to it; in every
      other mode it is the same plain paragraph production renders. -->
    <EditableBlockHeading
      :subtitle="model.subtitle"
      :subtitle-class="subtitleClass"
      :title="model.title"
      :title-class="titleClass"
      @update="patch"
    />

    <template v-if="mode === 'edit'">
      <!-- Falls back to rendering in place when there is no ancestor toolbar
        to reach (see useEditableBlockActions.ts); in practice
        DynamicPageTemplate.vue always wraps a type:'component' block in
        EditableBlockWrapper, so there always is one. -->
      <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
        <PopularDestinationsActions :icons="cardIcons" @update="setIcons" />
      </Teleport>
    </template>

    <div class="popular-destinations">
      <div v-for="(destination, index) of destinations" :key="index" class="popular-destination-card">
        <h2 class="popular-destination-route d-flex align-center justify-space-between">
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
            {{ companyName }}
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
            {{ destination.price }} €
          </p>
          <v-btn class="primary-button w-33 mt-n3">
            Розклад
          </v-btn>
        </div>
      </div>
    </div>
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

/* The spacing control sits beside the field, not under it - the field is
   the whole row otherwise. */
</style>
