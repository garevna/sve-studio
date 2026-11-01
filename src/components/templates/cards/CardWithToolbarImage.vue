<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref, watch } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import EditableTextSection from '@/components/editors/text/EditableTextSection.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import CardTextWithIcon from '@/components/templates/cards/CardTextWithIcon.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSiteContacts } from '@/composables/useSiteContacts'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { applyHeightToGroup, applyTextClassToGroup, applyTitleClassToGroup } from '@/utils/card-with-toolbar-image-format-sync'
  import { resolveLocaleText } from '@/utils/locale-text'

  // A fragment (multi-root) template can't auto-inherit fallthrough attrs
  // like `class` - Vue has no way to guess which of the two roots
  // (.card-with-toolbar-image vs. EditableTextSection's own dialog) should
  // receive it, so it warns and drops the attr entirely. Taking manual
  // control below (inheritAttrs: false + binding $attrs.class explicitly
  // onto .card-with-toolbar-image, the one root that's actual page content)
  // both silences that warning and actually applies TemplateItem.vue's
  // displayClass, which the auto-inherit path would have silently lost.
  defineOptions({ inheritAttrs: false })

  const commonStore = useCommonStore()
  const siteContacts = useSiteContacts()

  const mode = useEditorMode()
  const ajaxStore = useAjaxStore()
  const blockActionsTarget = useBlockActionsTarget()

  type PropsModel = {
    card: TemplateBlockModel
    // The parent "float" block (only set when this card is part of a
    // card-with-toolbar-image group - see TemplateFlexSection.vue/
    // TemplateItem.vue) - gives access to sibling cards and the group's
    // shared-format toggle for card-with-toolbar-image-format-sync.ts.
    group?: TemplateBlockModel
    // pageBlockIndex: number
    // childIndex?: number | null
    // grandchildIndex?: number | null
  }

  const props = defineProps<PropsModel>()

  // Default true when the group toggle is unset - matches the "shared by
  // default" expectation (see CardWithToolbarImageGroupActions.vue).
  const uniformActive = computed(() => props.group ? props.group.uniformCardFormat !== false : false)

  // Seeds a freshly-added paragraph (EditableTextSection.vue's "Додати
  // текст") with the group's current shared class, so it matches
  // immediately instead of standing out with the hardcoded default until
  // someone happens to reformat it.
  const referenceTextClass = computed(() =>
    props.group?.children?.[0]?.children?.find(child => child.type === 'text')?.class)

  function onHeightChange (value: number) {
    // eslint-disable-next-line vue/no-mutating-props
    props.card.height = value
    if (uniformActive.value && props.group) applyHeightToGroup(props.group, value, props.card)
  }

  function onClassChange (child: TemplateBlockModel, value: string) {
    if (!uniformActive.value || !props.group) return
    if (child.type === 'title') applyTitleClassToGroup(props.group, value, props.card)
    else if (child.type === 'text') applyTextClassToGroup(props.group, value, props.card)
  }

  function onSyncTextFormatChange (value: boolean) {
    // eslint-disable-next-line vue/no-mutating-props
    props.card.syncTextFormat = value
  }

  const imageSrc = computed({
    get: () => ajaxStore.getImageURL(props.card.image || ''),
    // `card` is deliberately a live reference into the page's own reactive
    // content tree (same pattern as CardContainerActions.vue, HeroParallax.vue).
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.card.image = value
    },
  })

  const imageFailed = ref(false)
  watch(imageSrc, () => {
    imageFailed.value = false
  })

  // Text under the toolbar image is edited through the same dialog-based
  // "list of text fields" pattern as everywhere else (see
  // EditableTextSection.vue, TemplateNestedSection.vue, HeroParallax.vue) -
  // a single pencil fab opens a dialog where each field gets its own
  // TextFormatMenu + delete, plus an "Додати текст" button. Production
  // reads card.children as an arbitrary-length ordered list of title/text
  // items (unlike HeroParallax's fixed header/title/text roles), so free
  // add/remove here is fully supported, not just a UI convenience.
  const textDialogOpen = ref(false)
  function openTextDialog () {
    // eslint-disable-next-line vue/no-mutating-props
    props.card.children ??= []
    textDialogOpen.value = true
  }
