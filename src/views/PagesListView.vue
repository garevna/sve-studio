<script lang="ts" setup>
  import type { MenuItemModel, SubmenuItemModel } from '@/types/MenuItemModel'
  import type { DynamicPageListItem, TemplatePageModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { SveButton } from '@sve/editor-ui'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import PageSeoDialog from '@/components/special/PageSeoDialog.vue'
  import PageTitleDialog from '@/components/special/PageTitleDialog.vue'
  import { API_REQUEST_MODE } from '@/configs/api-mode'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { defaultSiteLocale, emptyTranslatedModel, localeDisplayName, missingTranslations, siteLocales, totalMissing } from '@/utils/locale-text'
  import { hasOwnLabel, linkedPageId, menuLabel, pageTitleText, translatedPageTitle } from '@/utils/page-title'
  import { openPreview, pagePreviewUrl } from '@/utils/preview-window'
  import { slugify } from '@/utils/slugify'

  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  // Everything on this screen that CHANGES a page - creating, deleting,
  // hiding, linking into the menu, pushing all of them to the server - is
  // gated on the same capability that makes the page editor read-only, so
  // the SEO role gets a plain list it can walk into to reach each page's own
  // SEO dialog. Hiding "Додати сторінку" while leaving "Видалити сторінку"
  // would be a role that can destroy but not create. See
  // configs/editor-roles.ts.
  const canEditContent = computed(() => useCommonStore().roleConfig.canEditPageContent)

  // The read-only role's own two actions per row - and the row itself opens
  // the SEO dialog rather than navigating into the page editor, which for
  // this role would only ever be a detour to the very same dialog. With no page content to
  // edit there is no reason to open the page editor at all: previewing and
  // SEO are the whole job, so both happen straight from this list.
  function openPageInPreview (pageId: string) {
    openPreview(pagePreviewUrl(pageId, useCommonStore().locale))
  }

  // Whichever page's SEO is currently open. The page is fetched on demand
  // (this list only holds id/title/visibility) and its own seo object is
  // handed to the dialog to edit in place; publishing writes the whole page
  // back, unchanged apart from that object.
  const seoDialogOpen = ref(false)
  const seoPageId = ref<string | null>(null)
  const seoPage = ref<TemplatePageModel | null>(null)
  const seoSaving = ref(false)

  async function openSeoDialog (page: DynamicPageListItem) {
    const content = await ajaxStore.getDynamicPageContent(page.pageId)
    if (!content) return
    content.seo ??= {}
    seoPageId.value = page.pageId
    seoPage.value = content
    seoDialogOpen.value = true
  }

  async function saveSeo () {
    if (!seoPageId.value || !seoPage.value) return
    seoSaving.value = true
    try {
      await ajaxStore.saveDynamicPage(seoPageId.value, seoPage.value, { publish: true })
      seoDialogOpen.value = false
    } catch {
      // saveDynamicPage reports its own outcome (ajax.ts) - nothing to add.
    } finally {
      seoSaving.value = false
    }
  }
  const router = useRouter()

  // The home page is the app's own default/root ("/" redirects to it on
  // production) - it can't be hidden or deleted, and doesn't need its own
  // menu entry either (it's already reachable via the logo/home click, not
  // a normal page link) - so none of this row's action buttons apply to it.
  const HOME_PAGE_ID = 'home-page'

  const pages = ref<DynamicPageListItem[]>([])
  const menuItems = ref<MenuItemModel[]>([])
  const loading = ref(true)

  onMounted(async () => {
    const [loadedPages, loadedMenu] = await Promise.all([
      ajaxStore.listDynamicPages(),
      ajaxStore.getMenuContent(),
    ])
    pages.value = loadedPages
    menuItems.value = loadedMenu || []
    loading.value = false
  })

  // Untranslated texts per page and language - recounted when the page list
  // or the site's languages change. Partly translated pages can still be
  // published; this only makes the gaps visible.
  const untranslated = ref<Record<string, Record<string, number>>>({})
  async function countUntranslated () {
    const result: Record<string, Record<string, number>> = {}
    await Promise.all(pages.value.map(async page => {
      try {
        result[page.pageId] = missingTranslations(await ajaxStore.getDynamicPageContent(page.pageId))
      } catch {
        // A page that can't be read just shows no counter.
      }
    }))
    untranslated.value = result
  }
  watch(() => [pages.value.map(page => page.pageId).join(','), siteLocales().join(',')], countUntranslated)
  function untranslatedSummary (pageId: string): string {
    return Object.entries(untranslated.value[pageId] ?? {})
      .filter(([, count]) => count > 0)
      .map(([code, count]) => `${localeDisplayName(code)} — ${count}`)
      .join(', ')
  }

  // Walks top items + their (one level of) submenu looking for a link to
  // this page - matches MainMenu.vue's own dynamic-page addressing
  // (route:'dynamic-page', params.pageId), same scheme this list's own
  // "insert into menu" flow below produces.
  // Every page's name, by id - what a menu item leading to a page shows
  // (utils/page-title.ts).
  const pageTitles = computed(() => Object.fromEntries(pages.value.map(page => [page.pageId, page.title])))

  // In the site's main language - like the menu labels under each name.
  // It used the language picked for editing content, which this page does
  // not show: after editing a page in German the list read in German.
  function pageLabel (page: DynamicPageListItem | null | undefined): string {
    return page ? (pageTitleText(page.title, defaultSiteLocale()) || page.pageId) : ''
  }

  function linkedMenuLabel (page: DynamicPageListItem): string | null {
    const label = (item: MenuItemModel | SubmenuItemModel) => menuLabel(item, defaultSiteLocale(), pageTitles.value)
    for (const item of menuItems.value) {
      if (linkedPageId(item) === page.pageId) {
        return label(item)
      }
      for (const subItem of item.submenu || []) {
        if (linkedPageId(subItem) === page.pageId) {
          return `${label(item)} → ${label(subItem)}`
        }
      }
    }
    return null
  }

  // Renaming a page: its name in every language of the site. The menu
  // follows by itself.
  const renameDialog = ref(false)
  const renamePage = ref<DynamicPageListItem | null>(null)
  const renameTitle = ref<TranslatedModel>({})
  const renaming = ref(false)
  function openRenameDialog (page: DynamicPageListItem) {
    renamePage.value = page
    renameTitle.value = translatedPageTitle(page.title)
    renameDialog.value = true
  }
  async function confirmRename (title: TranslatedModel) {
    const page = renamePage.value
    if (!page) return
    renaming.value = true
    try {
      const content = await ajaxStore.getDynamicPageContent(page.pageId)
      if (!content) return
      content.title = { ...title }
      await ajaxStore.saveDynamicPage(page.pageId, content, { publish: true })
      page.title = { ...title }
      renameDialog.value = false
    } finally {
      renaming.value = false
    }
  }

  // { title, index } instead of the raw items - index is the real position
  // in menuItems (not the filtered list's own position), since that's what
  // insertSectionIndex/confirmInsertMenuLink need to splice into the right
  // section's submenu.
  const sectionOptions = computed(() => menuItems.value
    .map((item, index) => ({ item, index }))
    .filter(entry => (entry.item.submenu?.length ?? 0) > 0)
    .map(entry => ({ title: menuLabel(entry.item, defaultSiteLocale(), pageTitles.value), index: entry.index })))

  const insertMenuDialog = ref(false)
  const insertMenuPage = ref<DynamicPageListItem | null>(null)
  const insertIntoSection = ref(true)
  const insertSectionIndex = ref<number | null>(null)
  // An exception, off by default: the menu shows the page's own name.
  const insertOwnLabel = ref(false)
  const insertTitle = ref(emptyTranslatedModel())
  const inserting = ref(false)
  const removingFromMenu = ref(false)

  // Where this page is already linked, if it is. The dialog used to be
  // "insert" and nothing else: opening it for a page that is already in the
  // menu showed empty fields, and confirming added a SECOND link. There was
  // no way to move a link, rename it, or take it out at all - short of
  // deleting the page.
  type MenuLinkLocation = { sectionIndex: number | null, itemIndex: number }
  function findMenuLink (pageId: string): MenuLinkLocation | null {
    const pageIdOf = (item: { route?: string, params?: unknown }) =>
      (item.route === 'dynamic-page' ? (item.params as { pageId?: string } | undefined)?.pageId : undefined)
    for (const [index, item] of menuItems.value.entries()) {
      if (pageIdOf(item) === pageId) {
        return { sectionIndex: null, itemIndex: index }
      }
      for (const [subIndex, subItem] of (item.submenu || []).entries()) {
        if (pageIdOf(subItem) === pageId) {
          return { sectionIndex: index, itemIndex: subIndex }
        }
      }
    }
    return null
  }

  function menuEntryAt (location: MenuLinkLocation) {
    return location.sectionIndex === null
      ? menuItems.value[location.itemIndex]
      : menuItems.value[location.sectionIndex]?.submenu?.[location.itemIndex]
  }

  const existingMenuLink = ref<MenuLinkLocation | null>(null)
  const existingMenuLabel = computed(() =>
    (insertMenuPage.value ? linkedMenuLabel(insertMenuPage.value) : null))

  function removeMenuLinkAt (location: MenuLinkLocation) {
    if (location.sectionIndex === null) {
      menuItems.value.splice(location.itemIndex, 1)
      return
    }
    menuItems.value[location.sectionIndex]?.submenu?.splice(location.itemIndex, 1)
  }

  function openInsertMenuDialog (page: DynamicPageListItem) {
    insertMenuPage.value = page
    const existing = findMenuLink(page.pageId)
    existingMenuLink.value = existing

    if (existing) {
      // Open on what is actually there, so the dialog can be read as "this
      // is the link" rather than as a blank form that happens to overwrite
      // something.
      insertIntoSection.value = existing.sectionIndex !== null
      insertSectionIndex.value = existing.sectionIndex
      const entry = menuEntryAt(existing)
      insertOwnLabel.value = !!entry && hasOwnLabel(entry)
      insertTitle.value = { ...emptyTranslatedModel(), ...entry?.title }
      insertMenuDialog.value = true
      return
    }

    insertIntoSection.value = sectionOptions.value.length > 0
    insertSectionIndex.value = null
    insertOwnLabel.value = false
    insertTitle.value = emptyTranslatedModel()
    insertMenuDialog.value = true
  }

  async function removeMenuLink () {
    const existing = existingMenuLink.value
    if (!existing) return
    if (!await feedback.confirmDelete('mainMenuLink')) return
    removingFromMenu.value = true
    try {
      removeMenuLinkAt(existing)
      await ajaxStore.saveMenuContent(menuItems.value, { publish: true })
      existingMenuLink.value = null
      insertMenuDialog.value = false
      feedback.notifySuccess(t('popups.menuLinkRemoved'))
    } finally {
      removingFromMenu.value = false
    }
  }

  async function confirmInsertMenuLink () {
    if (!insertMenuPage.value) return
    if (insertIntoSection.value && insertSectionIndex.value === null) return
    const wasLinked = !!existingMenuLink.value
    inserting.value = true
    try {
      const entry = {
        ...(insertOwnLabel.value && hasOwnLabel({ title: insertTitle.value }) ? { title: insertTitle.value } : {}),
        route: 'dynamic-page',
        params: { pageId: insertMenuPage.value.pageId },
      }
      // An existing link is MOVED, not duplicated: taken out of wherever it
      // was and put where the dialog now says, carrying whatever titles
      // were typed.
      if (existingMenuLink.value) {
        removeMenuLinkAt(existingMenuLink.value)
        existingMenuLink.value = null
      }
      if (insertIntoSection.value && insertSectionIndex.value !== null) {
        const section = menuItems.value[insertSectionIndex.value]
        if (!section) return
        section.submenu ??= []
        section.submenu.push(entry)
      } else {
        menuItems.value.push({ ...entry, selected: null, expanded: false })
      }
      await ajaxStore.saveMenuContent(menuItems.value, { publish: true })
      insertMenuDialog.value = false
      // saveMenuContent already says "Головне меню збережено"; this names
      // what was actually done, which is the part the user asked for.
      feedback.notifySuccess(wasLinked ? t('popups.menuLinkUpdated') : t('popups.menuLinkAdded'))
    } finally {
      inserting.value = false
    }
  }

  // Only meaningful once the server is real - listDynamicPages() reflects
  // whatever the server already has, which can be a strict subset of what
  // this editor actually knows about (e.g. pages created before the
  // /content/pages endpoints existed, or ones the server was never told
  // about at all). Each page's own "Зберегти" already does this one at a
  // time; this is the same PUT, just looped over every local page in one
  // click instead of navigating into each editor individually.
  const isLiveMode = API_REQUEST_MODE !== 'test'
  const publishing = ref(false)
  const publishProgress = ref('')

  async function publishAllToServer () {
    publishing.value = true
    try {
      const localPages = await ajaxStore.readDynamicPagesListLocal()
      let published = 0
      let failed = 0
      for (const [index, localPage] of localPages.entries()) {
        publishProgress.value = `${index + 1}/${localPages.length}: ${localPage.pageId}`
        try {
          const content = await ajaxStore.getDynamicPageContent(localPage.pageId)
          if (!content) {
            failed++
            continue
          }
          await ajaxStore.saveDynamicPage(localPage.pageId, content, { publish: true })
          published++
        } catch {
          failed++
        }
      }
      pages.value = await ajaxStore.listDynamicPages()
      if (failed > 0) {
        feedback.notifyError(
          t('popups.publishPartial', { published, total: localPages.length }),
          t('popups.publishPartialDetail', { failed }),
        )
      } else {
        feedback.notifySuccess(t('popups.publishAll', { published }))
      }
    } finally {
      publishing.value = false
      publishProgress.value = ''
    }
  }

  const deleteDialogOpen = ref(false)
  const pageToDelete = ref<DynamicPageListItem | null>(null)
  const deleting = ref(false)

  function requestDeletePage (page: DynamicPageListItem) {
    pageToDelete.value = page
    deleteDialogOpen.value = true
  }

  async function confirmDeletePage () {
    if (!pageToDelete.value) return
    deleting.value = true
    try {
      await ajaxStore.deleteDynamicPage(pageToDelete.value.pageId)
      pages.value = pages.value.filter(page => page.pageId !== pageToDelete.value?.pageId)
      deleteDialogOpen.value = false
    } finally {
      deleting.value = false
      pageToDelete.value = null
    }
  }

  const togglingVisibility = ref<string | null>(null)

  // Hiding a page is a lighter, reversible alternative to deleting it -
  // production's page-list/menu/sitemap should stop showing a hidden page,
  // but the editor keeps its content around for later.
  async function toggleVisibility (page: DynamicPageListItem) {
    const nextVisible = !(page.visible ?? true)
    togglingVisibility.value = page.pageId
    try {
      await ajaxStore.setDynamicPageVisibility(page.pageId, nextVisible)
      page.visible = nextVisible
    } finally {
      togglingVisibility.value = null
    }
  }

  const dialog = ref(false)
  const creating = ref(false)
  const name = ref('')
  const breadcrumbs = ref(true)
  const backButton = ref(true)
  const hero = ref(false)
  const errorText = ref('')

  const slug = computed(() => slugify(name.value))

  function openDialog () {
    name.value = ''
    breadcrumbs.value = true
    backButton.value = true
    hero.value = false
    errorText.value = ''
    dialog.value = true
  }

  async function createPage () {
    if (!slug.value) {
      errorText.value = 'Введіть назву сторінки'
      return
    }
    if (pages.value.some(page => page.pageId === slug.value)) {
      errorText.value = 'Сторінка з таким ідентифікатором вже існує'
      return
    }

    creating.value = true
    try {
      const content: TemplatePageModel = {
        id: slug.value,
        // The name the client typed also becomes the page's display title -
        // editor-only metadata (see TemplatePageModel), never read by
        // production, purely so the pages list shows a name the client
        // recognizes instead of the slugified id.
        // The name as typed, in the site's main language; the others are
        // filled in later (renaming the page in this list).
        title: Object.fromEntries(siteLocales().map(code => [code, code === defaultSiteLocale() ? name.value : ''])),
        breadcrumbs: breadcrumbs.value,
        backButton: backButton.value,
        hero: hero.value,
        blocks: [],
      }
      await ajaxStore.saveDynamicPage(slug.value, content)
      dialog.value = false
      router.push(`/editor/${slug.value}`)
    } catch {
      errorText.value = 'Не вдалося створити сторінку.'
    } finally {
      creating.value = false
    }
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="dynamic-pages" title="Сторінки">
        <template #actions>
          <SveButton
            v-if="isLiveMode && canEditContent"
            collapsible
            icon="mdi-cloud-upload-outline"
            :loading="publishing"
            @click="publishAllToServer"
          >
            {{ publishing ? publishProgress : 'Синхронізувати з сервером' }}
          </SveButton>
          <SveButton
            v-if="canEditContent"
            collapsible
            icon="mdi-plus"
            variant="primary"
            @click="openDialog"
          >
            Додати сторінку
          </SveButton>
        </template>
      </EditorPageHeader>

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else>
        <!-- Not bg-color="transparent": Vuetify turns a non-CSS-colour value
          into a CLASS (bg-transparent) rather than an inline style -
          isCssColor() only recognises #rrggbb / rgb() / hsl() / var(--x)
          forms - and that class then has to win a cascade-layer fight
          against .v-list's own background, which comes from Vuetify's
          vuetify-components layer. The rule below is unlayered, and
          unlayered declarations beat layered ones outright, so it doesn't
          depend on the layer order this app declares in index.html. -->
        <v-list
          v-if="pages.length > 0"
          class="pages-list mb-4"
          lines="two"
        >
          <v-list-item
            v-for="page in pages"
            :key="page.pageId"
            :class="{ 'text-medium-emphasis': page.visible === false }"
            prepend-icon="mdi-file-document-outline"
            :subtitle="linkedMenuLabel(page) ? `Пункт меню: ${linkedMenuLabel(page)}` : undefined"
            :title="pageLabel(page)"
            :to="canEditContent ? `/editor/${page.pageId}` : undefined"
            @click="canEditContent ? undefined : openSeoDialog(page)"
          >
            <template #append>
              <v-chip
                v-if="totalMissing(untranslated[page.pageId] ?? {}) > 0"
                class="mr-2"
                color="warning"
                prepend-icon="mdi-translate"
                size="small"
                variant="tonal"
              >
                {{ totalMissing(untranslated[page.pageId] ?? {}) }}
                <v-tooltip activator="parent" location="top">
                  {{ t('translations.missingCount', { count: untranslatedSummary(page.pageId) }) }}
                </v-tooltip>
              </v-chip>
              <ToolbarIconButton
                v-if="!canEditContent"
                icon="mdi-open-in-new"
                tooltip="Переглянути сторінку в новій вкладці"
                @click.stop.prevent="openPageInPreview(page.pageId)"
              />
              <ToolbarIconButton
                v-if="!canEditContent"
                icon="mdi-pencil"
                tooltip="SEO цієї сторінки"
                @click.stop.prevent="openSeoDialog(page)"
              />
              <ToolbarIconButton
                v-if="canEditContent"
                icon="mdi-rename-outline"
                tooltip="Назва сторінки (вона ж - у меню)"
                @click.stop.prevent="openRenameDialog(page)"
              />
              <ToolbarIconButton
                v-if="canEditContent && page.pageId !== HOME_PAGE_ID"
                icon="mdi-link-edit"
                :tooltip="linkedMenuLabel(page)
                  ? 'Посилання на сторінку в головному меню'
                  : 'Вставити посилання на сторінку в головне меню'"
                @click.stop.prevent="openInsertMenuDialog(page)"
              />
              <ToolbarIconButton
                v-if="canEditContent && page.pageId !== HOME_PAGE_ID"
                :icon="page.visible === false ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :loading="togglingVisibility === page.pageId"
                :tooltip="page.visible === false ? 'Показати сторінку' : 'Приховати сторінку'"
                @click.stop.prevent="toggleVisibility(page)"
              />
              <ToolbarIconButton
                v-if="canEditContent && page.pageId !== HOME_PAGE_ID"
                icon="mdi-delete"
                tooltip="Видалити сторінку"
                @click.stop.prevent="requestDeletePage(page)"
              />
            </template>
          </v-list-item>
        </v-list>
        <p v-else class="text-body-2 text-medium-emphasis mb-4">Сторінок поки немає</p>

        <!-- <v-btn color="primary" prepend-icon="mdi-plus" variant="elevated" @click="openDialog">
          Додати сторінку
        </v-btn> -->
      </template>
    </v-main>

    <PageSeoDialog
      v-if="seoPage?.seo"
      v-model="seoDialogOpen"
      :page-id="seoPage.id"
      saveable
      :saving="seoSaving"
      :seo="seoPage.seo"
      @save="saveSeo"
    />

    <v-dialog v-model="dialog" max-width="480">
      <v-card title="Нова сторінка">
        <v-card-text>
          <v-text-field
            v-model="name"
            autofocus
            label="Назва сторінки"
            variant="outlined"
          />
          <p class="text-caption text-medium-emphasis mb-4">
            Ідентифікатор (ім'я файлу): <strong>{{ slug || '—' }}</strong>
          </p>

          <v-switch
            v-model="breadcrumbs"
            color="primary"
            hide-details
            inset
            label="Хлібні крихти"
          />
          <v-switch
            v-model="backButton"
            color="primary"
            hide-details
            inset
            label="Кнопка «Назад»"
          />
          <v-switch
            v-model="hero"
            color="primary"
            hide-details
            inset
            label="Hero-секція"
          />

          <v-alert
            v-if="errorText"
            class="mt-3"
            density="compact"
            type="error"
            variant="tonal"
          >
            {{ errorText }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Скасувати</v-btn>
          <v-btn color="primary" :loading="creating" variant="elevated" @click="createPage">Створити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="insertMenuDialog" max-width="480">
      <v-card :title="existingMenuLink ? 'Посилання на сторінку в меню' : 'Вставити посилання в меню'">
        <v-card-text>
          <!-- Where the link is right now. Without it the dialog looked
            identical for a page that is in the menu and one that is not. -->
          <p v-if="existingMenuLabel" class="text-body-2 mb-4">
            Зараз у меню: <strong>{{ existingMenuLabel }}</strong>
          </p>

          <v-switch
            color="primary"
            hide-details
            inset
            :label="insertIntoSection ? 'Вставити у розділ' : 'Окремий пункт (без підпунктів)'"
            :model-value="insertIntoSection"
            @update:model-value="insertIntoSection = !!$event"
          />

          <v-select
            v-if="insertIntoSection"
            v-model="insertSectionIndex"
            class="mt-2"
            item-title="title"
            item-value="index"
            :items="sectionOptions"
            label="Розділ меню"
            variant="outlined"
          />
          <p v-if="insertIntoSection && sectionOptions.length === 0" class="text-caption text-medium-emphasis">
            У меню поки немає розділів з підпунктами - оберіть «Окремий пункт».
          </p>

          <!-- The menu shows the page's name; a text of its own only as an
            exception, one per site language (global.json "locales"). -->
          <p class="text-body-2 mt-3 mb-1">
            У меню: <strong>{{ insertOwnLabel ? '' : pageLabel(insertMenuPage) }}</strong>
            <span v-if="!insertOwnLabel" class="text-medium-emphasis">(назва сторінки)</span>
          </p>
          <v-switch
            v-model="insertOwnLabel"
            color="primary"
            hide-details
            inset
            label="Своя назва в меню"
          />
          <template v-if="insertOwnLabel">
            <v-text-field
              v-for="code in siteLocales()"
              :key="code"
              v-model="insertTitle[code]"
              :label="`Назва пункту (${code.toUpperCase()})`"
              :placeholder="pageTitleText(insertMenuPage?.title, code)"
              variant="outlined"
            />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="existingMenuLink"
            color="error"
            :loading="removingFromMenu"
            variant="text"
            @click="removeMenuLink"
          >
            Прибрати з меню
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="insertMenuDialog = false">Скасувати</v-btn>
          <v-btn
            color="primary"
            :disabled="insertIntoSection && insertSectionIndex === null"
            :loading="inserting"
            variant="elevated"
            @click="confirmInsertMenuLink"
          >
            {{ existingMenuLink ? 'Зберегти' : 'Вставити' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <PageTitleDialog v-model="renameDialog" :loading="renaming" :title="renameTitle" @save="confirmRename" />

    <ConfirmDialog
      v-model="deleteDialogOpen"
      confirm-text="Видалити"
      :loading="deleting"
      :text="`Сторінку «${pageLabel(pageToDelete)}» буде видалено безповоротно.`"
      title="Видалити сторінку?"
      @confirm="confirmDeletePage"
    />

  </v-app>
</template>

<style scoped>
  /* Unlayered on purpose - see the comment on <v-list> above. */
  .pages-list {
    background: transparent;
  }
</style>
