<script lang="ts" setup>
  import type { PopupUsePlace } from '@/composables/useSitePopups'
  import type { PopupModel } from '@/types/TemplateBlockModel'
  import { onMounted, ref } from 'vue'
  import PopupEditorDialog from '@/components/editors/popups/PopupEditorDialog.vue'
  import PopupPreviewDialog from '@/components/editors/popups/PopupPreviewDialog.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { BUILT_IN_POPUP_IDS } from '@/configs/default-popups'
  import { POPUP_PLACEMENTS } from '@/configs/popup-placements'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // The editor's "Попапи": every popup of the site. A popup is one of four
  // fixed windows (where it appears) with content of its own, and any
  // button on any page can open it - linked in that button's settings
  // ("Що робить кнопка"), or the popup is started there and finished here.
  const sitePopups = useSitePopups()
  const saving = ref(false)
  // the popup being looked at as a visitor sees it
  const previewing = ref<PopupModel | null>(null)
  const undoing = ref(false)

  onMounted(() => sitePopups.load())

  function placementOf (popup: PopupModel) {
    return POPUP_PLACEMENTS.find(option => option.value === popup.placement) ?? POPUP_PLACEMENTS[0]!
  }

  function add (placement: PopupModel['placement']) {
    sitePopups.edit(sitePopups.create(placement).id)
  }

  async function save () {
    saving.value = true
    try {
      await sitePopups.save()
    } finally {
      saving.value = false
    }
  }
  async function undo () {
    undoing.value = true
    try {
      await sitePopups.undo()
    } finally {
      undoing.value = false
    }
  }

  // Before a popup goes, where it is opened from: those buttons will lead
  // nowhere, and the window says so.
  const checking = ref<string | null>(null)
  async function remove (popup: PopupModel) {
    checking.value = popup.id
    let where: PopupUsePlace[] = []
    try {
      where = await sitePopups.places(popup.id)
    } finally {
      checking.value = null
    }
    const count = where.reduce((sum, place) => sum + place.count, 0)
    const sure = await useUiFeedbackStore().confirm({
      title: t('pagePopups.deleteTitle', { name: popup.name }),
      text: count > 0
        ? t('pagePopups.deleteTextUsed', { places: where.map(place => `${place.label} (${place.count})`).join(', ') })
        : t('confirm.irreversible'),
    })
    if (sure) await sitePopups.remove(popup.id, where)
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :title="t('pagePopups.list')" />

      <p class="popups-hint">{{ t('pagePopups.hint') }}</p>
      <v-progress-linear v-if="!sitePopups.loaded.value" color="primary" indeterminate />
      <template v-else>
        <p v-if="sitePopups.popups.value.length === 0" class="mb-6">{{ t('pagePopups.none') }}</p>
        <div class="popups-list">
          <div v-for="popup of sitePopups.popups.value" :key="popup.id" class="popups-row">
            <v-icon class="popups-icon" :icon="placementOf(popup).icon" />
            <div class="popups-names" @click="sitePopups.edit(popup.id)">
              <span class="popups-name">{{ popup.name }}</span>
              <span class="popups-meta">{{ t(placementOf(popup).label) }} · {{ t('pagePopups.blocks', { count: popup.content.children?.length ?? 0 }) }}</span>
            </div>
            <ToolbarIconButton icon="mdi-eye-outline" :tooltip="t('pagePopups.preview')" @click="previewing = popup" />
            <ToolbarIconButton icon="mdi-pencil-outline" :tooltip="t('pagePopups.edit')" @click="sitePopups.edit(popup.id)" />
            <!-- The base package's popups stay (configs/default-popups.ts). -->
            <span v-if="BUILT_IN_POPUP_IDS.has(popup.id)" class="popups-built-in">{{ t('pagePopups.builtIn') }}</span>
            <v-progress-circular
              v-else-if="checking === popup.id"
              class="mx-2"
              indeterminate
              size="20"
              width="2"
            />
            <ToolbarIconButton v-else icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(popup)" />
          </div>
        </div>
      </template>

      <EditorSaveBar
        v-if="sitePopups.loaded.value"
        :dirty="sitePopups.dirty.value"
        :loading="saving"
        :undoing="undoing"
        @click="save"
        @undo="undo"
      >
        <template #prepend>
          <v-menu location="top">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                color="secondary"
                prepend-icon="mdi-plus"
                size="large"
                variant="outlined"
              >
                {{ t('pagePopups.add') }}
              </v-btn>
            </template>
            <v-list density="compact" theme="editorTheme">
              <v-list-item
                v-for="option of POPUP_PLACEMENTS"
                :key="option.value"
                :prepend-icon="option.icon"
                :title="t(option.label)"
                @click="add(option.value)"
              />
            </v-list>
          </v-menu>
        </template>
      </EditorSaveBar>

      <PopupEditorDialog />
      <PopupPreviewDialog :popup="previewing" @close="previewing = null" />
    </v-main>
  </v-app>
</template>

<style scoped>
.popups-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 16px;
  max-width: 900px;
}
.popups-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.popups-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.popups-icon {
  color: #7A8699;
}
.popups-names {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
}
.popups-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.popups-built-in {
  padding: 0 8px;
  font-size: 0.75rem;
  color: #7A8699;
  white-space: nowrap;
}
.popups-meta {
  font-size: 0.8rem;
  color: #7A8699;
}
</style>
