<script lang="ts" setup>
  import type { PopupUsePlace } from '@/composables/useSitePopups'
  import type { PopupCalendarModel, PopupModel } from '@/types/TemplateBlockModel'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import CalendarVariantPicker from '@/components/editors/popups/CalendarVariantPicker.vue'
  import PopupEditPanel from '@/components/editors/popups/PopupEditPanel.vue'
  import PopupPreviewDialog from '@/components/editors/popups/PopupPreviewDialog.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { BUILT_IN_POPUP_IDS } from '@/configs/default-popups'
  import { ADDABLE_POPUP_KINDS, POPUP_KIND_ICONS, popupKind } from '@/configs/popup-kinds'
  import { newCalendar } from '@/configs/popup-looks'
  import { POPUP_PLACEMENTS } from '@/configs/popup-placements'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // The editor's "Попапи": every popup of the site. All of them are the
  // same frame (content/styles/popups.css) - a title, the close cross, a
  // text, their own middle, a row of buttons - and differ in what they are
  // for (configs/popup-kinds.ts): a message, a confirmation, a field, a
  // list, a date, blocks, or one of the base package's forms. Any button on
  // any page can open any of them - linked in that button's settings
  // ("Що робить кнопка"), or the popup is started there and finished here.
  // How they look - the frame, the buttons, the formats, the calendar - is
  // the client's set in the UI Kit ("Попапи", "Календар"); here a popup
  // picks one of it by name and gets its words.
  //
  // A popup is edited under its own row, opened like a button's in the UI
  // Kit (PopupEditPanel.vue) - the editor's fields, then the popup itself;
  // the bar at the bottom saves. A button's settings on a page send here
  // with ?edit=<id> (and ?from=<page>, which the back arrow returns to).
  const sitePopups = useSitePopups()
  const route = useRoute()
  const backTo = computed(() => (typeof route.query.from === 'string' && route.query.from.startsWith('/') ? route.query.from : '/'))
  const expanded = computed(() => sitePopups.editing.value?.id ?? null)
  function toggle (id: string) {
    sitePopups.edit(expanded.value === id ? null : id)
  }
  const saving = ref(false)
  // the popup being looked at as a visitor sees it
  const previewing = ref<PopupModel | null>(null)
  const undoing = ref(false)

  onMounted(async () => {
    await sitePopups.load()
    sitePopups.edit(typeof route.query.edit === 'string' ? route.query.edit : null)
  })

  function placementOf (popup: PopupModel) {
    return POPUP_PLACEMENTS.find(option => option.value === popup.placement) ?? POPUP_PLACEMENTS[0]!
  }

  // A date popup starts with its calendar's variant (CalendarVariantPicker):
  // only once one is picked are the popup's settings opened. A variant the
  // client's set has no model of yet gets one.
  const pickingCalendar = ref(false)
  function add (option: typeof ADDABLE_POPUP_KINDS[number]) {
    if (option.kind === 'date') {
      pickingCalendar.value = true
      return
    }
    sitePopups.edit(sitePopups.create(option.kind, option.placement).id)
  }
  function addDate (variant: PopupCalendarModel['variant']) {
    let calendar = sitePopups.calendars.value.find(item => item.variant === variant)
    if (!calendar) {
      calendar = newCalendar(variant, t(`calendars.variants.${variant}`), sitePopups.newId('calendar'))
      sitePopups.calendars.value.push(calendar)
    }
    const popup = sitePopups.create('date', 'center')
    popup.calendar = calendar.id
    sitePopups.edit(popup.id)
  }

  // What a row says under the name: its kind, where it appears and - for
  // blocks - how many.
  function metaOf (popup: PopupModel): string {
    const kind = popupKind(popup)
    const parts = [t(`pagePopups.kinds.${kind}`), t(placementOf(popup).label)]
    if (kind === 'content' || kind === 'form') {
      parts.push(t('pagePopups.blocks', { count: popup.content.children?.length ?? 0 }))
    }
    return parts.join(' · ')
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
      <EditorPageHeader :back-to="backTo" :title="t('pagePopups.list')" />

      <p class="popups-hint">{{ t('pagePopups.hint') }}</p>
      <v-progress-linear v-if="!sitePopups.loaded.value" color="primary" indeterminate />
      <template v-else>
        <p v-if="sitePopups.popups.value.length === 0" class="mb-6">{{ t('pagePopups.none') }}</p>
        <div class="popups-list">
          <div v-for="popup of sitePopups.popups.value" :key="popup.id" class="popups-row">
            <div class="popups-row-head" @click="toggle(popup.id)">
              <v-icon class="popups-icon" :icon="POPUP_KIND_ICONS[popupKind(popup)]" />
              <div class="popups-names">
                <span class="popups-name">{{ popup.name }}</span>
                <span class="popups-meta">{{ metaOf(popup) }}</span>
              </div>
              <div class="popups-actions" @click.stop>
                <ToolbarIconButton icon="mdi-eye-outline" :tooltip="t('pagePopups.preview')" @click="previewing = popup" />
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
                <ToolbarIconButton
                  :icon="expanded === popup.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  :tooltip="t('pagePopups.edit')"
                  @click="toggle(popup.id)"
                />
              </div>
            </div>
            <v-expand-transition>
              <div v-if="expanded === popup.id" class="popups-row-body">
                <PopupEditPanel :entry="popup" />
              </div>
            </v-expand-transition>
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
                v-for="option of ADDABLE_POPUP_KINDS"
                :key="option.kind"
                :prepend-icon="option.icon"
                :subtitle="t(`pagePopups.returns.${option.kind}`)"
                :title="t(`pagePopups.kinds.${option.kind}`)"
                @click="add(option)"
              />
            </v-list>
          </v-menu>
        </template>
      </EditorSaveBar>

      <PopupPreviewDialog :popup="previewing" @close="previewing = null" />
      <CalendarVariantPicker v-model="pickingCalendar" @pick="addDate" />
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
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.popups-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
}
.popups-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.popups-row-body {
  padding: 4px 12px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.06);
}
.popups-icon {
  color: #7A8699;
}
.popups-names {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
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