</script>

<template>
  <!-- Matches production's own CardWithToolbarImage.vue exactly (plain div,
  "card-with-toolbar-image" class - see common.css - not a v-card, no
  padding of its own) so the preview is pixel-faithful: height:100% lets
  it stretch to match its row siblings inside a flex container with
  align-items:stretch (see TemplateFlexSection.vue + TemplateItem.vue's
  own height:100% wrapper), and padding:0 lets the toolbar/image reach
  the card's rounded top corners flush, instead of the editor-only
  ".bordered-section" class's 20px padding insetting everything. This must
  be the template's actual ROOT (no extra wrapping div around it) - an
  unstyled wrapper has no height of its own, which breaks the height:100%
  percentage chain right here even though every ancestor above it resolves
  correctly (confirmed via DevTools: the old wrapper's computed height was
  auto, so this div's height:100% silently fell back to auto/content-sized
  too, same as CSS's "percentage height needs a definite-height containing
  block" rule always implies). Vue 3 templates support multiple roots, so
  EditableTextSection below is a plain sibling, not nested inside a wrapper. -->
  <div :class="['card-with-toolbar-image', $attrs.class]" :style="{ width: (card.width || 360) + 'px', height: '100%' }">
    <v-toolbar
      :class="['rounded-toolbar', { 'image-placeholder-bg': !card.image || imageFailed }]"
      color="transparent"
      flat
      :height="card.height || 200"
    >
      <template
        v-if="mode === 'preview'"
      >
        <v-img
          class="rounded-toolbar"
          cover
          :src="imageSrc"
          @error="imageFailed = true"
        />
      </template>
      <template v-else>
        <image-editor
          v-model:src="imageSrc"
          :height="card.height as number"
          :resize="false"
          :width="card.width + 'px'"
          @update:height="onHeightChange"
        />
      </template>
    </v-toolbar>
    <!-- One box for all the lines, as on the site: the space between two
      lines is the gap below the upper one (mb-*, "Відступ знизу" in its
      format panel). -->
    <v-card-text class="card-lines">
      <template v-for="(child, index) of card.children" :key="index">
        <h3 v-if="child.type === 'title'" :class="['text-center', child.class]">{{ resolveLocaleText(child.content, commonStore.locale) }}</h3>
        <p v-else-if="child.type === 'text'" :class="child.class">{{ siteContacts.lineText(child.contact, commonStore.locale) ?? resolveLocaleText(child.content, commonStore.locale) }}</p>
        <CardTextWithIcon v-else-if="child.type === 'text-with-icon'" :item="child" />
        <hr v-else-if="child.type === 'divider'" :class="['card-divider', child.class]" :style="{ borderColor: `var(--${child.color || 'light-grey-1'})` }">
      </template>
    </v-card-text>
    <template v-if="mode === 'edit'">
      <Teleport v-if="blockActionsTarget" :to="blockActionsTarget">
        <ToolbarIconButton icon="mdi-pencil" tooltip="Редагувати тексти картки" @click="openTextDialog" />
      </Teleport>
      <v-fab
        v-else
        absolute
        class="ma-2"
        color="#09b"
        icon="mdi-pencil"
        location="bottom end"
        size="default"
        title="Редагувати текст"
        @click="openTextDialog"
      />
    </template>
  </div>
  <EditableTextSection
    v-if="card.children"
    v-model="textDialogOpen"
    card-lines
    :children="card.children"
    :group-uniform-active="uniformActive"
    :new-item-class="referenceTextClass"
    :sync-text-format="card.syncTextFormat"
    with-icons
    @class-change="onClassChange"
    @update:sync-text-format="onSyncTextFormatChange"
  />
</template>

<style scoped>
  .rounded-toolbar {
    border-radius: var(--v-default-border-radius) var(--v-default-border-radius) 0 0 !important;
  }
  .card-with-toolbar-image {
    position: relative;
  }
  .card-lines > * {
    margin-top: 0;
  }
  .card-divider {
    border: none;
    border-top: solid 1px;
  }
</style>
