<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import CardSet from '@/components/templates/cards/CardSet.vue'
  import TemplateFlexSection from '@/components/templates/sections/TemplateFlexSection.vue'
  import TemplateNestedSection from '@/components/templates/sections/TemplateNestedSection.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // One block drawn exactly as the site draws it, away from the page - in
  // the site's own stylesheets, palette and fonts (the same scope and theme
  // classes the page has), never with editing controls. For the block
  // gallery's previews.
  const props = defineProps<{ block: TemplateBlockModel }>()

  provideEditorMode(computed<EditorMode>(() => 'preview'))

  // The page's hero is drawn by the page itself, not by a block component;
  // as a picture it is the same thing as a parallax inside the page.
  const shown = computed<TemplateBlockModel>(() =>
    props.block.type === 'parallax' ? { ...props.block, type: 'parallax-inside' } : props.block)
  const asList = computed(() => [shown.value])
</script>

<template>
  <div :class="[EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
    <v-theme-provider :theme="APP_THEME_NAME">
      <div v-if="shown.type === 'section'" class="d-flex flex-wrap align-center">
        <TemplateNestedSection :block="shown" :block-index="-1" />
      </div>
      <TemplateFlexSection v-else-if="shown.type === 'float'" :section="shown" />
      <CardSet v-else-if="shown.type === 'cards'" :item="shown" />
      <TemplateItem v-else :block-index="0" :blocks="asList" />
    </v-theme-provider>
  </div>
</template>
