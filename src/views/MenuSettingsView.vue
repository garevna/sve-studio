<script lang="ts" setup>
  import type { MenuItemModel, SubmenuItemModel } from '@/types/MenuItemModel'
  import { onMounted, ref, watch } from 'vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import MenuLinkDialog from '@/components/special/MenuLinkDialog.vue'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { emptyTranslatedModel, resolveLocaleText } from '@/utils/locale-text'
  import { dropRepeatedLabels, hasOwnLabel, linkedPageId, type PageTitle, pageTitleText } from '@/utils/page-title'

  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()
  const commonStore = useCommonStore()

  const items = ref<MenuItemModel[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  // Same autosave-to-draft pattern as GeneralSettingsView.vue/SeoSettingsView.vue.
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(items, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      ajaxStore.saveMenuContent(items.value, { publish: false })
    }, 800)
  }, { deep: true })

  // Every page's name, by id: an item that leads to a page shows it, unless
  // the item has a text of its own (an exception) - see utils/page-title.ts.
  const pageTitles = ref<Record<string, PageTitle>>({})

  onMounted(async () => {
    const [loaded, pages] = await Promise.all([ajaxStore.getMenuContent(), ajaxStore.listDynamicPages()])
    pageTitles.value = Object.fromEntries(pages.map(page => [page.pageId, page.title]))
    skipNextAutoSave = true
    // A text that only repeats the page's name is dropped, so the item
    // follows the page from now on. Not an edit: saved with the next one.
    items.value = dropRepeatedLabels(loaded || [], pageTitles.value)
    dirty.value = await ajaxStore.isMenuContentUpdated()
    loading.value = false
  })

  type Item = MenuItemModel | SubmenuItemModel

  function getTitle (item: Item): string {
    return resolveLocaleText(item.title, commonStore.locale)
  }
  // Emptied in every language, a page item's own text is gone and it shows
  // the page's name again.
  function setTitle (item: Item, value: string) {
    item.title ??= emptyTranslatedModel()
    item.title[commonStore.locale] = value
    if (linkedPageId(item) && !hasOwnLabel(item)) {
      delete item.title
    }
  }
  function followPage (item: Item) {
    delete item.title
  }
  // The page's name, shown in an empty field of an item that leads to a page.
  function pageName (item: Item): string {
    const pageId = linkedPageId(item)
    return pageId ? pageTitleText(pageTitles.value[pageId], commonStore.locale) : ''
  }

  function addTopItem () {
    items.value.push({ title: emptyTranslatedModel(), selected: null, expanded: false })
  }
  async function removeTopItem (index: number) {
    if (!await feedback.confirmDelete('menuItemWithChildren')) return
    items.value.splice(index, 1)
  }

  // Production data is exclusively either a leaf (route set, no submenu) or
  // a container (submenu set, no route) - never both at once (confirmed
  // against the real menu-content.json) - switching "Підпункти" enforces
  // that same either/or shape instead of leaving stale fields behind.
  function toggleHasSubmenu (item: MenuItemModel, hasSubmenu: boolean | null) {
    if (hasSubmenu) {
      item.route = undefined
      item.params = undefined
      item.hash = undefined
      item.submenu = []
    } else {
      item.submenu = undefined
    }
  }

  function addSubmenuItem (item: MenuItemModel) {
    item.submenu ??= []
    item.submenu.push({ title: emptyTranslatedModel(), route: '' })
  }
  async function removeSubmenuItem (item: MenuItemModel, index: number) {
    if (!await feedback.confirmDelete('menuSubitem')) return
    item.submenu?.splice(index, 1)
  }

  const linkDialogOpen = ref(false)
  const linkDialogTarget = ref<MenuItemModel | SubmenuItemModel | null>(null)
  function openLinkDialog (item: MenuItemModel | SubmenuItemModel) {
    linkDialogTarget.value = item
    linkDialogOpen.value = true
  }

  function linkSummary (item: MenuItemModel | SubmenuItemModel): string {
    if (item.route !== 'dynamic-page') return item.route ? t('menuSettings.route', { route: item.route }) : t('menuSettings.noLink')
    const pageId = (item.params as { pageId?: string } | undefined)?.pageId
    return item.hash ? t('menuSettings.pageBlock', { pageId, hash: item.hash }) : t('menuSettings.page', { pageId })
  }

  async function save () {
    saving.value = true
    try {
      // Reported centrally by the store - see ajax.ts's reportSaved /
      // reportSaveFailed. Nothing local to say here.
      await ajaxStore.saveMenuContent(items.value, { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      items.value = await ajaxStore.undoMenuContent()
      dirty.value = false
      feedback.notifySuccess(t('popups.undoDone'))
    } catch {
      feedback.notifyError(t('popups.undoFailed'))
    } finally {
      undoing.value = false
    }
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="menu-content.json" :title="t('common.menu')" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else>
        <div class="mb-4">
          <LocaleSwitcher :scope="items" />
        </div>

        <div class="d-flex flex-column ga-4">
          <div v-for="(item, index) of items" :key="index" class="editor-panel pa-4">
            <div class="d-flex align-center ga-3 mb-3">
              <v-text-field
                density="compact"
                hide-details
                :label="linkedPageId(item) ? t('menuSettings.ownName') : t('menuSettings.itemName')"
                :model-value="getTitle(item)"
                persistent-placeholder
                :placeholder="pageName(item)"
                variant="outlined"
                @update:model-value="setTitle(item, $event)"
              />
              <v-switch
                color="primary"
                hide-details
                inset
                :label="t('menuSettings.subitems')"
                :model-value="!!item.submenu"
                @update:model-value="toggleHasSubmenu(item, $event)"
              />
              <ToolbarIconButton icon="mdi-delete" :tooltip="t('menuSettings.deleteItem')" @click="removeTopItem(index)" />
            </div>

            <template v-if="item.submenu">
              <div class="submenu-list ml-8">
                <div v-for="(subItem, subIndex) of item.submenu" :key="subIndex" class="submenu-item pa-3 mb-2">
                  <div class="d-flex align-center ga-3">
                    <v-text-field
                      density="compact"
                      hide-details
                      :label="linkedPageId(subItem) ? t('menuSettings.ownName') : t('menuSettings.subitemName')"
                      :model-value="getTitle(subItem)"
                      persistent-placeholder
                      :placeholder="pageName(subItem)"
                      variant="outlined"
                      @update:model-value="setTitle(subItem, $event)"
                    />
                    <v-btn prepend-icon="mdi-link-edit" variant="tonal" @click="openLinkDialog(subItem)">{{ t('common.configure') }}</v-btn>
                    <ToolbarIconButton icon="mdi-delete" :tooltip="t('menuSettings.deleteSubitem')" @click="removeSubmenuItem(item, subIndex)" />
                  </div>
                  <p class="text-caption text-medium-emphasis mt-1 mb-0">
                    {{ linkSummary(subItem) }}
                    <template v-if="linkedPageId(subItem)">
                      ·
                      <template v-if="hasOwnLabel(subItem)">
                        {{ t('menuSettings.ownNameNotPage') }}
                        <a class="menu-follow-page" href="#" @click.prevent="followPage(subItem)">{{ t('menuSettings.likePage') }}</a>
                      </template>
                      <template v-else>{{ t('menuSettings.nameLikePage') }}</template>
                    </template>
                  </p>
                </div>
              </div>
              <v-btn prepend-icon="mdi-plus" variant="outlined" @click="addSubmenuItem(item)">{{ t('menuSettings.addSubitem') }}</v-btn>
            </template>

            <template v-else>
              <div class="d-flex align-center ga-3">
                <v-btn prepend-icon="mdi-link-edit" variant="tonal" @click="openLinkDialog(item)">{{ t('common.configure') }}</v-btn>
                <span class="text-caption text-medium-emphasis">
                  {{ linkSummary(item) }}
                  <template v-if="linkedPageId(item)">
                    ·
                    <template v-if="hasOwnLabel(item)">
                      {{ t('menuSettings.ownNameShort') }}
                      <a class="menu-follow-page" href="#" @click.prevent="followPage(item)">{{ t('menuSettings.likePage') }}</a>
                    </template>
                    <template v-else>{{ t('menuSettings.nameLikePage') }}</template>
                  </template>
                </span>
              </div>
            </template>
          </div>
        </div>

        <v-btn class="mt-4" prepend-icon="mdi-plus" variant="outlined" @click="addTopItem">{{ t('menuSettings.addItem') }}</v-btn>

        <EditorSaveBar
          :dirty="dirty"
          :loading="saving"
          :undoing="undoing"
          @click="save"
          @undo="undo"
        />
      </template>
    </v-main>

    <MenuLinkDialog v-if="linkDialogTarget" v-model="linkDialogOpen" :item="linkDialogTarget" />

  </v-app>
</template>

<style scoped>
  .submenu-list {
    margin-bottom: 12px;
  }
  .menu-follow-page {
    color: rgb(var(--v-theme-primary));
  }
  .submenu-item {
    background: transparent;
    border: solid 1px #ddd;
    border-radius: var(--v-default-border-radius);
  }
</style>
