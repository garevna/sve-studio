<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import TextWithIconEditor from '@/components/editors/text/TextWithIconEditor.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSiteContacts } from '@/composables/useSiteContacts'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'

  // A text with an icon inside a card, as the site shows it. It is edited in
  // the card's own text window (EditableTextSection.vue), so here it is
  // always drawn in preview - the same component, without its controls.
  const props = defineProps<{ item: TemplateBlockModel }>()
  provideEditorMode(computed(() => 'preview'))
  const commonStore = useCommonStore()
  const siteContacts = useSiteContacts()
</script>

<template>
  <TextWithIconEditor
    :icon="props.item.icon || ''"
    :icon-background="props.item.background || ''"
    :icon-color="props.item.color || 'grey'"
    :icon-size="props.item.size || 24"
    :text="siteContacts.lineText(props.item.contact, commonStore.locale) ?? resolveLocaleText(props.item.content, commonStore.locale)"
    :text-class="typeof props.item.text === 'string' ? props.item.text : ''"
  />
</template>
