<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

  import { storeToRefs } from 'pinia'
  import SwiperCore from 'swiper'

  import { Autoplay, Navigation, Pagination } from 'swiper/modules'
  import { Swiper, SwiperSlide } from 'swiper/vue'

  import { computed, onUnmounted, ref, watch } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import ResizableWrapper from '@/components/editors/ResizableWrapper.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSortableList } from '@/composables/useSortableList'
  import { useCommonStore } from '@/stores/common'
  import { stableKey } from '@/utils/stable-key'
  import CardContainerActions from '../cards/CardContainerActions.vue'
  import CardEditDialog from '../cards/CardEditDialog.vue'
  import TemplateCard from '../cards/TemplateCard.vue'
  import 'swiper/css/autoplay'
  import 'swiper/css'
  import 'swiper/css/navigation'
  import 'swiper/css/pagination'

  SwiperCore.use([Navigation, Autoplay, Pagination])

  const { winSize } = storeToRefs(useCommonStore())

  const mode = useEditorMode()
  const space = 16

  // `block` (the parent "carousel" block itself) is optional only so this
  // component keeps working if ever invoked without it - CardContainerActions
  // (add card / switch ver) just doesn't render without a block to act on.
  const props = defineProps<{ cards: TemplateBlockModel[], height: number, block?: TemplateBlockModel }>()
  const emit = defineEmits<{ delete: [] }>()

  const modules = [Autoplay, Pagination, Navigation]

  const progressCircle = ref(null)
  const progressContent = ref(null)

  function onAutoplayTimeLeft (s: any, time: number, progress: number) {
    if (progressCircle.value) {
      (progressCircle.value as HTMLElement).style.setProperty('--progress', (1 - progress).toString())
    }
    if (progressContent.value) {
      (progressContent.value as HTMLElement).textContent = `${Math.ceil(time / 1000)}s`
    }
  }

  // Carousel cards edit the same way as any other card - a pencil fab opens
  // the shared CardEditDialog, instead of an inline always-visible form.
  const editingIndex = ref<number | null>(null)
  const editingCardModel = computed(() => (editingIndex.value === null ? null : props.cards[editingIndex.value]) ?? null)
  function openCardEditor (index: number) {
    editingIndex.value = index
  }
  function closeCardEditor () {
    editingIndex.value = null
  }

  const dragActive = ref(false)
  const { container: cardsContainer } = useSortableList(() => props.cards, dragActive)

  // Production computes slidesPerShow from window.innerWidth (winSize), and
  // that's fine there because its page has no persistent chrome eating into
  // the width - the swiper's actual rendered width is essentially the full
  // window. The editor's own UI (sidebar, system bar, etc.) means the
  // swiper's real width is meaningfully narrower than the window, so reusing
  // winSize here systematically overestimates it. Swiper's own internal
  // per-slide size (used for positioning, in numeric slides-per-view mode)
  // is computed from ITS actual measured container width divided by
  // slidesPerView - if slidesPerShow is computed from a wider number than
  // that real width, Swiper's internal per-slide size comes out smaller than
  // our CSS-forced card width, and consecutive slides get positioned closer
  // together than they're actually rendered - visually, overlap. Measuring
  // the real container element directly (instead of trusting winSize) fixes
  // this at the source rather than fighting Swiper's positioning after the
  // fact.
  const swiperContainer = ref<HTMLElement | null>(null)
  const measuredContainerWidth = ref(0)
  let resizeObserver: ResizeObserver | null = null
  // Watches the ref itself (not onMounted) - the <div v-else> this ref sits
  // on only exists in the DOM once mode switches to 'preview', and this
  // component almost always mounts in 'edit' mode first, so onMounted alone
  // would run before that div (and its ref) ever exist and never attach the
  // observer at all.
  watch(swiperContainer, el => {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (!el) return
    resizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) measuredContainerWidth.value = width
    })
    resizeObserver.observe(el)
  }, { immediate: true })
  onUnmounted(() => resizeObserver?.disconnect())

  // Only used now to size loopSafeCards' padding threshold below - no longer
  // feeds slides-per-view directly (that's "auto" now, see the swiper
  // element), so this doesn't need to be pixel-perfect, just a reasonable
  // estimate of how many cards are visible at once.
  const slidesPerShow = computed(() => {
    const containerWidth = measuredContainerWidth.value || Math.min(1440, winSize.value.width)
    const cardWidth = props.block?.width || props.cards[0]?.width || 320
    return Math.max(2, Math.floor((containerWidth + space) / (cardWidth + space)))
  })

  // Swiper's loop mode needs at least 2x slidesPerView real slides to work -
  // fall short (easy to do while a block only has a couple of test cards)
  // and it silently disables/malfunctions loop, which combined with
  // centered-slides + auto-height collapses the whole carousel to nothing
  // (confirmed via Swiper's own "not enough slides for loop mode" console
  // warning). Padding the displayed list by repeating the real cards is
  // Swiper's own documented workaround - it satisfies the precondition
  // without touching any swiper config, and is a no-op once there are
  // enough real cards (the normal case), since the loop below never runs.
  const loopSafeCards = computed(() => {
    const minCount = slidesPerShow.value * 2
    if (props.cards.length === 0 || props.cards.length >= minCount) return props.cards
    const padded: TemplateBlockModel[] = []
    while (padded.length < minCount) padded.push(...props.cards)
    return padded
  })

  // Block-level styling defaults (color/background/size/ver/width) apply
  // uniformly to every card, same as production's SliderWithCards.vue
  // forwarding item.width/size/color/ver/background into each TemplateCard -
  // our TemplateCard.vue takes these as one `defaults` object instead of
  // individual props, but the effect is the same.
  // width always resolves to a concrete number (never left undefined,
  // unlike the other fields here) - the swiper-slide sizes itself to
  // max-content now (see the global style block below), so the card inside
  // it needs an actual fixed width to size against, not a '100%' fallback
  // that would just be circular against a max-content parent.
  const cardDefaults = computed(() => ({
    color: props.block?.color,
    background: props.block?.background,
    size: props.block?.size,
    ver: props.block?.ver,
    width: props.block?.width || props.cards[0]?.width || 320,
  }))

  // Product decision: clipping card content is never acceptable, no matter
  // how tall it gets - so instead of relying on Swiper's own auto-height
  // (broke repeatedly in this exact loop + centered-slides combination, see
  // the swiper element's own comment below), the required height is
  // computed here, from the cards' actual rendered height while editing
  // (editable-cards-grid below - a natural-height flex-wrap layout, not
  // inside the swiper, so this is an honest measurement, not a swiper
  // sizing quirk), and written straight into the block's own height field.
  // Only ever raises it (never shrinks below what content needs), so a
  // manual bump via CardContainerActions' height control still works for
  // going higher, but can never leave a card clipped.
  // Single source of truth for .swiper-slide's own "height: calc(100% -
  // v-bind(slideHeightOverheadPx))" below - these two numbers drifting out
  // of sync (one hardcoded in JS, the other in CSS) is exactly what caused
  // slides to render taller than the swiper itself: the JS side added less
  // than the CSS side subtracted, so the computed block.height fell short
  // and the min-height:max-content floor kicked in and won. Sharing one
  // constant via v-bind makes that class of bug impossible going forward.
  // 0, not a tuned "magic number" - .swiper-slide no longer has any margin
  // (removed below, it served no real purpose), so there's no longer any
  // genuine gap between the swiper's own height and what a slide needs.
  // Chasing a specific non-zero value here via DevTools trial and error was
  // treating a symptom: it was compensating for block.height itself being
  // stale/wrong at the moment of testing, not for any real CSS overhead -
  // the fix for that is making sure block.height gets computed correctly
  // (recomputeRequiredHeight above), not tuning this number.
  // const slideHeightOverhead = 0
  // const slideHeightOverheadPx = computed(() => `${slideHeightOverhead}px`)

  const editableCardEls = new Map<number, HTMLElement>()
  function recomputeRequiredHeight () {
    let tallest = 0
    for (const el of editableCardEls.values()) tallest = Math.max(tallest, el.offsetHeight)
    if (tallest === 0 || !props.block) return
    const required = Math.ceil(tallest) /* + slideHeightOverhead */
    if ((props.block.height || 0) < required) {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.height = required
    }
  }
  const cardsHeightObserver = new ResizeObserver(recomputeRequiredHeight)
  // A plain wrapping <div> (not a ref straight on <template-card>, a
  // <script setup> component with no defineExpose) - a component ref
  // without defineExpose may not reliably surface .$el, which would mean
  // this never actually observes anything, tallest stays 0 forever, and
  // block.height silently never gets written - exactly matching every
  // screenshot so far still showing the untouched 300px default. A plain
  // DOM element ref has no such ambiguity.
  function setEditableCardRef (index: number, el: unknown) {
    if (el instanceof HTMLElement) {
      editableCardEls.set(index, el)
      cardsHeightObserver.observe(el)
    } else {
      const prev = editableCardEls.get(index)
      if (prev) cardsHeightObserver.unobserve(prev)
      editableCardEls.delete(index)
    }
  }
  onUnmounted(() => cardsHeightObserver.disconnect())

  // Replaces the old +/- height buttons (CardContainerActions.vue) - those
  // adjusted block.height with zero visible effect in edit mode (the grid
  // never read that field at all), only showing up once you switched to
  // preview. A drag handle on the grid itself, same as ImageEditor.vue's
  // own resize bar, shows the real size directly instead of clicking blind.
  // Dragging it below what the cards actually need just gets pushed back up
  // by recomputeRequiredHeight's own ResizeObserver on the next tick -
  // dragging taller works freely either way.
  function onCarouselHeightChange (value: number) {
    if (!props.block) return
    // eslint-disable-next-line vue/no-mutating-props
    props.block.height = value
  }
