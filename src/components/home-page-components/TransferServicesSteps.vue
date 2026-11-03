<script setup lang="ts">
  import type { StepBadgeShape } from '@/components/home-page-components/StepBadge.vue'
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
  import EditableBlockHeading from '@/components/editors/EditableBlockHeading.vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import TransferServicesCircle from '@/components/home-page-components/TransferServicesCircle.vue'
  import TransferStepDialog from '@/components/home-page-components/TransferStepDialog.vue'
  import TransferStepsActions from '@/components/home-page-components/TransferStepsActions.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { emptyTranslatedModel, resolveLocaleText } from '@/utils/locale-text'

  // "Кроки в кружках" - the numbered circles. Markup,
  // sizes and colours are production's own (see client-side's
  // TransferServicesSteps.vue / TransferServicesCircle.vue), which is the
  // point: the editor draws the real thing.
  //
  // The layout is the one part that was rewritten on both sides at once. It
  // used to be five circles placed by hand into a nine-column grid, with
  // two more hand-built grids behind media queries - so the number of steps
  // was fixed at five by CSS. What that grid actually draws is a parity
  // rule (odd high, even low, left to right), and stated as a rule it holds
  // for any number of circles and wraps by itself.
  defineOptions({ inheritAttrs: false })

  interface StepModel {
    text: TranslatedModel
    bold: TranslatedModel
  }

  interface PropsModel {
    title?: TranslatedModel
    subtitle?: TranslatedModel
    circles?: StepModel[]
    circleColor?: string
    numberColor?: string
    // The number's shape and what a hovered step does - one look for the
    // whole diagram. Absent: the disc and the lift it has always had.
    badge?: StepBadgeShape
    hover?: 'lift' | 'waves'
  }

  const model = defineModel<PropsModel>({ default: () => ({}) })

  const commonStore = useCommonStore()
  const mode = useEditorMode()
  const blockActionsTarget = useBlockActionsTarget()

  // The theme's own two colours (root.css's
  // --transfer-services-*-in-circle-background resolve to exactly these), so
  // a block saved before these fields existed looks unchanged.
  const DEFAULT_CIRCLE_COLOR = 'light-grey-1'
  const DEFAULT_NUMBER_COLOR = 'accent'

  const colors = computed(() => ({
    circleColor: model.value?.circleColor || DEFAULT_CIRCLE_COLOR,
    numberColor: model.value?.numberColor || DEFAULT_NUMBER_COLOR,
  }))
  const circleBackground = computed(() => `var(--${colors.value.circleColor})`)
  const numberBackground = computed(() => `var(--${colors.value.numberColor})`)

  function patch (changes: Partial<PropsModel>) {
    model.value = { ...model.value, ...changes }
  }

  const steps = computed(() => model.value?.circles ?? [])

  function localized (value: TranslatedModel | undefined) {
    return resolveLocaleText(value, commonStore.locale)
  }

  // A new circle joins the zigzag at whichever height its position calls
  // for, which can be most of a screen below (or above) the one added
  // before it - so on a long list "did that work?" is a fair question.
  // Scrolling to it answers that without any extra chrome; it lands empty
  // among filled ones, which is the rest of the answer.
  async function addStep () {
    const circles = model.value?.circles ?? []
    patch({ circles: [...circles, { text: emptyTranslatedModel(), bold: emptyTranslatedModel() }] })
    await nextTick()
    const added = root.value?.querySelectorAll('.transfer-steps-row > .transfer-steps-item')
    // Plain index access, not .at(-1): a NodeList has no .at() at runtime
    // (confirmed live - it threw "added?.at is not a function" and took the
    // rest of this handler with it), and spreading it into an array to get
    // one only moves the problem to the type checker, whose lib target here
    // predates Array.prototype.at.
    // eslint-disable-next-line unicorn/prefer-at
    added?.[added.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function removeStep (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('step')) return
    const circles = [...(model.value?.circles ?? [])]
    circles.splice(index, 1)
    patch({ circles })
    editingIndex.value = null
  }

  // Which step's dialog is open, by index rather than by object: deleting
  // from inside the dialog changes the array under it, and an index that no
  // longer exists resolves to null, which closes the dialog - exactly the
  // wanted behaviour, with nothing to reset by hand.
  const editingIndex = ref<number | null>(null)
  const editingStep = computed(() => (editingIndex.value === null ? null : steps.value[editingIndex.value] ?? null))

  const dragActive = ref(false)

  // Same staggered entrance production plays, so what is previewed here is
  // what a visitor sees. In edit mode it would replay on every keystroke
  // that re-renders the list, so there it simply stays revealed.
  const root = ref<HTMLElement | null>(null)
  const revealed = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (mode.value === 'edit' || !root.value || typeof IntersectionObserver === 'undefined') {
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
  <div ref="root" :class="['transfer-steps', { 'transfer-steps--revealed': revealed, 'transfer-steps--animated': mode !== 'edit' }]">
    <EditableBlockHeading
      :subtitle="model.subtitle"
      subtitle-class="h3 text-center mb-5"
      :title="model.title"
      title-class="h2 text-center mb-4"
      @update="patch"
    />

    <template v-if="mode === 'edit'">
      <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
        <TransferStepsActions
          v-model:drag-active="dragActive"
          :badge="model.badge"
          :colors="colors"
          :hover="model.hover"
          @add="addStep"
          @update="patch"
        />
      </Teleport>
    </template>

    <SortableList
      v-model:active="dragActive"
      class="desktop-mode transfer-steps-row"
      :items="model.circles"
    >
      <template #item="{ item: step, index, dragClass, contentClass }">
        <div
          :class="['transfer-steps-item', dragClass]"
          :style="{ '--step-index': index }"
        >
          <div :class="['transfer-steps-lift', contentClass, { 'transfer-steps-lift--still': model.hover === 'waves' }]">
            <TransferServicesCircle
              :badge="model.badge"
              :bold="localized((step as StepModel).bold)"
              :circle-color="circleBackground"
              :index="index"
              :number-color="numberBackground"
              :text="localized((step as StepModel).text)"
              :waves="model.hover === 'waves'"
            />
          </div>
          <!-- The circle is round and its number badge already occupies the
            top-left, so the one control a step needs sits opposite it.
            Delete lives inside the dialog rather than as a second button
            here: five overlapping circles with two fabs each is a thicket. -->
          <div v-if="mode === 'edit' && !dragActive" class="transfer-steps-edit">
            <ToolbarIconButton icon="mdi-pencil" :tooltip="t('transferSteps.edit')" @click="editingIndex = index" />
          </div>
        </div>
      </template>
    </SortableList>

    <!-- Below 600px the theme hides .desktop-mode outright, so without this
      the block would render as nothing at all in preview mode at a phone
      width. Production's own mobile column, rendered read-only: editing a
      step happens in the zigzag above, and duplicating the controls here
      would mean two pencils per step in the DOM at once. -->
    <div class="mobile-mode transfer-steps-column">
      <div
        v-for="(step, index) of steps"
        :key="index"
        class="transfer-steps-item"
        :style="{ '--step-index': index }"
      >
        <TransferServicesCircle
          :badge="model.badge"
          :bold="localized(step.bold)"
          :circle-color="circleBackground"
          :index="index"
          :number-color="numberBackground"
          :text="localized(step.text)"
        />
      </div>
    </div>

    <TransferStepDialog
      :index="editingIndex ?? 0"
      :step="editingStep"
      @close="editingIndex = null"
      @delete="removeStep(editingIndex ?? 0)"
    />
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
  position: relative;
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
/* The entrance runs everywhere EXCEPT while editing, and that is not a
   stylistic choice. `animation-fill-mode: both` keeps the animation owning
   `transform` after it has finished, and an animated value outranks the
   inline style Sortable writes while dragging - so with it on, a dragged
   circle reordered correctly on drop but never followed the cursor, which
   reads as "drag is broken". Editing is also the one mode where a re-entrance
   would replay on every keystroke that re-renders the list. */
.transfer-steps--animated .transfer-steps-item {
  animation: transfer-step-in 0.5s ease both;
  animation-delay: calc(var(--step-index, 0) * 90ms);
  animation-play-state: paused;
}
.transfer-steps--animated.transfer-steps--revealed .transfer-steps-item {
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
/* Waves are the hover effect instead of the lift, not on top of it. */
.transfer-steps-lift--still:hover {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .transfer-steps--animated .transfer-steps-item {
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

/* Sortable names the element being dragged but ships no styling for it.
   Without one, a drag over overlapping circles gives no sign of which one
   is in hand. */
.transfer-steps-item.sortable-ghost {
  opacity: 0.35;
}

/* z-index, because the circles overlap by 80px horizontally and a later
   sibling paints over an earlier one: the pencil of a low circle sits
   exactly under the box of the high circle that follows it, and clicking it
   hit that box instead (confirmed live - the dialog stopped opening for
   every even-numbered step the moment the zigzag was tightened). The item
   itself has no z-index, so it forms no stacking context of its own and
   this lifts the button clear of every sibling rather than only of its own
   circle. */
.transfer-steps-edit {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 8px;
}
</style>
