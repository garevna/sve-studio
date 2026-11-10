<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import LinkTargetSettings from '@/components/special/LinkTargetSettings.vue'
  import FeedbackCardDialog from '@/components/templates/sections/FeedbackCardDialog.vue'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { feedbackFormTexts } from '@/configs/components/feedback-form'
  import { ADDABLE_POPUP_KINDS } from '@/configs/popup-kinds'
  import { t } from '@/i18n'

  // What a click on a button does: go to a page (or a block on it - the
  // form on the contacts page, say), open the feedback form, or open one of
  // the site's popups (useSitePopups, the editor's "Попапи" section) -
  // picked by the name the client gave it, or started right here. The form has its own texts, set in the same
  // window the footer's card uses. Shared by every kind of button
  // (ButtonEditor, IconButtonEditor) - they differ in what they show, not in
  // what they do.
  //
  // `block` is a live reference into the page's content, edited in place.
  const props = defineProps<{
    block: TemplateBlockModel
    // The settings window is open: the link fields re-read the block.
    active: boolean
  }>()

  const sitePopups = useSitePopups()
  void sitePopups.load()

  const formOpen = ref(false)
  type Action = 'link' | 'form' | 'popup'
  const action = computed({
    get: (): Action => (props.block.action === 'form' || props.block.action === 'popup' ? props.block.action : 'link'),
    set: (value: Action) => {
      /* eslint-disable vue/no-mutating-props -- the block is edited in place, see above */
      if (value === 'form') {
        props.block.action = 'form'
        props.block.form ??= feedbackFormTexts()
      } else if (value === 'popup') {
        props.block.action = 'popup'
        props.block.popup ??= sitePopups.popups.value[0]?.id
      } else {
        delete props.block.action
      }
      /* eslint-enable vue/no-mutating-props */
    },
  })

  const popupId = computed({
    get: () => props.block.popup ?? null,
    set: (value: string | null) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.popup = value ?? undefined
    },
  })

  function createPopup (option: typeof ADDABLE_POPUP_KINDS[number]) {
    const popup = sitePopups.create(option.kind, option.placement)
    popupId.value = popup.id
    openPopup(popup.id)
  }

  // A popup is edited in its own section, under its row (PopupsView.vue);
  // the back arrow there returns to this page. The page's draft is saved on
  // the way out (EditorView.vue).
  const router = useRouter()
  const route = useRoute()
  function openPopup (id: string) {
    void router.push({ path: '/popups', query: { edit: id, from: route.fullPath } })
  }
</script>

<template>
  <p class="button-action-label mb-2">{{ t('buttonEditor.action') }}</p>
  <v-btn-toggle
    v-model="action"
    class="mb-6 button-action-toggle"
    color="primary"
    density="compact"
    mandatory
    variant="outlined"
  >
    <v-btn prepend-icon="mdi-link-variant" value="link">{{ t('buttonEditor.toPage') }}</v-btn>
    <!-- The form is a popup now (the feedback popup every site starts
      with); a button from before keeps showing what it does. -->
    <v-btn v-if="props.block.action === 'form'" prepend-icon="mdi-message-text-outline" value="form">{{ t('buttonEditor.opensForm') }}</v-btn>
    <v-btn prepend-icon="mdi-dock-window" value="popup">{{ t('pagePopups.opensPopup') }}</v-btn>
  </v-btn-toggle>

  <!-- The same three fields the menu and the footer's links use - a page,
    and optionally one block on it to scroll to. -->
  <LinkTargetSettings v-if="action === 'link'" :active="props.active" auto :item="props.block" />
  <template v-else-if="action === 'form' && props.block.form">
    <p class="text-body-2 mb-3">{{ t('buttonEditor.formHint') }}</p>
    <v-btn prepend-icon="mdi-playlist-edit" variant="tonal" @click="formOpen = true">{{ t('buttonEditor.formTexts') }}</v-btn>
    <FeedbackCardDialog v-model="formOpen" :card="props.block.form" />
  </template>
  <template v-else-if="action === 'popup'">
    <div class="button-action-popup">
      <v-select
        v-if="sitePopups.popups.value.length > 0"
        v-model="popupId"
        density="compact"
        hide-details
        item-title="name"
        item-value="id"
        :items="sitePopups.popups.value"
        :label="t('pagePopups.which')"
        variant="outlined"
      />
      <v-btn
        v-if="popupId"
        prepend-icon="mdi-pencil-outline"
        variant="tonal"
        @click="openPopup(popupId)"
      >
        {{ t('pagePopups.edit') }}
      </v-btn>
    </div>
    <p class="button-action-label mt-4 mb-2">{{ t('pagePopups.createFor') }}</p>
    <div class="button-action-placements">
      <v-btn
        v-for="option of ADDABLE_POPUP_KINDS"
        :key="option.kind"
        :prepend-icon="option.icon"
        size="small"
        variant="outlined"
        @click="createPopup(option)"
      >
        {{ t(`pagePopups.kinds.${option.kind}`) }}
      </v-btn>
    </div>
  </template>
</template>

<style scoped>
.button-action-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.button-action-toggle {
  flex-wrap: wrap;
  height: auto;
}
.button-action-popup {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.button-action-popup > .v-select {
  flex: 1 1 220px;
}
.button-action-placements {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
