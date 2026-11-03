<script lang="ts" setup>
  // import { listOfComponents } from '@/configs/nav-panel-menu'
  import type { SeoSettingsModel } from '@/types/SeoSettingsModel'
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { SveBadge, SveButton, SveDock, SveDockItem, SveIconButton, SveMenu, SveMenuDivider, SveMenuItem, SveMenuLabel, SveTopBar } from '@sve/editor-ui'
  import { computed, onBeforeMount, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import BlockGallery from '@/components/editors/BlockGallery.vue'
  import PageStructurePanel from '@/components/editors/PageStructurePanel.vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import PageSeoDialog from '@/components/special/PageSeoDialog.vue'
  import PageTitleDialog from '@/components/special/PageTitleDialog.vue'
  import SelectColorFromPalette from '@/components/special/SelectColorFromPalette.vue'
  import DynamicPageTemplate from '@/components/templates/DynamicPageTemplate.vue'
  import HeroParallax from '@/components/templates/sections/HeroParallax.vue'
  import { usePageBlocks } from '@/composables/usePageBlocks'
  import { components } from '@/configs'
  import { image } from '@/configs/components/simple/image'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'

  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { applySeoMeta } from '@/utils/apply-seo-meta'
  import { rememberEditedPage } from '@/utils/last-edited-page'
  import { localeDisplayName, missingTranslations } from '@/utils/locale-text'
  import { type PageTitle, pageTitleText, translatedPageTitle } from '@/utils/page-title'
  import { openPreview, pagePreviewUrl, refreshPreviewIfOpen } from '@/utils/preview-window'
  import '@/common.css'

  // interface TreeItem {
  //   id?: string | number
  //   icon?: string | null
  //   iconClass?: string | null
  //   title?: string | null
  //   class?: string | null
  //   image?: string | null
  //   children?: TreeItem[]
  // }

  const route = useRoute()
  const commonStore = useCommonStore()
  const ajaxStore = useAjaxStore()

  // A hidden page (the eye in the pages list) is edited as usual, but the
  // site leaves it out: no menu item, and a visitor who has its address
  // gets "page not found". Said here, so a hidden page is never a mystery.
  const pageHidden = computed(() => (commonStore.dynamicPageContent as { visible?: boolean } | null)?.visible === false)
  const showingPage = ref(false)
  async function showHiddenPage () {
    if (!pageId.value) return
    showingPage.value = true
    try {
      await ajaxStore.setDynamicPageVisibility(pageId.value, true)
      const content = commonStore.dynamicPageContent as { visible?: boolean } | null
      if (content) content.visible = true
    } finally {
      showingPage.value = false
    }
  }
  const feedback = useUiFeedbackStore()

  const pageId = computed(() => route.params.pageId as string | undefined)
  // The page's name in the language being edited (utils/page-title.ts).
  const pageName = computed(() => pageTitleText((commonStore.dynamicPageContent as { title?: PageTitle } | null)?.title, commonStore.locale))

  // The name is not on the page itself, so a language it is missing in was
  // a gap nobody could find: the language menu names it, and the name in
  // the top bar opens it (PageTitleDialog - the same one as the pages list).
  // Saved with the page, like any of its texts.
  const pageTitleModel = computed(() => translatedPageTitle((commonStore.dynamicPageContent as { title?: PageTitle } | null)?.title))
  const titleGaps = computed(() => Object.entries(missingTranslations({ title: pageTitleModel.value }))
    .filter(([, count]) => count > 0)
    .map(([code]) => code.toUpperCase()))
  const titleDialog = ref(false)
  function saveTitle (title: TranslatedModel) {
    const content = commonStore.dynamicPageContent as { title?: PageTitle } | null
    if (content) content.title = { ...title }
    titleDialog.value = false
  }

  // Blocks: one edited at a time, hidden ones, their order (usePageBlocks).
  const pageBlocks = usePageBlocks()
  // The page structure panel - the blocks by name, to move, hide and find.
  const structureOpen = ref(false)

  // footer-content(-{N}) is a footer "pseudo-page" (see ajax.ts's wrap/
  // unwrap shim) - it always has exactly one block (footer-1) and no real
  // .seo field, so "Додати компонент" (a second top-level block would be
  // silently discarded on save, since the shim only ever reads blocks[0])
  // and "SEO" (nothing there to configure) don't apply to it.
  const isFooterPseudoPage = computed(() => !!pageId.value?.startsWith('footer-content'))

  // The SEO role opens pages read-only: it needs to reach each page's own
  // SEO dialog, not its content. Rather than disabling controls one by one,
  // the page is simply put in preview mode and the mode switch is taken
  // away - what's left is exactly what a visitor would see, plus the SEO
  // button. See configs/editor-roles.ts.
  const canEditContent = computed(() => commonStore.roleConfig.canEditPageContent)
  watch(canEditContent, allowed => {
    commonStore.mode = allowed ? 'edit' : 'preview'
  }, { immediate: true })
  const editable = computed(() => !!pageId.value && canEditContent.value)

  // The standalone preview window is a fresh app instance (its own Pinia
  // store), so it defaults to locale 'uk' regardless of what's selected
  // here - carrying it over as a query param means it opens on the same
  // language you're actually editing, instead of one that may have empty
  // content for fields only filled in under a different locale.
  function previewUrl (): string {
    return pagePreviewUrl(pageId.value, commonStore.locale)
  }

  // Autosave is debounced (see below) - anything typed within that window
  // only exists in memory until the timer fires. If the user closes/reloads
  // the tab before then (or clicks "Переглянути" - e.g. right after
  // uploading an image), that edit was silently lost, since nothing ever
  // flushed the pending timer early. flushPendingSave is called from both
  // openPreviewWindow (awaited, so the preview always reflects the latest
  // edit) and the visibilitychange listener below (fire-and-forget - a
  // handler can't reliably block navigation on an async result, but firing
  // the IndexedDB write immediately when the tab is about to go away gives
  // it the best realistic chance to actually complete).
  function flushPendingSave (): Promise<void> {
    if (!autoSaveTimer) return Promise.resolve()
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
    return savePage({ silent: true })
  }

  async function openPreviewWindow () {
    await flushPendingSave()
    openPreview(previewUrl())
  }

  const selectColorFromPaletteOpen = ref(false)
  const selectedColor = ref('')

  // Per-page SEO fields live directly on the page's own content
  // (commonStore.dynamicPageContent.seo - see PageSeoModel), so editing them
  // here rides the exact same autosave/dirty/save/undo flow as every block
  // edit already does - no separate save action needed for this dialog.
  const seoDialogOpen = ref(false)
  // Publishes straight away rather than leaving the change in IndexedDB -
  // see this dialog's own actions for why the two workflows differ.
  async function saveSeoAndClose () {
    await savePage()
    seoDialogOpen.value = false
  }
  function openSeoDialog () {
    if (!commonStore.dynamicPageContent.seo) {
      commonStore.dynamicPageContent.seo = {}
    }
    seoDialogOpen.value = true
  }

  // Applied to the actual document (<title>/meta tags) so a client typing
  // into the SEO dialog sees this tab's own title change immediately,
  // proof it's genuinely per-page and not just inert stored data - same
  // application PreviewView.vue does for the real per-page preview.
  const seoSettings = ref<SeoSettingsModel | null>(null)
  function refreshSeoMeta () {
    applySeoMeta(commonStore.dynamicPageContent, seoSettings.value, ajaxStore.getImageURL)
  }

  const loadingPage = ref(false)

  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  // A block picked in the block gallery (BlockGallery.vue): made from its
  // template and put where the gallery was opened for (usePageBlocks.insert
  // - which also opens it for editing and scrolls to it).
  function selectHandler (id: string) {
    // At most one hero parallax per page (see HeroParallax.vue - it's found
    // by type, not position, so a second one would just sit as a dead,
    // never-rendered block). The gallery greys it out too.
    if (id === 'parallax' && commonStore.dynamicPageContent.blocks.some(block => block.type === 'parallax')) {
      return
    }
    // Two real blocks at once (desktop-mode + mobile-mode) - see
    // ImageVariantBlock.vue, which shows/edits the pair as one tabbed unit.
    // A plain "Універсальне" image stays a single untagged block.
    if (id === 'image-desktop-mobile') {
      pageBlocks.insert([image('desktop-mode'), image('mobile-mode')])
      return
    }
    const make = components[id as keyof typeof components]
    if (make) {
      pageBlocks.insert([make() as TemplateBlockModel])
    }
  }

  const icon = ref('')
  watch(icon, (newIcon: string) => {
    console.log('Selected icon:', newIcon)
  })

  function resize () {
    commonStore.setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }

  // Autosave (silent, publish:false) only ever writes IndexedDB and leaves
  // the page flagged "updated" - an explicit "Зберегти" click (publish:true)
  // additionally mirrors to the real file (standing in for "sent to the
  // server" until a real API exists) and clears that flag.
  // Publishing a partly translated page is the user's call - warn, don't block.
  function warnIfUntranslated () {
    const counts = missingTranslations(commonStore.dynamicPageContent)
    const gaps = Object.entries(counts).filter(([, count]) => count > 0)
    if (gaps.length === 0) return
    const list = gaps.map(([code, count]) => `${localeDisplayName(code)} — ${count}`).join(', ')
    feedback.notifyWarning(t('translations.pageIncomplete'), t('translations.pageIncompleteDetail', { list }))
  }

  async function savePage (options: { silent?: boolean } = {}) {
    if (!pageId.value) return
    // Refuse to write content that belongs to a different page. This is a
    // last line of defence, not the fix (see the pageId watcher above): a
    // mismatch here has already destroyed a page once, silently, by
    // publishing one page's blocks under another's id. Cheap to check,
    // catastrophic to miss.
    // Unconditional - including for the footer. getDynamicPageContent wraps a
    // footer block as a page with id === pageId, so a correctly loaded footer
    // passes this too; exempting it only left a hole exactly where the
    // damage happened.
    const loadedId = (commonStore.dynamicPageContent as { id?: string } | null)?.id
    if (loadedId && loadedId !== pageId.value) {
      console.error(`Refusing to save: loaded content is "${loadedId}" but the open page is "${pageId.value}"`)
      if (!options.silent) {
        feedback.notifyError(
          t('popups.saveCancelled'),
          t('popups.saveCancelledWrongPage', { loaded: loadedId, opened: pageId.value }),
        )
      }
      return
    }
    saving.value = true
    try {
      // Success/failure is reported by the store itself (see ajax.ts's own
      // reportSaved/reportSaveFailed) - one wording for every save in the
      // editor, and the only layer that actually knows whether the write
      // reached the server. Silent autosaves report nothing either way: they
      // run on a debounce while the user is still typing, and the next edit
      // re-triggers them anyway.
      await ajaxStore.saveDynamicPage(pageId.value, commonStore.dynamicPageContent, { publish: !options.silent })
      if (!options.silent) {
        dirty.value = false
        warnIfUntranslated()
      }
      refreshPreviewIfOpen()
    } finally {
      saving.value = false
    }
  }

  async function undoPage () {
    if (!pageId.value) return
    undoing.value = true
    try {
      skipNextAutoSave = true
      commonStore.dynamicPageContent = await ajaxStore.undoDynamicPage(pageId.value)
      dirty.value = false
      refreshPreviewIfOpen()
      feedback.notifySuccess(t('popups.undoDone'))
    } catch {
      feedback.notifyError(t('popups.undoFailed'))
    } finally {
      undoing.value = false
    }
  }

  // Every edit should land in IndexedDB automatically - the separate preview
  // window (and any other reader) only ever sees what's actually persisted
  // there, not the in-memory store of whichever editor tab is open. Debounced
  // so rapid edits (typing, dragging a slider) collapse into one write.
  // skipNextAutoSave swallows the single deep-watch trigger fired by
  // getDynamicPageContent's own initial assignment on load - that's a fetch
  // result, not a user edit, and re-saving it back immediately would be a
  // pointless round-trip (and a footgun if it ever raced the fetch).
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(() => commonStore.dynamicPageContent, () => {
    // Unlike the autosave logic below, this should run on every change,
    // including the initial load assignment - that's exactly when the tab
    // title needs to be set for the first time.
    refreshSeoMeta()

    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (!pageId.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      savePage({ silent: true })
    }, 800)
  }, { deep: true })

  // function switchMode (mode: 'edit' | 'preview' | 'drag') {
  //   commonStore.mode = mode
  // }

  // Fires when the tab is backgrounded, navigated away from, or the browser
  // is closing - more reliable than beforeunload for triggering an async
  // flush that has a real chance to finish (beforeunload's own unload
  // sequence tends to cut async work off much harder).
  function onVisibilityChange () {
    if (document.visibilityState === 'hidden') flushPendingSave()
  }

  async function loadPage () {
    if (!pageId.value) return
    loadingPage.value = true
    // Drop the previous page's content BEFORE fetching the next one -
    // otherwise the old page keeps rendering for as long as the request
    // takes, which reads as "the wrong page opened".
    //
    // Both this and the assignment below are LOADS, not edits: the flag is
    // set before each so the deep watcher can't mistake either for a change
    // worth autosaving.
    skipNextAutoSave = true
    commonStore.clearDynamicPageContent()
    skipNextAutoSave = true
    await commonStore.getDynamicPageContent(pageId.value)
    dirty.value = await ajaxStore.isDynamicPageUpdated(pageId.value)
    loadingPage.value = false
  }

  onBeforeMount(async () => {
    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibilityChange)

    commonStore.getGlobalSettings()
    // Awaited before the page-content fetch below (rather than fired in
    // parallel) so it's already in place by the time that assignment
    // triggers the dynamicPageContent watcher's refreshSeoMeta() call -
    // otherwise the very first title/meta application would run with
    // seoSettings still null and silently do nothing.
    seoSettings.value = await ajaxStore.getSeoSettings()

    await loadPage()
  })

  // /editor/:pageId is ONE route, so moving between two pages reuses this
  // component instance and onBeforeMount never runs again. Without this
  // watcher, pageId became the new page while dynamicPageContent still held
  // the old one - and the autosave watcher below then wrote that stale
  // content under the new id. Confirmed live, destructively: opening the
  // footer editor and then the home page replaced the home page's own eight
  // blocks with the footer block.
  watch(pageId, () => {
    loadPage()
  })
  // For the start screen's "Продовжити" (a footer is not a page to go back to).
  watch(pageId, id => {
    if (id && !id.startsWith('footer-content')) rememberEditedPage(id)
  }, { immediate: true })
