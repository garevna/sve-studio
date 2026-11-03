<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSiteContacts } from '@/composables/useSiteContacts'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'
  import FooterContactsActions from './FooterContactsActions.vue'
  import FooterContactsDialog from './FooterContactsDialog.vue'

  // The contacts list as ONE self-contained footer building block, extracted
  // out of FooterEditor.vue's hardcoded right column. That extraction is
  // the point: as long as the rows were loose children of the column, they
  // inherited the column's own uniform gap, so contacts sat as far apart as
  // whole footer blocks do. Owning its own container means it owns its own
  // (much tighter) spacing, and the footer constructor can drop it into any
  // section without that section having to know anything about contacts.
  //
  // `section` stays a plain type:'section' block whose children are
  // text-with-icon rows - the exact shape FooterContactsDialog already edits
  // and the exact shape already sitting in footer-content.json. Keeping it
  // means this component is a pure extraction with no data migration: the
  // constructor recognises the block by its own id marker rather than by a
  // new type nobody's content has yet.
  //
  // It is a live reference into the page's own reactive content tree (same
  // convention as DarkFoneSection.vue's `section`) - the dialog mutates it
  // in place.
  const props = defineProps<{
    section: TemplateBlockModel
    // Renders read-only even in edit mode - used while the footer's sections
    // are being rearranged or resized, so what's on screen during those
    // gestures is exactly what a visitor will see.
    preview?: boolean
  }>()
  const emit = defineEmits<{ 'delete-section': [] }>()

  const commonStore = useCommonStore()
  const mode = useEditorMode()
  const editing = computed(() => mode.value === 'edit' && !props.preview)

  const dialogOpen = defineModel<boolean>('dialogOpen', { default: false })

  const siteContacts = useSiteContacts()
  function getText (item: TemplateBlockModel): string {
    return siteContacts.lineText(item.contact, commonStore.locale) ?? resolveLocaleText(item.content, commonStore.locale)
  }

  // A row without an icon still reserves the icon column, sized to whatever
  // the nearest row ABOVE it uses (falling back to 48, text-with-icon's own
  // default) - so text stays aligned down the whole list instead of
  // stepping left on every icon-less row.
  function iconSize (index: number): number {
    const items = props.section.children ?? []
    const item = items[index]
    if (item?.icon) return item.size || 48
    for (let i = index - 1; i >= 0; i--) {
      const prev = items[i]
      if (prev?.icon) return prev.size || 48
    }
    return 48
  }
</script>

<template>
  <!-- The block owns its own chrome: a real toolbar with everything that
    acts on the whole list (edit the entries, format all of them) and, apart
    on the right, its delete. The delete used to float in the column's own
    corner, where it read as belonging to the column rather than to this
    block - the whole reason it moved here. -->
  <EditableBlockWrapper v-if="editing" type="block">
    <template #actions>
      <FooterContactsActions :block="section" @edit="dialogOpen = true" />
    </template>
    <template #delete>
      <ToolbarIconButton icon="mdi-delete" :tooltip="t('common.deleteBlock')" @click="emit('delete-section')" />
    </template>

    <!-- Edited in a dialog, not inline: at this column's width, on a dark
      background, inline fields are unreadable (see FooterContactsDialog's
      own comment). The list itself renders identically in both modes. -->
    <div class="footer-contacts-list">
      <div
        v-for="(item, index) of section.children"
        :key="index"
        class="footer-contact-row"
        :style="{ '--icon-size': iconSize(index) + 'px' }"
      >
        <v-icon
          v-if="(item.icon || '').startsWith('mdi-')"
          :color="item.color ? `var(--${item.color})` : undefined"
          :size="item.size || 48"
        >
          {{ item.icon }}
        </v-icon>
        <img v-else-if="item.icon" :height="item.size || 48" :src="item.icon">
        <span v-else />
        <p :class="(typeof item.text === 'string' ? item.text : '') || 'default-text text-medium text-dark-grey'">
          {{ getText(item) }}
        </p>
      </div>
    </div>

    <FooterContactsDialog
      v-model="dialogOpen"
      :section="section"
      @delete-section="emit('delete-section')"
    />
  </EditableBlockWrapper>

  <div v-else class="footer-contacts-list">
    <div
      v-for="(item, index) of section.children"
      :key="index"
      class="footer-contact-row"
      :style="{ '--icon-size': iconSize(index) + 'px' }"
    >
      <v-icon
        v-if="(item.icon || '').startsWith('mdi-')"
        :color="item.color ? `var(--${item.color})` : undefined"
        :size="item.size || 48"
      >
        {{ item.icon }}
      </v-icon>
      <img v-else-if="item.icon" :height="item.size || 48" :src="item.icon">
      <span v-else />
      <p :class="(typeof item.text === 'string' ? item.text : '') || 'default-text text-medium text-dark-grey'">
        {{ getText(item) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* The whole reason this is its own component: one container gap for every
   contact entry, tight and independent of the footer column's own spacing
   between blocks. A single mechanism (container gap) rather than per-item
   margins, so rows read as evenly spaced whatever type they are. */
.footer-contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* Matches client-side's own templates/components/TextWithIcon.vue layout -
   the same icon-column grid production uses. Applied to EVERY row, not just
   ones with an icon (an empty <span> fills the icon cell instead): a bare
   <p> as a flex sibling of these grid rows was what collapsed the icon rows
   to a sliver. width:100% and the text cell's min-width:0 are defensive
   rather than cosmetic - without them a long phone number forces the grid
   wider than its column. */
.footer-contact-row {
  display: grid;
  grid-template-columns: var(--icon-size) 1fr;
  column-gap: 16px;
  align-items: center;
  width: 100%;
}
.footer-contact-row p {
  min-width: 0;
  margin: 0;
}
.footer-contact-row img {
  vertical-align: middle;
}
</style>
