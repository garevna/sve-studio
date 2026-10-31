<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { textWithIcon } from '@/configs/components/simple/text-with-icon'
  import { defaultTextClass } from '@/configs/defaults/default-classes'
  import { textPlaceholder } from '@/configs/defaults/text-placeholder'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { resolveLocaleText, setLocalizedContent, translationHint } from '@/utils/locale-text'
  import TextEditor from './TextEditor.vue'
  import TextWithIconEditor from './TextWithIconEditor.vue'

  // Shared dialog for editing a *list* of text/header/title items - used
  // both by TemplateNestedSection.vue (a "section" child's text half, next
  // to the image) and SectionWithFreeContent.vue (a freely-added text
  // list). Both used to render every item inline, each with its own
  // TextFormatMenu cog right next to the others - fine for one field, but
  // several short items stacked tightly made the cogs crowd/overlap. This
  // gives each field the same room a standalone top-level text block gets
  // (own TextFormatMenu + delete, see TextEditor.vue's "deletable" prop),
  // just inside a dialog instead of squeezed into the page - one component,
  // one interaction pattern, wherever a list of text fields needs editing.
  const commonStore = useCommonStore()

  // formattable needs an explicit runtime default: a boolean-typed prop
  // with no default casts an absent value to `false` (not `undefined`),
  // which would otherwise silently strip formatting from every caller that
  // doesn't pass this explicitly (TemplateNestedSection.vue,
  // SectionWithFreeContent.vue) - see TextEditor.vue's matching comment.
  //
  // groupUniformActive/newItemClass: only ever passed by CardWithToolbarImage.vue
  // - when its enclosing group already forces every card's text items to one
  // shared class (see card-with-toolbar-image-format-sync.ts), the per-card
  // "sync my own paragraphs" checkbox below would be redundant, so it's
  // hidden while this is true. newItemClass seeds a freshly-added paragraph
  // with the group's current shared class instead of the hardcoded default,
  // so it matches immediately instead of standing out until reformatted.
  const props = withDefaults(defineProps<{
    modelValue: boolean
    children: TemplateBlockModel[]
    formattable?: boolean
    groupUniformActive?: boolean
    newItemClass?: string
    // Texts with an icon can be added too (a card with an image on top,
    // for contacts: a phone, an address...).
    withIcons?: boolean
  }>(), {
    formattable: true,
  })
  const emit = defineEmits<{ 'update:modelValue': [boolean], 'class-change': [child: TemplateBlockModel, value: string] }>()

  const syncTextFormat = defineModel<boolean>('syncTextFormat', { default: false })

  const textItemCount = computed(() => props.children.filter(child => child.type === 'text').length)
  const firstTextIndex = computed(() => props.children.findIndex(child => child.type === 'text'))
  const showSyncCheckbox = computed(() => !props.groupUniformActive && textItemCount.value >= 2)

  function getText (child: TemplateBlockModel) {
    return resolveLocaleText(child.content, commonStore.locale)
  }
  function setText (child: TemplateBlockModel, value: string | undefined) {
    setLocalizedContent(child, commonStore.locale, value || '')
  }
  // Every format-panel edit lands here (instead of a plain v-model:class) so
  // it can both report upward (CardWithToolbarImage.vue's own cross-card
  // group sync) and, when the per-card checkbox is on, copy the new class to
  // this card's other text items too - re-emitting for each of those keeps
  // the group-level sync converged even with both toggles on at once.
  function onClassChange (child: TemplateBlockModel, value: string) {
    child.class = value
    emit('class-change', child, value)
    if (child.type === 'text' && syncTextFormat.value) {
      for (const sibling of props.children.filter(item => item.type === 'text' && item !== child)) {
        sibling.class = value
        emit('class-change', sibling, value)
      }
    }
  }
  // Only plain text can be added here for now - matches SectionWithFreeContent's
  // existing scope; images/icons/components join this dialog later.
  function addText () {
    // eslint-disable-next-line vue/no-mutating-props
    props.children.push({ type: 'text', content: textPlaceholder(), class: props.newItemClass || 'default-text text-medium' })
  }
  function addTextWithIcon () {
    // eslint-disable-next-line vue/no-mutating-props
    props.children.push({ ...textWithIcon(), content: textPlaceholder(), text: props.newItemClass || defaultTextClass } as TemplateBlockModel)
  }
  // A text with an icon keeps its text's format in `text` (the class), the
  // same field TemplateItem.vue edits for a standalone one.
  function iconTextClass (child: TemplateBlockModel) {
    return typeof child.text === 'string' ? child.text : ''
  }

  async function removeText (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('text')) return
    // eslint-disable-next-line vue/no-mutating-props
    props.children.splice(index, 1)
  }
</script>

<template>
  <v-dialog
    max-width="560"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="editor-dialog editable-text-section-dialog" theme="editorTheme">
      <v-toolbar color="#ddd">
        <v-toolbar-title class="editable-text-section-dialog-title">
          Редагування тексту
        </v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" tooltip="Закрити" @click="emit('update:modelValue', false)" />
      </v-toolbar>
      <!-- <v-card-title class="editable-text-section-dialog-title">Редагування тексту</v-card-title> -->
      <v-card-text>
        <template v-for="(child, index) of children" :key="index">
          <v-checkbox
            v-if="showSyncCheckbox && index === firstTextIndex"
            v-model="syncTextFormat"
            class="mb-2"
            density="compact"
            hide-details
            label="Однаковий формат для всіх пунктів"
          />
          <div class="editable-text-section-item">
            <TextEditor
              v-if="child.type === 'text' || child.type === 'header' || child.type === 'title'"
              v-model:type="child.type"
              :class="child.class"
              :content="getText(child)"
              deletable
              :formattable="props.formattable"
              :missing-translation="translationHint(child.content, commonStore.locale)"
              parent-type="usual"
              @delete="removeText(index)"
              @update:class="value => onClassChange(child, value)"
              @update:content="value => setText(child, value)"
            />
            <TextWithIconEditor
              v-else-if="child.type === 'text-with-icon'"
              v-model:icon="child.icon"
              v-model:icon-background="child.background"
              v-model:icon-color="child.color"
              v-model:icon-size="child.size"
              v-model:link="child.link"
              deletable
              :text="getText(child)"
              :text-class="iconTextClass(child)"
              @delete="removeText(index)"
              @update:text="value => setText(child, value)"
              @update:text-class="value => child.text = value"
            />
          </div>
        </template>
        <div class="editable-text-section-add">
          <v-btn
            class="mt-2"
            prepend-icon="mdi-plus"
            variant="outlined"
            @click="addText"
          >
            Додати текст
          </v-btn>
          <v-btn
            v-if="withIcons"
            class="mt-2"
            prepend-icon="mdi-image-text"
            variant="outlined"
            @click="addTextWithIcon"
          >
            Текст з іконкою
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <LocaleSwitcher :scope="children" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="emit('update:modelValue', false)">ОК</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.editable-text-section-dialog {
  position: relative;
}
.editable-text-section-dialog-done {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
}
.editable-text-section-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #555;
  /* The "Готово" button floats over the card's top-right corner (see above)
     - pushing the title below that row instead of relying on horizontal
     spacing keeps this safe regardless of how long the title text gets. */
  /* padding-top: 40px; */
}
.editable-text-section-add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.editable-text-section-add > .v-btn {
  flex: 1 1 200px;
}
.editable-text-section-item {
  margin-bottom: 12px;
}
</style>