</script>

<template>
  <EditableBlockWrapper v-if="mode === 'edit'" :block="block" type="block">
    <template v-if="block" #actions>
      <CardContainerActions v-model:drag-active="dragActive" :block="block" />
    </template>
    <template v-if="block" #delete>
      <ToolbarIconButton icon="mdi-delete" tooltip="Видалити блок" @click="emit('delete')" />
    </template>
    <ResizableWrapper :height="block?.height || 300" :min-height="150" resize @update:height="onCarouselHeightChange">
      <div ref="cardsContainer" class="editable-cards-grid">
        <!-- Keyed on the card object, not its index - see EditableCardsBlock.vue's
          matching comment for why: Sortable physically moves the DOM node
          during a drag, and a positional key makes Vue's own reconciliation
          disagree with where it actually ended up. -->
        <template v-for="(card, index) of props.cards" :key="stableKey(card)">
          <EditableBlockWrapper :class="{ 'card-drag-cursor': dragActive }" type="card">
            <template v-if="!dragActive" #actions>
              <ToolbarIconButton icon="mdi-pencil" tooltip="Редагувати картку" @click="openCardEditor(index)" />
            </template>
            <div :ref="el => setEditableCardRef(index, el)" :style="{ width: (cardDefaults.width || 320) + 'px', height: '100%' }">
              <template-card :class="{ 'card-drag-active': dragActive }" :defaults="cardDefaults" :item="card" style="height: 100%" />
            </div>
          </EditableBlockWrapper>
        </template>
      </div>
    </ResizableWrapper>
    <CardEditDialog :block-target="block?.uniformCardIcon !== false ? block : undefined" :card="editingCardModel" :defaults="cardDefaults" @close="closeCardEditor" />
  </EditableBlockWrapper>
  <div v-else ref="swiperContainer">
    <!-- slides-per-view is a plain "auto" string now (not a computed number),
      so the swiper/vue mount-timing issue that justified gating on
      measuredContainerWidth no longer applies to it directly - kept anyway
      since loopSafeCards' padding threshold still wants a real measurement,
      and delaying mount by one measurement tick is harmless. -->
    <swiper
      v-if="measuredContainerWidth > 0"
      :autoplay="{ delay: 3000, disableOnInteraction: true }"
      :centered-slides="true"
      class="mx-auto"
      :loop="true"
      :modules="modules"
      slides-per-view="auto"
      :space-between="space"
      :style="{
        '--swiper-navigation-color': 'var(--grey)',
        '--swiper-pagination-color': 'var(--blue)',
        height: `${props.height}px`,
        marginBottom: '48px'
      }"
      @autoplay-time-left="onAutoplayTimeLeft"
    >
      <template v-for="(card, index) of loopSafeCards" :key="index">
        <swiper-slide>
          <template-card :defaults="cardDefaults" :item="card" style="height: 100%" />
        </swiper-slide>
      </template>
      <template #container-end>
        <div class="autoplay-progress">
          <svg ref="progressCircle" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" />
          </svg>
          <span ref="progressContent" />
        </div>
      </template>
    </swiper>
  </div>
