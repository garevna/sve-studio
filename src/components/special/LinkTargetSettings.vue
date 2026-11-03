<script setup lang="ts">
  import type { LinkTarget } from '@/types/MenuItemModel'
  import type { DynamicPageListItem, TemplateBlockModel, TemplatePageModel } from '@/types/TemplateBlockModel'
  import { computed, ref, watch } from 'vue'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { getBlockLabel } from '@/utils/block-label'
  import { pageTitleText } from '@/utils/page-title'

  // Where a link leads: a page, and optionally one block on that page to
  // scroll to. Just the controls - no dialog, no card, no buttons of its
  // own - so the same three fields can be a modal (MenuLinkDialog.vue) or a
  // panel that drops out under the text being linked (RouteEditor.vue).
  // This used to exist only inside that dialog; the second caller is why
  // it's a component now.
  //
  // Blocks are listed by what they SAY, not by their id: most blocks have
  // no id at all until one is picked here, and "block-9f3c..." means
  // nothing to the person choosing (see utils/block-label.ts). An id is
  // assigned - and saved onto the target page - only when a block is
  // actually chosen, which is also the only moment the link would otherwise
  // point nowhere.
  const props = defineProps<{
    // A live reference into the caller's own reactive content: the menu
    // item or type:'route' block being configured. Only route/params/hash
    // are ever touched, never the text - which is what makes this usable
    // for both a menu entry and a page block.
    item: LinkTarget
    // Load and re-read the item now. A modal passes its own open state; an
    // inline panel passes whether it is expanded. Either way the fields are
    // re-derived from the item every time it becomes active, because the
    // same instance gets reused for whichever item was last opened.
    active: boolean
    // Write changes straight through as they are made, instead of waiting
    // for an explicit confirm. For the inline panel, where there is no OK
    // button to press and the surrounding editor autosaves anyway.
    auto?: boolean
  }>()

  const emit = defineEmits<{ applied: [] }>()

  const ajaxStore = useAjaxStore()
  const commonStore = useCommonStore()

  const pages = ref<DynamicPageListItem[]>([])
  const loadingPages = ref(false)

  const selectedPageId = ref<string | null>(null)
  const wantsBlockScroll = ref(false)
  // The whole loaded page, not just its blocks - apply() saves this object
  // back as-is (with the chosen block's id filled in if it was missing), so
  // it must be the real content, not a reconstructed stand-in.
  const pageContent = ref<TemplatePageModel | null>(null)
  const pageBlocks = computed(() => pageContent.value?.blocks || [])
  const loadingBlocks = ref(false)
  // Index into pageBlocks, not the block itself - v-radio needs a primitive
  // model value, and an index is stable for as long as this list is (it is
  // only re-fetched on page change, which also resets this). A real block
  // for a non-negative index; two sentinels for the places
  // that are not blocks at all but are the most likely targets of the lot.
  const TOP_TARGET = -1
  const FOOTER_TARGET = -2
  // The footer's own root carries this id in every page's content, and the
  // site puts it on the real <footer> element - see client-side/App.vue.
  const FOOTER_HASH = '#app-footer'
  const selectedBlockIndex = ref<number | null>(null)
  const saving = ref(false)

  // title always a real string here (falls back to pageId) so the plain
  // item-title="title" binding below needs no custom #item slot to cover
  // an untitled page.
  const visiblePages = computed(() => pages.value
    .filter(page => page.visible !== false)
    .map(page => ({ ...page, title: pageTitleText(page.title, useCommonStore().locale) || page.pageId })))

  const canApply = computed(() => !!selectedPageId.value)

  // Re-derive local state from the item every time this becomes active, not
  // just once on mount - one instance serves whichever item was last
  // opened. immediate:true matters specifically because a caller can set
  // `active` in the same tick it first mounts this component, and a plain
  // watch (which only reacts to *changes*) would silently never fire on
  // that first open - confirmed live: the page list stayed empty ("No data
  // available") on the very first click, every time.
  watch(() => props.active, async open => {
    if (!open) return
    if (pages.value.length === 0 && !loadingPages.value) {
      loadingPages.value = true
      try {
        pages.value = await ajaxStore.listDynamicPages()
      } finally {
        loadingPages.value = false
      }
    }
    const isPageLink = props.item.route === 'dynamic-page'
    selectedPageId.value = isPageLink ? ((props.item.params as { pageId?: string } | undefined)?.pageId) || null : null
    wantsBlockScroll.value = !!props.item.hash
    pageContent.value = null
    selectedBlockIndex.value = null
    if (selectedPageId.value && wantsBlockScroll.value) {
      await loadBlocksForSelectedPage(props.item.hash)
    }
  }, { immediate: true })

  async function loadBlocksForSelectedPage (matchHash?: string) {
    if (!selectedPageId.value) {
      pageContent.value = null
      return
    }
    loadingBlocks.value = true
    try {
      pageContent.value = await ajaxStore.getDynamicPageContent(selectedPageId.value)
      if (matchHash === FOOTER_HASH) {
        selectedBlockIndex.value = FOOTER_TARGET
      } else if (matchHash) {
        const targetId = matchHash.replace(/^#/, '')
        const index = pageBlocks.value.findIndex(block => block.id === targetId)
        selectedBlockIndex.value = index === -1 ? null : index
      }
    } finally {
      loadingBlocks.value = false
    }
  }

  // Changing the page invalidates whatever block was selected for the
  // previous one - re-fetch (or clear, if the in-page switch is off) rather
  // than leave a stale block list around.
  watch(selectedPageId, () => {
    selectedBlockIndex.value = null
    if (wantsBlockScroll.value) loadBlocksForSelectedPage()
    else pageContent.value = null
    if (props.auto) apply()
  })

  watch(wantsBlockScroll, on => {
    if (on && !pageContent.value) loadBlocksForSelectedPage()
    if (!on) {
      selectedBlockIndex.value = null
      if (props.auto) apply()
    }
  })

  watch(selectedBlockIndex, () => {
    if (props.auto) apply()
  })

  function blockLabel (block: TemplateBlockModel, index: number) {
    return getBlockLabel(block, index, commonStore.locale)
  }

  async function apply (): Promise<boolean> {
    if (!selectedPageId.value) return false
    saving.value = true
    try {
      let hash: string | undefined
      if (wantsBlockScroll.value && selectedBlockIndex.value === FOOTER_TARGET) {
        hash = FOOTER_HASH
      } else if (wantsBlockScroll.value && selectedBlockIndex.value === TOP_TARGET) {
        // The top of a page is where a link lands anyway, so it is the
        // absence of a hash rather than an anchor of its own - and nothing
        // has to be added to the page for it to work.
        hash = undefined
      } else if (wantsBlockScroll.value && selectedBlockIndex.value !== null && selectedBlockIndex.value >= 0 && pageContent.value) {
        const block = pageBlocks.value[selectedBlockIndex.value]
        if (block) {
          // A block picked as a scroll target needs a real, stable id - most
          // blocks never got one (see block-label.ts's comment), so assign
          // one now and persist it onto the page itself, not just this link,
          // or the hash would point nowhere.
          if (!block.id) {
            block.id = `block-${crypto.randomUUID()}`
            await ajaxStore.saveDynamicPage(selectedPageId.value, pageContent.value, { publish: true })
          }
          hash = `#${block.id}`
        }
      }
      // item is deliberately a live reference into the caller's own content
      // - see this component's own top comment.
      /* eslint-disable vue/no-mutating-props */
      props.item.route = 'dynamic-page'
      props.item.params = { pageId: selectedPageId.value }
      props.item.hash = hash
      /* eslint-enable vue/no-mutating-props */
      emit('applied')
      return true
    } finally {
      saving.value = false
    }
  }

  defineExpose({ apply, canApply, saving })
</script>

<template>
  <div>
    <v-select
      v-model="selectedPageId"
      clearable
      item-title="title"
      item-value="pageId"
      :items="visiblePages"
      :label="t('editor.page')"
      :loading="loadingPages"
      variant="outlined"
    />

    <v-switch
      v-model="wantsBlockScroll"
      color="primary"
      :disabled="!selectedPageId"
      hide-details
      inset
      :label="t('linkTarget.anchor')"
    />

    <template v-if="wantsBlockScroll">
      <v-progress-linear v-if="loadingBlocks" class="mt-4" color="primary" indeterminate />
      <v-radio-group v-else v-model="selectedBlockIndex" class="mt-2" hide-details>
        <!-- The two targets that are not blocks. Top first because it is the
          commonest of all, footer last because that is where it is. -->
        <v-radio :label="t('linkTarget.top')" :value="TOP_TARGET" />

        <v-radio
          v-for="(block, index) of pageBlocks"
          :key="index"
          :label="blockLabel(block, index)"
          :value="index"
        />

        <v-radio :label="t('linkTarget.footer')" :value="FOOTER_TARGET" />
      </v-radio-group>
      <p class="text-caption text-medium-emphasis mt-2">
        {{ t('linkTarget.hint') }}
      </p>
      <p v-if="!loadingBlocks && pageBlocks.length === 0" class="text-caption text-medium-emphasis">
        {{ t('linkTarget.noBlocks') }}
      </p>
    </template>
  </div>
</template>