</script>

<template>
  <v-app>
    <!--
      No max-width/width/mx-auto here - matches production's own App.vue
      v-layout exactly (unconstrained - #app itself is width:100vw with no
      max-width, on this site or the real one). This structural match, plus
      the .v-layout/.v-main rules below, is what makes full-width elements
      like HeroParallax actually render full-width in edit mode too, not
      just the standalone preview - see HeroParallax.vue.
    -->
    <v-layout>
      <!-- The editor's one top bar (packages/editor-ui): the same on every
        screen, only what is on it changes. On a phone it keeps "back", the
        page name and Save; the other tools move to the dock at the bottom
        (below). There is no mode switch: every block looks as on the site
        and opens for editing on its own (PageBlockFrame), and blocks are
        moved in the structure panel. -->
      <SveTopBar back="/pages" :back-label="t('editor.backToPages')" :subtitle="pageName ? pageId : t('editor.page')" :title="pageName || pageId">
        <template #start>
          <div
            v-if="pageId && !isFooterPseudoPage"
            class="sve-topbar__titles editor-page-name"
            role="button"
            tabindex="0"
            :title="titleGaps.length > 0 ? t('editor.titleUntranslated', { locales: titleGaps.join(', ') }) : t('pages.name')"
            @click="titleDialog = true"
            @keydown.enter="titleDialog = true"
          >
            <div class="sve-topbar__title">
              {{ pageName || pageId }}
              <i v-if="titleGaps.length > 0" class="sve-icon mdi mdi-alert-circle-outline editor-page-name__warn" />
            </div>
            <div class="sve-topbar__subtitle">{{ pageName ? pageId : t('editor.page') }}</div>
          </div>
          <div v-else class="sve-topbar__titles">
            <div class="sve-topbar__title">{{ pageName || pageId }}</div>
            <div class="sve-topbar__subtitle">{{ pageName ? pageId : t('editor.page') }}</div>
          </div>
        </template>
        <template #actions>
          <!-- The content language of this page; dialogs carry the same
            switch, so texts can be filled in every language without
            closing them. -->
          <div v-if="pageId" class="sve-wide-only" style="display: contents">
            <LocaleSwitcher :scope="commonStore.dynamicPageContent" variant="menu">
              <template v-if="titleGaps.length > 0 && !isFooterPseudoPage" #menu-extra>
                <SveMenuDivider />
                <SveMenuItem :hint="titleGaps.join(', ')" icon="mdi-alert-circle-outline" @click="titleDialog = true">{{ t('pages.name') }}</SveMenuItem>
              </template>
            </LocaleSwitcher>
          </div>
          <!-- Only when there is something to bring back. -->
          <SveMenu v-if="pageBlocks.hiddenBlocks.value.length > 0" :min-width="240">
            <template #activator="{ props: activator }">
              <SveButton class="sve-wide-only" icon="mdi-eye-off-outline" variant="ghost" v-bind="activator">
                {{ t('editor.hidden') }} <SveBadge>{{ pageBlocks.hiddenBlocks.value.length }}</SveBadge>
              </SveButton>
            </template>
            <SveMenuLabel>{{ t('editor.showOnPage') }}</SveMenuLabel>
            <SveMenuItem
              v-for="item of pageBlocks.hiddenBlocks.value"
              :key="item.index"
              icon="mdi-eye-outline"
              @click="pageBlocks.restore(item.block)"
            >
              {{ item.label }}
            </SveMenuItem>
          </SveMenu>
          <template v-if="editable && !isFooterPseudoPage">
            <SveButton
              :class="['sve-wide-only', { 'sve-btn--pressed': structureOpen }]"
              icon="mdi-format-list-bulleted-square"
              variant="ghost"
              @click="structureOpen = !structureOpen"
            >
              {{ t('editor.structure') }}
            </SveButton>
            <SveButton class="sve-wide-only" icon="mdi-plus" variant="ghost" @click="pageBlocks.openGallery(null)">
              {{ t('blockMenu.addBlock') }}
            </SveButton>
          </template>
          <template v-if="pageId && !isFooterPseudoPage">
            <SveIconButton class="sve-wide-only" icon="mdi-search-web" :label="t('pages.seoOfPage')" @click="openSeoDialog" />
            <SveIconButton class="sve-wide-only" icon="mdi-open-in-new" :label="t('editor.openOnSite')" @click="openPreviewWindow" />
          </template>
          <template v-if="pageId && canEditContent">
            <SveButton
              v-if="dirty"
              class="sve-wide-only"
              icon="mdi-undo-variant"
              :loading="undoing"
              @click="undoPage"
            >
              {{ t('common.cancel') }}
            </SveButton>
            <SveButton
              collapsible
              icon="mdi-content-save-outline"
              :loading="saving"
              variant="primary"
              @click="savePage()"
            >
              {{ t('common.save') }}
            </SveButton>
          </template>
        </template>
      </SveTopBar>

      <!-- A phone's tools, in reach of a thumb. -->
      <SveDock v-if="pageId" class="sve-narrow-only">
        <SveDockItem
          v-if="editable && !isFooterPseudoPage"
          :active="structureOpen"
          icon="mdi-format-list-bulleted-square"
          :label="t('editor.structure')"
          @click="structureOpen = !structureOpen"
        >
          <SveBadge v-if="pageBlocks.hiddenBlocks.value.length > 0">{{ pageBlocks.hiddenBlocks.value.length }}</SveBadge>
        </SveDockItem>
        <SveDockItem v-if="editable && !isFooterPseudoPage" icon="mdi-plus" :label="t('common.add')" @click="pageBlocks.openGallery(null)" />
        <LocaleSwitcher :scope="commonStore.dynamicPageContent" variant="dock">
          <template v-if="titleGaps.length > 0 && !isFooterPseudoPage" #menu-extra>
            <SveMenuDivider />
            <SveMenuItem :hint="titleGaps.join(', ')" icon="mdi-alert-circle-outline" @click="titleDialog = true">{{ t('pages.name') }}</SveMenuItem>
          </template>
        </LocaleSwitcher>
        <template v-if="!isFooterPseudoPage">
          <SveDockItem icon="mdi-search-web" label="SEO" @click="openSeoDialog" />
          <SveDockItem icon="mdi-open-in-new" :label="t('editor.onSite')" @click="openPreviewWindow" />
        </template>
        <SveDockItem v-if="canEditContent && dirty" icon="mdi-undo-variant" :label="t('common.cancel')" @click="undoPage" />
      </SveDock>

      <PageStructurePanel
        v-if="editable && !isFooterPseudoPage"
        v-model="structureOpen"
        can-add
        @add="pageBlocks.openGallery(null)"
      />
      <BlockGallery @select="selectHandler" />
      <!-- Hidden while loading for the same reason the content is: the hero
        reads its image from the same store slot, so it would otherwise sit
        there empty (or, before the clear, still showing the previous
        page's) until the fetch lands. -->
      <!-- No hero here on purpose. It is production markup wearing the
        previewed site's own stylesheet, and inside the editor that sheet
        reaches the editor's own controls sitting beside it - the same
        collision every inline settings panel in this app has had to be
        moved out of. The hero is shown where nothing of the editor is on
        screen: the preview window (see the preview app's App.vue), and the
        "Верхня частина сторінки" section, which shows it framed and alone.
        The page's own hero:true flag is what both of those read. -->
      <HeroParallax v-if="pageId && !loadingPage" />
      <v-main class="mx-auto sve-dock-clearance">
        <!-- A skeleton rather than an empty page while the next one loads:
          the content area is otherwise blank for the whole request, which
          looks like a page with nothing on it. -->
        <v-skeleton-loader
          v-if="loadingPage"
          class="editor-page-skeleton"
          type="table-tbody"
        />
        <template v-else>
          <div v-if="pageHidden" class="sve-ui hidden-page-notice">
            <i aria-hidden="true" class="sve-icon mdi mdi-eye-off-outline" />
            <span>{{ t('pages.hiddenNotice') }}</span>
            <SveButton icon="mdi-eye-outline" :loading="showingPage" @click="showHiddenPage">{{ t('pages.showPage') }}</SveButton>
          </div>
          <dynamic-page-template />
        </template>
      </v-main>
      <select-color-from-palette v-model="selectedColor" v-model:open="selectColorFromPaletteOpen" />
    </v-layout>

    <!-- openSeoDialog() creates the seo object first if the page has none,
      so this only ever renders with a real one - same guard the inlined
      card carried before this moved into its own component. -->
    <PageTitleDialog v-model="titleDialog" :title="pageTitleModel" @save="saveTitle" />
    <PageSeoDialog
      v-if="commonStore.dynamicPageContent.seo"
      v-model="seoDialogOpen"
      :page-id="commonStore.dynamicPageContent.id"
      :saveable="!canEditContent"
      :saving="saving"
      :seo="commonStore.dynamicPageContent.seo"
      @save="saveSeoAndClose"
    />

  </v-app>
</template>

<style lang="css" scoped>
  /* The page's name in the top bar opens its dialog. */
  .editor-page-name {
    cursor: pointer;
    border-radius: 6px;
  }
  .editor-page-name:hover .sve-topbar__title {
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .editor-page-name__warn {
    display: inline-flex;
    vertical-align: -2px;
    font-size: 16px;
    color: var(--sve-warning);
  }
  /*
    Mirrors production's own vuetify-components.css exactly (.v-layout /
    .v-main rules) - that file only loads *scoped* to previewed page content
    (see main.ts's loadScopedVuetifyStyles, EDITED_APP_SCOPE_CLASS), but
    HeroParallax/v-main here are the outer app shell, not page content, so
    the scoped copy never reaches them. Production keeps .v-layout as flex
    (just flex-direction:column, not display:block - Vuetify's own
    flex:1/0/auto rules on v-main etc. still matter along that axis) and
    caps/centers ONLY .v-main - v-system-bar/HeroParallax stay genuinely
    full width, exactly like MainMenu and the hero parallax do on the real
    site.
  */
  .v-layout {
    flex-direction: column;
    /* A v-layout inside v-app gets overflow:hidden as an INLINE style from
       Vuetify (its nested-layout styles) - hence !important. That made this
       the scroll box the top bar sticks to, and it never scrolls, so the bar
       scrolled away with the page. clip cuts off the same overhang (the
       full-width hero) without becoming a scroll box. */
    overflow-x: clip !important;
    overflow-y: visible !important;
  }
  .v-main {
    max-width: 1368px !important;
    min-width: 336px !important;
    width: 100%;
    margin-inline: auto;
  }

  /* The skeleton stands in for real page content, so it needs the same
     breathing room that content has - flush against the system bar and the
     window edges it read as a stray grey slab. Inline padding uses the same
     clamp as .editor-page's own, so it lines up with what replaces it. */
  .hidden-page-notice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    max-width: 1200px;
    margin: 12px auto 0;
    padding: 10px 16px;
    border: solid 1px var(--sve-border);
    border-radius: var(--sve-radius-lg);
    background: var(--sve-surface-muted);
    color: var(--sve-text-muted);
    font-size: 14px;
  }
  .hidden-page-notice > span {
    flex: 1 1 260px;
  }
  .editor-page-skeleton {
    /* Centred and width-capped like the real content it stands in for -
       .v-main below is 1368px wide, so a full-bleed skeleton would be wider
       than the page that replaces it and jump on load. */
    max-width: 1368px;
    margin-inline: auto;
    padding-top: 32px;
    padding-inline: clamp(16px, 5vw, 48px);
    background: transparent;
  }

  .editor-bottom-nav {
    position: fixed !important;
    min-height: 64px !important;
    font-size: 14px;
  }
  .nav-drawer-fixed {
    position: fixed !important;
    top: 36px !important;
    left: 0 !important;
    height: calc(100% - 36px) !important;
    z-index: 1000 !important;
  }
  .active-class {
    background-color: var(--primary-lighten) !important;
    color: var(--primary) !important;
  }
  .seo-field-label {
    font-size: 0.9rem;
    color: #3A4A58;
  }
  .seo-og-image-preview {
    display: block;
    max-width: 160px;
    max-height: 90px;
    object-fit: contain;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 8px;
  }

  .rotate-left-90 {
    transform: rotate(-90deg) !important;
  }
</style>
