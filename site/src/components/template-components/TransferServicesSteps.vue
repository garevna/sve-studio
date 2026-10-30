<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref } from 'vue'

  import type { TranslatedModel } from '@/types/common/TemplateBlockModel'

  import { useCommonStore } from '@/stores/common'

  import TransferServicesCircle from '../main-page-sections/TransferServicesCircle.vue'

  // This app has no vue-i18n at all - the locale is the one the editor's own
  // switcher put in the store (see stores/common.ts), which is also what the
  // preview window is given as a query param.
  const { locale } = storeToRefs(useCommonStore())

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')

  const props = defineProps<{
    title: TranslatedModel
    subtitle: TranslatedModel
    circles: {
      text: TranslatedModel
      bold: TranslatedModel
    }[]
    // Palette keys, set in the visual editor. Absent means the two colours
    // the theme has always used - root.css's
    // --transfer-services-text-in-circle-background and its number twin
    // resolve to exactly these - so a block saved before the fields existed
    // renders unchanged.
    circleColor?: string
    numberColor?: string
  }>()

  const circleBackground = computed(() => `var(--${props.circleColor || 'light-grey-1'})`)
  const numberBackground = computed(() => `var(--${props.numberColor || 'accent'})`)

  // The circles appear one after another when the block scrolls into view.
  // This is a list of STEPS, and a staggered reveal is the one piece of
  // motion that says so - a static diagram gives no hint that the order
  // means anything. Once only: a block that replays its entrance every time
  // it scrolls past becomes noise.
  const root = ref<HTMLElement | null>(null)
  const revealed = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    // No IntersectionObserver, or no element yet, must never mean "invisible
    // block" - fall straight through to the revealed state instead.
    if (!root.value || typeof IntersectionObserver === 'undefined') {
      revealed.value = true
      return
    }
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        revealed.value = true
        observer?.disconnect()
        observer = null
      }
    }, { threshold: 0.15 })
    observer.observe(root.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })
</script>

<template>
  <div ref="root" :class="['transfer-steps', { 'transfer-steps--revealed': revealed }]">
    <h2 class="text-center mb-4">{{ props.title[lang] }}</h2>
    <h3 class="text-center mb-5">{{ props.subtitle[lang] }}</h3>

    <!-- One zigzag for any number of circles. The old version placed five of
      them by hand into a nine-column grid, but the shape that grid drew is
      just a parity rule - odd circles high, even circles low, left to
      right - so it is stated once here instead. Wrapping is the flex
      container's own job, which is what lets a sixth or a tenth circle work
      without touching the CSS. -->
    <div class="desktop-mode transfer-steps-row">
      <div
        v-for="(circle, index) of props.circles"
        :key="index"
        class="transfer-steps-item"
        :style="{ '--step-index': index }"
      >
        <div class="transfer-steps-lift">
          <TransferServicesCircle
            :bold="circle.bold[lang]"
            :circle-color="circleBackground"
            :index="index"
            :number-color="numberBackground"
            :text="circle.text[lang]"
          />
        </div>
      </div>
    </div>

    <div class="mobile-mode transfer-steps-column">
      <div
        v-for="(circle, index) of props.circles"
        :key="index"
        class="transfer-steps-item"
        :style="{ '--step-index': index }"
      >
        <TransferServicesCircle
          :bold="circle.bold[lang]"
          :circle-color="circleBackground"
          :index="index"
          :number-color="numberBackground"
          :text="circle.text[lang]"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 302px is the circle's own box (see TransferServicesCircle). Giving each
   one 40px of negative margin on BOTH sides is what produces the overlap
   the design has always had - 222px of horizontal step per circle - while
   keeping it a property of the circle itself, so it survives wrapping. A
   first-in-row rule could not: which item starts a row is not something CSS
   can address. Five circles then occupy 1190px, the exact width the old
   hand-built grid added up to. */
