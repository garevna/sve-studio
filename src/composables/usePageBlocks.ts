import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { computed, nextTick, ref, shallowRef } from 'vue'
import { useCommonStore } from '@/stores/common'
import { getBlockLabel } from '@/utils/block-label'
import { imagePairSiblingIndex, isSecondHalfOfImagePair } from '@/utils/image-variant'

// The page's blocks while editing: which one is being edited (only one at a
// time), hiding and bringing back, and their order.
//
// A hidden block stays in the page (`hidden: true`) - it is not shown in the
// editor or on the site, and comes back from the top bar's "Приховані"
// menu or the page structure panel, in its old place.
//
// Order is changed by whole units: a desktop/mobile image pair is two blocks
// shown as one, and always moves as one. The page's hero parallax is not
// part of the order at all - it is drawn above the page wherever it sits.

export type PageBlockUnit = {
  // the block the page shows (for a pair, the one it is drawn by)
  block: TemplateBlockModel
  // every block of the unit, in page order
  blocks: TemplateBlockModel[]
  // position of `block` in the page's blocks
  index: number
  label: string
}

const activeBlock = shallowRef<TemplateBlockModel | null>(null)
// The block gallery, and where on the page the block picked there goes: the
// position among the units (before unit N; null - at the end).
const galleryOpen = ref(false)
const insertPosition = ref<number | null>(null)
const flashingBlock = shallowRef<TemplateBlockModel | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

export function usePageBlocks () {
  const commonStore = useCommonStore()
  const blocks = computed<TemplateBlockModel[]>(() => commonStore.dynamicPageContent?.blocks ?? [])

  // Every orderable unit of the page, in page order (hidden ones included).
  const units = computed<PageBlockUnit[]>(() => {
    const all = blocks.value
    const result: PageBlockUnit[] = []
    for (const [index, block] of all.entries()) {
      if (block.type === 'parallax' || isSecondHalfOfImagePair(all, index)) {
        continue
      }
      const sibling = imagePairSiblingIndex(all, index)
      const pair = sibling === null ? undefined : all[sibling]
      result.push({
        block,
        blocks: pair ? [block, pair] : [block],
        index,
        label: getBlockLabel(block, index, commonStore.locale),
      })
    }
    return result
  })

  const heroBlock = computed(() => blocks.value.find(block => block.type === 'parallax') ?? null)

  const hiddenBlocks = computed(() => units.value.filter(unit => unit.block.hidden))

  function unitOf (block: TemplateBlockModel): PageBlockUnit | undefined {
    return units.value.find(unit => unit.blocks.includes(block))
  }

  function isActive (block: TemplateBlockModel): boolean {
    return activeBlock.value === block
  }

  function edit (block: TemplateBlockModel) {
    activeBlock.value = block
  }

  function finishEditing () {
    activeBlock.value = null
  }

  // Scrolled to and briefly highlighted - after it came back, moved, or was
  // picked in the structure panel.
  function reveal (block: TemplateBlockModel) {
    flashingBlock.value = block
    if (flashTimer) {
      clearTimeout(flashTimer)
    }
    flashTimer = setTimeout(() => {
      flashingBlock.value = null
    }, 1600)
    void nextTick(() => {
      const index = blocks.value.indexOf(block)
      document.querySelector(`[data-block-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function hide (block: TemplateBlockModel) {
    for (const item of unitOf(block)?.blocks ?? [block]) {
      item.hidden = true
    }
    if (activeBlock.value === block) {
      activeBlock.value = null
    }
  }

  function restore (block: TemplateBlockModel) {
    for (const item of unitOf(block)?.blocks ?? [block]) {
      delete item.hidden
    }
    reveal(block)
  }

  function isFlashing (block: TemplateBlockModel): boolean {
    return flashingBlock.value === block
  }

  // The page's blocks rebuilt in the given unit order. The hero (and
  // anything else outside the units) keeps its place at the start.
  function reorder (order: PageBlockUnit[]) {
    const page = commonStore.dynamicPageContent
    if (!page) {
      return
    }
    const inUnits = new Set(order.flatMap(unit => unit.blocks))
    const rest = page.blocks.filter(block => !inUnits.has(block))
    page.blocks = [...rest, ...order.flatMap(unit => unit.blocks)]
  }

  // One step up or down among the blocks the page shows - a hidden block in
  // between is stepped over, otherwise the move would look like nothing.
  function neighbour (block: TemplateBlockModel, step: -1 | 1): number | null {
    const list = units.value
    const from = list.findIndex(unit => unit.blocks.includes(block))
    if (from === -1) {
      return null
    }
    for (let i = from + step; i >= 0 && i < list.length; i += step) {
      if (!list[i]!.block.hidden) {
        return i
      }
    }
    return null
  }

  function canMove (block: TemplateBlockModel, step: -1 | 1): boolean {
    return neighbour(block, step) !== null
  }

  function move (block: TemplateBlockModel, step: -1 | 1) {
    const to = neighbour(block, step)
    if (to === null) {
      return
    }
    const list = [...units.value]
    const from = list.findIndex(unit => unit.blocks.includes(block))
    const [unit] = list.splice(from, 1)
    list.splice(to, 0, unit!)
    reorder(list)
    reveal(block)
  }

  function openGallery (position: number | null = null) {
    insertPosition.value = position
    galleryOpen.value = true
  }

  // The unit the new block will go before (null: the end of the page).
  const insertBefore = computed(() => insertPosition.value === null ? null : units.value[insertPosition.value] ?? null)

  // New blocks put where the gallery was opened, then opened for editing
  // and scrolled to.
  function insert (newBlocks: TemplateBlockModel[]) {
    const page = commonStore.dynamicPageContent
    const first = newBlocks[0]
    if (!page || !first) {
      return
    }
    const before = insertBefore.value
    const found = before ? page.blocks.indexOf(before.blocks[0]!) : -1
    const at = found === -1 ? page.blocks.length : found
    page.blocks.splice(at, 0, ...newBlocks)
    insertPosition.value = null
    galleryOpen.value = false
    // (the page's own copy - the array hands back reactive ones)
    const added = page.blocks[at]
    if (added && added.type !== 'parallax') {
      edit(added)
      reveal(added)
    }
  }

  return {
    activeBlock,
    galleryOpen,
    insertPosition,
    insertBefore,
    openGallery,
    insert,
    units,
    heroBlock,
    hiddenBlocks,
    isActive,
    edit,
    finishEditing,
    hide,
    restore,
    reveal,
    isFlashing,
    reorder,
    canMove,
    move,
  }
}
