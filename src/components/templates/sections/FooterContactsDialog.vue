<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import ContactLineMenu from '@/components/editors/ContactLineMenu.vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import TextOnBackground from '@/components/editors/text/TextOnBackground.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { useFooterBackground } from '@/composables/useFooterBackground'
  import { useSiteContacts } from '@/composables/useSiteContacts'
  import { useSortableList } from '@/composables/useSortableList'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { emptyTranslatedModel, resolveLocaleText, setLocalizedContent } from '@/utils/locale-text'
  import { NON_COLOR_TEXT_CLASSES } from '@/utils/text-format-scale'

  // The footer's "contacts" list (phone numbers, addresses, anything else
  // with or without an icon) - reached via a click on the list itself in
  // FooterEditor.vue (edit mode), not shown inline there: readability
  // would suffer badly at the footer's own narrow column width and dark
  // background (confirmed - see the user's own screenshots), so editing
  // happens here instead, same reasoning MenuLinkDialog.vue's dialog exists
  // for link configuration. `section` is a live reference into the footer's
  // own reactive content tree (rightSection's one type:'section' child, see
  // FooterEditor.vue's contactsSection()) - mutated in place, same
  // convention as every other block editor in this app.
  const props = defineProps<{
    modelValue: boolean
    section: TemplateBlockModel
  }>()
  const emit = defineEmits<{
    'update:modelValue': [boolean]
    'delete-section': []
  }>()

  const commonStore = useCommonStore()
  const dragActive = ref(false)
  const { container } = useSortableList(() => props.section.children, dragActive)

  const siteContacts = useSiteContacts()
  function getText (item: TemplateBlockModel): string {
    // A contact line shows the contact from the general settings.
    return siteContacts.lineText(item.contact, commonStore.locale) ?? resolveLocaleText(item.content, commonStore.locale)
  }
  function setText (item: TemplateBlockModel, value: string | undefined) {
    if (item.contact) return
    setLocalizedContent(item, commonStore.locale, value || '')
  }

  // `section` is a live reference into the footer's own reactive content
  // tree (see this component's own top comment) - mutating it in place is
  // intentional, same convention as every other block editor in this app.
  //
  // Every contact item is type:'text-with-icon' now, icon included or not -
  // one "Додати" button, not a separate one per whether it happens to have
  // an icon. An icon is just an optional attribute of a contact item, added
  // or cleared via its own IconEditor.vue right here (see clearIcon()) -
  // not a different kind of item requiring its own add flow (was tried,
  // walked back: the earlier split also meant a plain 'text' item's own
  // class field lived in a different property than an icon item's, which
  // is exactly what caused this data's own real content to end up
  // inconsistent across older and newer entries).
  /* eslint-disable vue/no-mutating-props */
  function addItem () {
    props.section.children ??= []
    props.section.children.push({
      type: 'text-with-icon',
      icon: '',
      size: 18,
      text: 'default-text text-medium text-dark-grey',
      content: emptyTranslatedModel(),
    })
  }
  // A line showing one of the site's contacts (general settings).
  function addContact (line: TemplateBlockModel) {
    props.section.children ??= []
    props.section.children.push({ ...line, size: 18, text: 'default-text text-medium text-dark-grey' })
  }
  async function removeItem (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('contactsRow')) return
    props.section.children?.splice(index, 1)
  }
  /* eslint-enable vue/no-mutating-props */

  function clearIcon (item: TemplateBlockModel) {
    item.icon = ''
  }

  // Each entry is shown on the footer's own background (TextOnBackground).
  const footerBackground = useFooterBackground()

  // One colour for every entry at once - setting it entry by entry was the
  // tedious part. Only the colour class changes; each entry keeps its size,
  // weight and alignment, and can still get a colour of its own afterwards.
  const isColorClass = (name: string) => name.startsWith('text-') && !NON_COLOR_TEXT_CLASSES.has(name)
  function colorOf (item: TemplateBlockModel): string {
    const found = String(item.text ?? '').split(/\s+/).find(name => isColorClass(name))
    return found ? found.slice('text-'.length) : ''
  }
  // The colour every entry has, or '' when they differ.
  const sharedColor = computed(() => {
    const colors = new Set((props.section.children ?? []).map(item => colorOf(item)))
    return colors.size === 1 ? [...colors][0]! : ''
  })

  function setColorForAll (key: string) {
    for (const item of props.section.children ?? []) {
      const others = String(item.text ?? '').split(/\s+/).filter(name => name && !isColorClass(name))
      item.text = [...others, `text-${key}`].join(' ')
    }
  }

  const deleteConfirmOpen = ref(false)
  function confirmDeleteSection () {
    deleteConfirmOpen.value = false
    emit('delete-section')
    emit('update:modelValue', false)
  }
</script>

<template>
  <v-dialog max-width="640" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <v-card theme="editorTheme" title="Контакти">
      <v-card-text>
        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <v-btn prepend-icon="mdi-plus" size="small" variant="outlined" @click="addItem">
            Додати пункт
          </v-btn>
          <ContactLineMenu @insert="addContact">
            <template #activator="{ props: contactProps }">
              <v-btn v-bind="contactProps" prepend-icon="mdi-card-account-phone-outline" size="small" variant="outlined">
                {{ t('contacts.menu') }}
              </v-btn>
            </template>
          </ContactLineMenu>
          <ToolbarIconButton
            :active="dragActive"
            icon="mdi-cursor-move"
            tooltip="Переміщення"
            @click="dragActive = !dragActive"
          />
          <v-spacer />
          <span class="text-body-2">Колір тексту всіх пунктів</span>
          <PaletteSwatchPicker :model-value="sharedColor" no-transparent @update:model-value="setColorForAll" />
          <ToolbarIconButton color="error" icon="mdi-delete" tooltip="Видалити блок контактів" @click="deleteConfirmOpen = true" />
        </div>

        <div ref="container">
          <div v-for="(item, index) of section.children" :key="index" class="contacts-dialog-item">
            <!-- The entry as the footer shows it: its background, its styles. -->
            <TextOnBackground :background="footerBackground" class="contacts-dialog-preview">
              <IconEditor
                v-model:icon="item.icon"
                v-model:icon-background="item.background"
                v-model:icon-color="item.color"
                v-model:icon-size="item.size"
              />
              <!-- The entry's own class goes in, not just out: without it the
                editor started from its default one and wrote that back. -->
              <TextEditor
                :class="typeof item.text === 'string' ? item.text : ''"
                :content="getText(item)"
                parent-type="usual"
                :readonly="!!item.contact"
                type="text"
                @update:class="item.text = $event"
                @update:content="value => setText(item, value)"
              />
            </TextOnBackground>
            <!-- Kept in place (only hidden) without an icon, so every row's
              preview is the same width. -->
            <ToolbarIconButton
              icon="mdi-close"
              size="small"
              :style="{ visibility: item.icon ? 'visible' : 'hidden' }"
              tooltip="Прибрати іконку"
              @click="clearIcon(item)"
            />
            <ToolbarIconButton v-if="!dragActive" icon="mdi-delete" tooltip="Видалити" @click="removeItem(index)" />
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <LocaleSwitcher :scope="section" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="emit('update:modelValue', false)">ОК</v-btn>
      </v-card-actions>
    </v-card>

    <ConfirmDialog
      v-model="deleteConfirmOpen"
      text="Усі пункти контактів буде видалено. Цю дію не можна скасувати."
      title="Видалити блок контактів?"
      @confirm="confirmDeleteSection"
    />
  </v-dialog>
</template>

<style scoped>
.contacts-dialog-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}
.contacts-dialog-preview {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 12px;
}
</style>