.transfer-steps-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  /* flex-start, not center: a centred row centres its LAST line too, so a
     line that is not full starts at a different x than the ones above it -
     which is what made a wrapped circle look misplaced rather than wrapped.
     Every line now begins at the same left edge, and the block as a whole is
     centred by the box instead (margin-inline below). */
  justify-content: flex-start;
  /* How many circles a line holds, stated as a width because that is what
     flex wraps on. 222px of step each plus the 80px the end circles hang
     over = 1190px for five, the exact width the old hand-built grid added
     up to. A sixth circle therefore starts a second line instead of
     squeezing a wider one. */
  max-width: 1190px;
  margin-top: 80px;
  margin-right: auto;
  margin-bottom: 108px;
  margin-left: auto;
  row-gap: 40px;
}
/* A line must hold an ODD number of circles, and that is the composition,
   not a preference: the low circles sit in the GAPS between the high ones,
   so three high leave two gaps and the line reads 3 over 2. End a line on a
   low circle instead and it hangs off the end with nothing above it to be
   between. The design's own tablet grid says the same thing in its own way -
   at 1170px it went to two high with one nested below, three per line, not
   two. 3 * 222 + 80 = 746. */
.transfer-steps-row .transfer-steps-item {
  margin-inline: -40px;
}
/* The low half of the zigzag, counted WITHIN a line rather than across the
   whole list. With a line of five, the low ones are the 2nd and the 4th of
   every five - so a wrapped line starts high again, and its low circles land
   in that line's own gaps. Plain :nth-child(even) counted globally instead,
   which made every second line start on a low circle with nothing above it
   to be between - the composition read as broken the moment the list
   wrapped.
   300px, and it must not be tightened. The limit is not the disc but the
   NUMBER BADGE, which sits outside its own circle at the top left: a low
   circle's badge (38px radius, centred 124px to the right of and 98px above
   its high neighbour's centre) clears that neighbour's 136px disc only from
   a 220px drop onwards - so anything at or below 220 puts the number on top
   of the previous circle, which is exactly what a tightened version did.
   300px is the design's own value and keeps a real margin over that floor.
   A newly added circle stays findable by being scrolled to, not by
   shortening the block. */
.transfer-steps-row .transfer-steps-item:nth-child(5n+2),
.transfer-steps-row .transfer-steps-item:nth-child(5n+4) {
  margin-top: 300px;
}

/* Three per line below the desktop layout, which is what the design's own
   tablet grid did (at 1170px it went to two high with one nested between
   them below). The breakpoint is 1250px rather than the round 1200: a line
   wraps on the items' OUTER width, 222px each, so five need 1110px of
   container - and this page's container is the viewport minus 132px, which
   only reaches 1110 at about 1242px of window. Break any later and the
   five-per-line rule would be styling a line that actually holds four.
   Three per line means the low one is the 2nd of every three; the
   five-per-line selectors are undone first, since they pick different
   children and would otherwise drop circles that belong at the top. Same
   specificity, so the later rule - this one - wins. */
@media screen and (max-width: 1250px) {
  .transfer-steps-row {
    max-width: 746px;
  }
  .transfer-steps-row .transfer-steps-item:nth-child(5n+2),
  .transfer-steps-row .transfer-steps-item:nth-child(5n+4) {
    margin-top: 0;
  }
  .transfer-steps-row .transfer-steps-item:nth-child(3n+2) {
    margin-top: 300px;
  }
}

/* Below ~800px three circles no longer fit at the full 222px step (3 * 222
   = 666px of container, which this page only has from a 798px window up),
   and a line of two would put a low circle first with nothing above it.
   Rather than change the composition, the step tightens: 156px still keeps
   two same-level circles 312px apart, clear of their 272px discs. The
   design did the same thing - its own 690px breakpoint narrowed its grid
   tracks instead of rearranging the circles. */
@media screen and (max-width: 800px) {
  .transfer-steps-row {
    max-width: 468px;
  }
  .transfer-steps-row .transfer-steps-item {
    margin-inline: -73px;
  }
}

.transfer-steps-column {
  justify-self: center;
  margin-top: 108px;
}

/* Reveal and hover sit on two different elements on purpose. An animation
   with fill-mode outranks a transition on the same property, so a lift on
   hover would simply never apply to an element whose transform the entrance
   animation still owns. */
.transfer-steps-item {
  animation: transfer-step-in 0.5s ease both;
  animation-delay: calc(var(--step-index, 0) * 90ms);
  animation-play-state: paused;
}
.transfer-steps--revealed .transfer-steps-item {
  animation-play-state: running;
}
@keyframes transfer-step-in {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.transfer-steps-lift {
  transition: transform 0.25s ease;
}
.transfer-steps-lift:hover {
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .transfer-steps-item {
    animation: none;
    opacity: 1;
  }
  .transfer-steps-lift {
    transition: none;
  }
  .transfer-steps-lift:hover {
    transform: none;
  }
}
</style>