</template>

<style>
/* min-height, not height: a hard "height: max-content" here makes
   .swiper-wrapper's own height intrinsic/undefined, which breaks the scoped
   .swiper-slide "height: calc(100% - 26px)" rule below - a percentage
   height needs a DEFINITE parent height to resolve against, and an
   intrinsic one doesn't qualify, so the browser falls the percentage back
   to auto and every slide reverts to sizing off its own content again -
   exactly the "cards now have different heights" this was meant to solve.
   min-height keeps content from ever clipping (never smaller than its own
   natural size) while still letting the uniform, computed height below
   apply on top of that floor, so every slide matches the tallest one. */
.swiper-slide {
  min-height: max-content !important;
}
/* Global, not scoped: Swiper's own loop-mode clones slides directly via JS
   (not through Vue's render), so cloned slides never carry this component's
   scoped data-v-* attribute and a scoped rule would simply miss them -
   confirmed necessary for the height rule above, applies equally here.
   slides-per-view="auto" expects each slide's actual CSS width to be the
   source of truth (see the .swiper element's own comment) - max-content
   lets it size to the card's own concrete width (see cardDefaults' width
   fallback) instead of fighting a computed slot-width formula. */
.swiper-slide {
  width: max-content !important;
}
</style>

<style scoped>
.editable-cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 48px;
}

.card-drag-active {
  /* Blocks clicks on the card's own content while dragging is active, so a
     drag gesture can't be hijacked by an inner control - the event falls
     through to this element's parent instead, which is what Sortable
     actually tracks as the draggable item. Note: pointer-events:none also
     means THIS element no longer resolves its own "cursor" - that lives on
     the parent instead (.card-drag-cursor below). */
  pointer-events: none;
}
.card-drag-cursor {
  cursor: move;
}

.swiper {
  width: 100%;
  height: 100%;
  align-items: stretch !important;
  justify-items: stretch !important;
}

.swiper-slide {
  /* height: calc(100% - v-bind(slideHeightOverheadPx)) !important; */
  height: calc(100% - 42px) !important;
  cursor: grab;
  overflow: hidden;
}

.autoplay-progress {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 10;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--grey);
}

.autoplay-progress svg {
  --progress: 0;
  position: absolute;
  left: 0;
  top: 0px;
  z-index: 10;
  width: 100%;
  height: 100%;
  stroke-width: 4px;
  stroke: var(--grey);
  fill: none;
  stroke-dashoffset: calc(125.6px * (1 - var(--progress)));
  stroke-dasharray: 125.6;
  transform: rotate(-90deg);
}
</style>
