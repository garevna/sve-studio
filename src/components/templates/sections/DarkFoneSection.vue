<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSortableList } from '@/composables/useSortableList'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText } from '@/utils/locale-text'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'

  const commonStore = useCommonStore()
  const mode = useEditorMode()
  // `section` is a live reference into the page's own reactive content tree
  // (see DynamicPageTemplate.vue), same as every other section/card editor
  // in this codebase - mutating it in place below is intentional.
  const props = defineProps<{ section: TemplateBlockModel }>()

  // Background swatch and "Додати картку" live in DarkFoneSectionActions.vue
  // now (rendered into EditableBlockWrapper's #actions slot by
  // DynamicPageTemplate.vue), not here - same split CardWithHoverGroupActions.vue
  // uses for its own group. dragActive is owned by that same component's
  // toggle button; this component only consumes it to wire up the actual
  // Sortable instance, matching TemplateFlexSection.vue's convention.
  const dragActive = defineModel<boolean>('dragActive', { default: false })
  const { container: cardsContainer } = useSortableList(() => props.section.children, dragActive)

  function setTranslatedField (target: TemplateBlockModel, key: 'title' | 'text', value: string | undefined) {
    if (!isTranslatedModel(target[key])) {
      target[key] = emptyTranslatedModel()
    }

    (target[key] as TranslatedModel)[commonStore.locale] = value || ''
  }

  // TextEditor requires a v-model:class target, but nothing here has a real
  // per-field class in the saved model - the preview below always applies
  // its own fixed classes regardless of what any TextEditor instance is
  // given. formattable=false hides the format menu that would otherwise
  // write through this (see TextEditor.vue's own comment on that prop), so
  // this only ever absorbs its harmless one-time default-class write on
  // mount - safe to share across every TextEditor instance below rather
  // than needing one real ref per section/card field.
  const noopClassModel = computed({ get: () => '', set: () => {} })

  function isMdiIcon (icon: unknown): boolean {
    return typeof icon === 'string' && icon.startsWith('mdi-')
  }

  async function removeCard (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('card')) return
    // eslint-disable-next-line vue/no-mutating-props
    props.section.children?.splice(index, 1)
  }
</script>

<template>
  <div
    :class="[section.class || 'my-16 pa-10', { 'dark-fone-section--edit': mode === 'edit' }]"
    :style="{ background: `var(--${props.section.background || 'primary'})`, color: 'var(--white)', borderRadius: 'var(--v-default-border-radius)' }"
  >
    <template v-if="mode === 'edit'">
      <TextEditor
        v-model:class="noopClassModel"
        :content="resolveLocaleText(section.title, commonStore.locale)"
        :formattable="false"
        parent-type="usual"
        type="header"
        @update:content="(value) => setTranslatedField(section, 'title', value)"
      />
      <div class="mt-2">
        <TextEditor
          v-model:class="noopClassModel"
          :content="resolveLocaleText(section.text, commonStore.locale)"
          :formattable="false"
          parent-type="usual"
          type="text"
          @update:content="(value) => setTranslatedField(section, 'text', value)"
        />
      </div>

      <div ref="cardsContainer" class="d-flex flex-wrap justify-center gc-7 gr-16 w-100 mt-10">
        <div
          v-for="(child, index) of section.children"
          :key="index"
          :class="['dark-fone-editor-card', { 'dark-fone-editor-card--drag-cursor': dragActive }]"
        >
          <v-btn
            v-if="!dragActive"
            class="dark-fone-editor-card__delete"
            density="comfortable"
            icon="mdi-delete"
            size="small"
            title="Видалити картку"
            variant="flat"
            @click="removeCard(index)"
          />
          <div :class="{ 'dark-fone-editor-card__content--drag-active': dragActive }">
            <IconEditor
              v-model:icon="child.icon"
              v-model:icon-background="child.background"
              v-model:icon-color="child.color"
              v-model:icon-size="child.size"
            />
            <div class="mt-4 w-100">
              <TextEditor
                v-model:class="noopClassModel"
                :content="resolveLocaleText(child.title, commonStore.locale)"
                :formattable="false"
                parent-type="usual"
                type="title"
                @update:content="(value) => setTranslatedField(child, 'title', value)"
              />
            </div>
            <div class="w-100">
              <TextEditor
                v-model:class="noopClassModel"
                :content="resolveLocaleText(child.text, commonStore.locale)"
                :formattable="false"
                parent-type="usual"
                type="text"
                @update:content="(value) => setTranslatedField(child, 'text', value)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <h2 class="text-white text-center">
        {{ resolveLocaleText(props.section.title, commonStore.locale) }}
      </h2>
      <p class="text-dark-grey text-center mt-4">{{ resolveLocaleText(props.section.text, commonStore.locale) }}</p>
      <div class="d-flex flex-wrap justify-center gc-7 gr-16 w-100 mt-20">
        <v-card
          v-for="(child, index) of props.section.children"
          :key="index"
          class="d-flex flex-column align-center"
          color="transparent"
          flat
          max-width="240"
        >
          <div
            :style="{
              width: ((child.size || 24) + 16) + 'px',
              height: ((child.size || 24) + 16) + 'px',
              background: child.background ? `var(--${child.background})` : '#FFFFFF40',
              borderRadius: '50%',
              padding: '8px'
            }"
          >
            <!-- v-icon only knows mdi-* names; an uploaded SVG (data: URI or
                 path) has to be an <img>, or it renders as nothing. -->
            <v-icon v-if="isMdiIcon(child.icon)" :color="child.color || 'secondary'" :size="child.size || 24">{{ child.icon }}</v-icon>
            <img
              v-else-if="child.icon"
              alt=""
              :src="resolveThemeAssetPath(child.icon, commonStore.activeTheme)"
              :style="{ width: (child.size || 24) + 'px', height: (child.size || 24) + 'px', display: 'block' }"
            >
          </div>
          <h4 v-if="child.title" class="text-white text-center my-10">
            {{ resolveLocaleText(child.title, commonStore.locale) }}
          </h4>
          <p :class="child.class || 'h5 text-medium text-white text-center mt-10'">
            {{ resolveLocaleText(child.text, commonStore.locale) }}
          </p>
        </v-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* TextEditor.vue's own header/title/text tags have no explicit color of
   their own once there's real content (.editing-text - see that
   component), so they fall back to Vuetify's default heading/paragraph
   color (near-black) instead of inheriting this section's white text color
   - illegible against the dark background. Only .editing-text (content
   exists), not .text-before-edit (the empty-field placeholder, which keeps
   its own light-blue box + dark text on purpose, unaffected by this
   section's own colors). */
.dark-fone-section--edit :deep(.editing-text) {
  color: var(--white);
}
.dark-fone-editor-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 240px;
  padding: 16px;
  border-radius: var(--v-default-border-radius);
  background: #FFFFFF1A;
}
.dark-fone-editor-card--drag-cursor {
  cursor: move;
}
/* Same reasoning as TemplateFlexSection.vue's .card-drag-active - without
   this, a drag gesture starting on the icon picker or a contenteditable
   text field gets hijacked by that element instead of being seen by
   Sortable as a drag on the card itself. */
.dark-fone-editor-card__content--drag-active {
  pointer-events: none;
}
.dark-fone-editor-card__delete {
  position: absolute;
  top: 4px;
  right: 4px;
}
</style>
