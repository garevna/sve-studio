<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, defineAsyncComponent, shallowRef, watch } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import TemplateParallax from '@/components/templates/sections/TemplateParallax.vue'
  import SliderWithImages from '@/components/templates/sliders/SliderWithImages.vue'
  import SliderWithThumbnails from '@/components/templates/sliders/SliderWithThumbnails.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { defaultTextClass } from '@/configs/defaults/default-classes'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, isTranslatedModel, localeTextStrict, resolveLocaleAsset, resolveLocaleText, siteLocales, translationHint } from '@/utils/locale-text'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'
  // import { useAjaxStore } from '@/stores/ajax'
  import ButtonEditor from '../editors/ButtonEditor.vue'
  import ImageEditor from '../editors/ImageEditor.vue'
  import RouteEditor from '../editors/RouteEditor.vue'
  import SwiperImagesEditor from '../editors/SwiperImagesEditor.vue'
  import TextWithIconEditor from '../editors/text/TextWithIconEditor.vue'
  import CardSet from './cards/CardSet.vue'
  import CardWithToolbarImage from './cards/CardWithToolbarImage.vue'

  import TemplateCard from './cards/TemplateCard.vue'
  import ErrorComponent from './helpers/ErrorComponent.vue'
  import LoadingComponent from './helpers/LoadingComponent.vue'
  import DarkFoneSection from './sections/DarkFoneSection.vue'
  import TemplateBaner from './sections/TemplateBaner.vue'
  import TemplateFlexSection from './sections/TemplateFlexSection.vue'
  import SliderWithCards from './sliders/SliderWithCards.vue'

  const commonStore = useCommonStore()
  const mode = useEditorMode()

  const props = withDefaults(defineProps<{
    blocks: TemplateBlockModel[]
    blockIndex: number
    defaults?: Partial<TemplateBlockModel>
    // Set only when this item IS a whole top-level page block (see
    // DynamicPageTemplate.vue's generic branch) - threaded into whichever
    // editor is active (text/header/title, text-with-icon, button) so
    // "delete" folds into that editor's own existing control instead of a
    // second, competing one. Types with no such existing control (image,
    // component, swiper, carousel, card-with-toolbar-image, dark-fone-
    // section) keep getting wrapped in a plain EditableBlockWrapper by the
    // caller instead - nothing to fold into here.
    deletable?: boolean
    // False when the block's format is set from its own container's toolbar
    // instead of from a panel under the text (see FooterColumn.vue) - the
    // footer's columns are too narrow for a text field to carry its own
    // panel without it spilling past the column's edge. Default true: an
    // element added to a page - a free-content column included - is
    // formattable unless its host has a reason to say otherwise.
    formattable?: boolean
    // Only the top-level page-block callers (DynamicPageTemplate.vue's own
    // loop) can rely on the default here - it unconditionally writes into
    // commonStore.dynamicPageContent.blocks, so a caller passing a NESTED
    // array via `blocks` (EditableCardsBlock.vue's block.children,
    // TemplateNestedSection.vue's child.children, SectionWithFreeContent.vue's
    // record.children) must supply its own writer or a whole-object
    // reassignment here would silently write to the wrong array. In
    // practice this setter is dormant today - every v-model in this
    // template does a nested property mutation (item.value.xxx = ...),
    // which bypasses a computed ref's own setter entirely - but it's one
    // future `v-model="item"` away from becoming a real bug, so nested
    // callers should still pass this explicitly rather than rely on it
    // staying unreachable.
    updateItem?: (index: number, value: TemplateBlockModel) => void
    // Only meaningful for the card-with-toolbar-image branch below - the
    // parent "float" block, passed through so CardWithToolbarImage.vue can
    // reach its sibling cards and the group's shared-format toggle (see
    // card-with-toolbar-image-format-sync.ts). Every other branch ignores it.
    group?: TemplateBlockModel
  }>(), {
    // Needs an explicit runtime default, exactly like TextEditor.vue's own
    // prop of this name: a boolean-typed prop with no default casts an
    // ABSENT value to `false`, not to `undefined`. So `formattable !== false`
    // below was false for every caller that never passed it - which is all of
    // them except FooterColumn.vue, the one place that actually wants it off -
    // and the format menu silently disappeared from every text this component
    // dispatches. Most visibly: a title or a paragraph added to a "Довільний
    // контент" column came out with a bare delete button and no way to format
    // it at all (confirmed in a real browser: a delete icon where the format
    // cog belongs, on both fields of that column).
    formattable: true,
  })

  const emit = defineEmits<{ delete: [] }>()

  // const ajaxStore = useAjaxStore()

  const item = computed({
    get: () => props.blocks[props.blockIndex] || null,
    set: (value: TemplateBlockModel) => {
      if (props.blocks[props.blockIndex]) {
        (props.updateItem || commonStore.updateDynamicPageContent)(props.blockIndex, value)
      }
    },
  })

  const cardWidth = computed(() => item.value && item.value.width ? item.value.width + 'px' : '300px')

  // Vuetify vertical-margin utilities (my-N/mt-N/mb-N) on a TOP-LEVEL
  // block's own class (galery-1.ts's "my-25", galery-2.ts's "mt-25" - 100px
  // each) exist purely to match production's own spacing between this
  // block and its neighbors - blockSpacingStyle() (DynamicPageTemplate.vue)
  // already gives every block real spacing while editing too, so this is
  // pure redundant dead air on top of that, not a rendering concern anyone
  // needs to see/adjust while editing (confirmed via DevTools: exactly this
  // class was the source of the large empty gap above/below the block in
  // edit mode). Never touches a NESTED child's own class (a card's title-
  // to-content gap etc.) - only ever the single outer class this computed
  // already resolves for whichever item TemplateItem is currently rendering.
  // my-/mt-/mb- only, deliberately not the bare all-sides m-N - that one
  // also carries horizontal margin (e.g. an mx-auto-style centering need),
  // which is a real layout concern while editing too, unlike pure vertical
  // block-to-block spacing.
  const VERTICAL_MARGIN_CLASS = /^(my|mt|mb)-\d+$/
  // Production toggles "desktop-mode"/"mobile-mode" via CSS media queries
  // (see common.css) - meaningful only for the real preview/production
  // render. In edit mode the user works at a single window width and needs
  // to see and act on every block regardless of which device it's tagged
  // for, so the class is stripped outright here rather than fought with a
  // CSS override - it's simply never on the DOM while editing, so there's
  // no cascade/specificity question. Preview mode (in-app toggle or the
  // standalone window) passes the class through unchanged.
  const displayClass = computed(() => {
    const raw = item.value?.class
    if (!raw || mode.value !== 'edit') return raw
    return raw.split(/\s+/).filter(token => token !== 'desktop-mode' && token !== 'mobile-mode' && !VERTICAL_MARGIN_CLASS.test(token)).join(' ')
  })

  // Shared read/write view of item.content for the currently active locale -
  // used by whichever editor is active (text/header/title, text-with-icon, image).
  const localizedContent = computed({
    get: () => {
      // Images fall back to another language's picture (see below); a text
      // field shows exactly this language's text, so a gap looks like one.
      if (item.value?.type === 'image') {
        return resolveThemeAssetPath(resolveLocaleAsset(item.value.content, commonStore.locale), commonStore.activeTheme)
      }
      return localeTextStrict(item.value?.content, commonStore.locale)
    },
    set: (value: string | undefined) => {
      if (!item.value) return
      if (!isTranslatedModel(item.value.content)) {
        item.value.content = emptyTranslatedModel()
      }
      (item.value.content as TranslatedModel)[commonStore.locale] = value || ''
    },
  })

  // A client who forgets to upload a per-locale image ships a blank hole on
  // production for that locale, not just a wrong-but-present one - a much
  // worse failure mode than "the same image shows for a locale that maybe
  // should have its own". Auto-filling only EMPTY slots (never overwriting
  // a locale someone already gave its own distinct image) removes that
  // failure mode without ever clobbering intentional per-locale content.
  function fillEmptyLocales (path: string) {
    if (!item.value) return
    if (!isTranslatedModel(item.value.content)) {
      item.value.content = emptyTranslatedModel()
    }
    const content = item.value.content as TranslatedModel
    for (const locale of siteLocales()) {
      if (locale !== commonStore.locale && !content[locale]) {
        content[locale] = path
      }
    }
  }

  // Production (TextWithIcon.vue) reads block.icon (mdi-name or path/data-URI,
  // rendered with color/background support) and only falls back to
  // block.image (plain <img>, no color/background) when block.icon is unset.
  // Our IconEditor already supports data-URIs directly under `icon` with full
  // color/background editing, so it fully subsumes what `image` is used for -
  // merge on read, and always write back to `icon` (clearing the legacy
  // `image` field) so there's a single source of truth after any edit.
  const textWithIconIcon = computed({
    get: () => item.value?.icon || item.value?.image || '',
    set: (value: string) => {
      if (!item.value) return
      item.value.icon = value
      if (item.value.image) item.value.image = undefined
    },
  })

  // Production reads block.text (not block.class) for the paragraph's format
  // class - block.class is the wrapper div's own class (spacing utilities).
  const textWithIconTextClass = computed({
    get: () => (typeof item.value?.text === 'string' ? item.value.text : ''),
    set: (value: string) => {
      if (item.value) item.value.text = value
    },
  })

  const component = shallowRef<any>(null)

  // Which block this slot shows can change WITHOUT the component being
  // remounted: DynamicPageTemplate keys its v-for by index, so deleting a
  // block shifts every later one up a slot and Vue patches the existing
  // TemplateItem rather than unmounting it. Resolving the component once on
  // mount then left the previous occupant rendered with the new block's
  // props - confirmed live: deleting a block above the FAQ section kept
  // ImagesGridVer1 mounted, handed it FAQ's props, and it threw "Cannot read
  // properties of undefined (reading 'desktop')" on model.images.
  //
  // Watching `content` and not the block itself is what makes this cheap:
  // a different block of the SAME component type reuses the instance and
  // only takes new props, exactly as before.
  //
  // Default flush ('pre') matters here - the watcher runs before this
  // component's own re-render, so the new props never reach the old
  // component even for one frame.
  watch(
    () => (item.value?.type === 'component' ? item.value.content : null),
    content => {
      component.value = content
        ? defineAsyncComponent({
          loader: () => import(`../home-page-components/${content}.vue`),
          loadingComponent: LoadingComponent,
          errorComponent: ErrorComponent,
        })
        : null
    },
    { immediate: true },
  )

  // Same reason: the block sitting in this slot can be replaced by another
  // one, and a text-with-icon that arrives that way needs its default class
  // just as much as one that was here at mount.
  watch(
    () => (item.value?.type === 'text-with-icon' ? item.value : null),
    block => {
      if (block) {
        block.class = block.class || defaultTextClass
      }
    },
    { immediate: true },
  )

  // function buttonCallback (item: TemplateBlockModel) {
  //   if (item.route) {
  //     gotoRoute(item.route as RouteModel, item.params)
  //   }
  // }
</script>

<template>
  <!-- Matches production's own TemplateItem.vue (every dispatched item gets
    this same height:100% wrapper) - a no-op outside a flex row, but what
    lets a card (e.g. card-with-toolbar-image, inside TemplateFlexSection's
    align-items:stretch row) actually fill the stretched height its
    container gives it, instead of staying at its own natural content height. -->
  <div v-if="item" style="height: 100%">
    <template v-if="item.type === 'parallax-inside'">
      <template-parallax :block-index="props.blockIndex" :blocks="props.blocks" :class="displayClass" />
    </template>
    <template v-if="item.type === 'baner'">
      <template-baner :block-index="props.blockIndex" :blocks="props.blocks" :class="displayClass" />
    </template>
    <template v-else-if="item.type === 'header' || item.type === 'title' || item.type === 'text'">
      <text-editor
        v-model:class="item.class"
        v-model:content="localizedContent"
        v-model:type="item.type"
        :deletable="props.deletable"
        :formattable="props.formattable !== false"
        :missing-translation="translationHint(item.content, commonStore.locale)"
        parent-type="usual"
        @delete="emit('delete')"
      />
    </template>
    <template v-else-if="item.type === 'text-with-icon'">
      <text-with-icon-editor
        v-model:icon="textWithIconIcon"
        v-model:icon-background="item.background"
        v-model:icon-color="item.color"
        v-model:icon-size="item.size"
        v-model:link="item.link"
        v-model:text="localizedContent"
        v-model:text-class="textWithIconTextClass"
        v-model:type="item.type"
        :class="displayClass"
        :deletable="props.deletable"
        parent-type="icon"
        @delete="emit('delete')"
      />
    </template>
    <template v-else-if="item.type === 'image'">
      <image-editor
        v-model:height="item.height"
        v-model:src="localizedContent"
        :class="displayClass"
        natural-size
        :resize="true"
        :width="item.width ? item.width + 'px' : ''"
        @uploaded="fillEmptyLocales"
      />
    </template>
    <template v-else-if="item.type === 'button'">
      <button-editor
        v-model:class="item.class"
        v-model:content="localizedContent"
        :block="item"
        :deletable="props.deletable"
        @delete="emit('delete')"
      />
    </template>
    <template v-else-if="item.type === 'card'">
      <template-card :class="['mb-4', displayClass]" :defaults="props.defaults" :item="item" />
    </template>
    <!-- A whole set of cards, not one card. Only reachable from a nested
      caller (a "Довільний контент" column) - a page's own top-level cards
      block is dispatched by DynamicPageTemplate.vue, which has the card
      dialog needed to edit one. Here the set is read-only, which is exactly
      what this branch is for: preview mode, and the non-edit render of a
      free-content column. Editing a nested set goes through
      SectionWithFreeContent.vue's own EditableCardsBlock instead. -->
    <template v-else-if="item.type === 'cards'">
      <card-set :item="item" />
    </template>
    <div v-else-if="item.type === 'component'" :class="displayClass">
      <!-- home-page-components disagree on their own prop convention: some
        (ImagesGridVer1/2.vue) take item.props as one whole object via a
        bare defineModel(), others (CardWithHover.vue) take it as
        individual named props via plain defineProps - v-bind spreads each
        key for the latter, v-model supplies the former's modelValue; doing
        both covers either without needing to know which one component is. -->
      <component :is="component" v-bind="item.props" v-model="item.props" />
    </div>
    <template v-else-if="item.type === 'swiper'">
      <swiper-images-editor v-if="mode === 'edit'" :block="item" :class="displayClass" />
      <slider-with-thumbnails v-else-if="item.images" :class="displayClass" :images="item.images" />
    </template>
    <template v-else-if="item.type === 'slider-with-images'">
      <swiper-images-editor v-if="mode === 'edit'" :block="item" :class="displayClass" />
      <slider-with-images v-else :class="displayClass" :item="item" />
    </template>
    <template v-else-if="item.type === 'carousel' && item.children">
      <slider-with-cards
        :block="item"
        :cards="item.children"
        :class="displayClass"
        :height="item.height || 300"
        @delete="emit('delete')"
      />
    </template>
    <template v-else-if="item.type === 'card-with-toolbar-image' && item.children">
      <card-with-toolbar-image :card="item" :class="displayClass" :group="props.group" />
    </template>
    <template v-else-if="item.type === 'float' && item.children">
      <template-flex-section :class="displayClass" :section="item" />
    </template>
    <!-- <template v-else-if="item.type === 'text-with-icon'">
      <text-with-icon-editor
        v-model:icon="item.icon"
        v-model:text="item.content"
        :color="item.color"
        :size="item.size"
        :text-class="item.text || defaultTextClass"
      />
    </template> -->
    <template v-else-if="item.type === 'dark-fone-section'">
      <dark-fone-section :class="displayClass" :section="item" />
    </template>
    <!-- A line of text that leads somewhere. This branch used to be
      commented out below this component's own root, which is why a
      type:'route' block rendered as nothing at all wherever it appeared -
      including, most visibly, the whole middle column of the footer.
      RouteEditor owns both halves (the words and the link), so there is
      nothing route-specific to keep here. -->
    <template v-else-if="item.type === 'route'">
      <route-editor
        v-if="mode === 'edit'"
        :block="item"
        :class="displayClass"
        formattable
      />
      <p v-else :class="[item.class || defaultTextClass, displayClass]">
        {{ localizedContent }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.template-card {
  width: v-bind(cardWidth) !important;
  border-radius: var(--v-default-border-radius);
  border: var(--light-border);
  padding: 16px;
  text-align: center;
}
</style>
