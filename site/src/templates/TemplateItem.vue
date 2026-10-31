<script setup lang="ts">
  import type { TemplateBlockModel } from '../types/common'
  // import type { RouteQueryModel } from '../types/navigation/RouteQueryModel.ts'
  import { storeToRefs } from 'pinia'

  import { computed, defineAsyncComponent, ref, shallowRef, watch } from 'vue'

  import FeedbackCard from '../components/template-components/FeedbackCard.vue'
  // import { scrollByRef } from '@/utils/scroll-by-ref'
  // import { getDynamicPageContent } from '@/services/ajax/get-dynamic-page-content'
  import { useSiteNavigation } from '../composables/site-navigation'

  import { getImageURL } from '../services/get-image-url'
  import { useCommonStore } from '../stores/common'
  import ErrorComponent from './ErrorComponent.vue'
  import LoadingComponent from './LoadingComponent.vue'

  const { locale } = storeToRefs(useCommonStore())
  const { linkPath, follow } = useSiteNavigation()

  const props = defineProps<{ item: TemplateBlockModel }>()

  // Where a button or a footer link leads (null: nowhere on this site).
  const targetPath = computed(() => linkPath(props.item))
  // A link to a part of the original booking site the demo does not have
  // (accounts...) is not shown at all.
  const leadsNowhere = computed(() => !!props.item.route && targetPath.value === null)

  // A button set to open the feedback form (action 'form') shows it in a
  // window over the page instead of going anywhere.
  const formOpen = ref(false)
  function onButtonClick () {
    if (props.item.action === 'form') {
      formOpen.value = true
    } else if (targetPath.value) {
      follow(props.item)
    }
  }

  const component = shallowRef<unknown>(null)
  const templateComponent = shallowRef<unknown>(null)

  const isText = computed(() => (['header', 'title', 'text'].includes(props.item.type)))
  const isComponent = computed(() => props.item.type === 'component' || Object.keys(componentNames).includes(props.item.type) || isText.value)
  const isTemplate = computed(() => Object.keys(componentNames).includes(props.item.type) || isText.value)

  const imageURL = computed(() => {
    if (props.item.type !== 'image') return null
    const src = props.item.content[locale.value as 'uk' | 'en' | 'de']
    return getImageURL(src)
  })

  // async function buttonCallback (item: TemplateBlockModel) {
  //   if (item.route && !location.pathname.includes(item.route)) {
  //     await getDynamicPageContent(item.route)
  //     router.push({ name: 'dynamic-page', params: { pageId: item.route } })
  //   }
  // }

  const componentNames = {
    'carousel': 'SliderWithCards',
    'swiper': 'SliderWithThumbnails',
    'card': 'TemplateCard',
    'baner': 'TemplateBaner',
    'cards': 'CardSet',
    'text-with-icon': 'TextWithIcon',
    'dark-fone-section': 'DarkFoneSection',
    'hover-card': 'HoverTemplate',
    'slider-with-images': 'SliderWithImages',
    'card-with-toolbar-image': 'CardWithToolbarImage',
    'cards-with-image-in-circle': 'CardsWithImageInCircle',
    'parallax-inside': 'TemplateParallax',
  }

  // type CallbackParamsModel = {
  //   route: string
  //   params?: {
  //     pageId: string
  //     section: string
  //   }
  //   query?: RouteQueryModel
  //   hash: string
  // }

  // async function callback (item: CallbackParamsModel) {
  //   const { route, params, query, hash } = item
  //   if (route === 'dynamic-page' && params) {
  //     await getDynamicPageContent(params.pageId)
  //   }
  //   router.push({ name: route, params: params as RouteParamsRawGeneric, query: query as LocationQueryRaw, hash })
  // }

  watch(
    () => `${props.item.type}:${props.item.type === 'component' ? props.item.content : ''}`,
    () => {
      component.value = null
      templateComponent.value = null

      if (props.item.type === 'component') {
        component.value = defineAsyncComponent({
          loader: () => import(`../components/template-components/${props.item.content}.vue`),
          loadingComponent: LoadingComponent,
          errorComponent: ErrorComponent,
        })
      } else if (Object.keys(componentNames).includes(props.item.type)) {
        const componentName = componentNames[props.item.type as keyof typeof componentNames]
        templateComponent.value = defineAsyncComponent({
          loader: () => import(`./components/${componentName}.vue`),
          loadingComponent: LoadingComponent,
          errorComponent: ErrorComponent,
        })
      } else if (isText.value) {
        templateComponent.value = defineAsyncComponent({
          loader: () => import('./TemplateText.vue'),
          loadingComponent: LoadingComponent,
          errorComponent: ErrorComponent,
        })
      }
    },
    { immediate: true },
  )
</script>

<template>
  <div style="height: 100%">
    <template v-if="isComponent">
      <component :is="component" :id="item.id || ''" v-bind="props.item.props" :class="props.item.class" />
    </template>
    <template v-if="isTemplate">
      <component :is="templateComponent" :item="props.item" />
    </template>

    <template v-if="props.item.type === 'image'">
      <v-img
        :id="item.id"
        :class="[props.item.class, 'h-100 rounded']"
        cover
        :src="imageURL || ''"
        style="display: block"
      />
    </template>

    <template v-if="props.item.type === 'button'">
      <!-- Stays a <button> with a click: the site's buttons.css styles
        the tag itself. -->
      <v-btn :class="['primary-button', props.item.class]" @click="onButtonClick">
        <!-- Optional, and only rendered when the block actually carries one -
          a button with no icon must look exactly as it always has. -->
        <v-icon v-if="props.item.icon" class="mr-2" :icon="props.item.icon" size="20" />
        {{ props.item.content[locale as 'uk' | 'en' | 'de'] }}
      </v-btn>
    </template>

    <v-dialog v-if="props.item.action === 'form'" v-model="formOpen" content-class="feedback-popup-dialog">
      <div class="feedback-popup">
        <v-btn
          aria-label="Close"
          class="feedback-popup-close"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="formOpen = false"
        />
        <FeedbackCard
          :text="props.item.form?.text || ''"
          :title="props.item.form?.title || ''"
          :type="props.item.form?.type || 'message'"
        />
      </div>
    </v-dialog>

    <template v-if="props.item.type === 'route' && props.item.route && !leadsNowhere">
      <p
        :id="item.id || ''"
        :class="props.item.class || 'default-text text-thin text-grey py-5 py-md-3'"
      >
        <RouterLink class="site-link" :to="targetPath!">
          {{ props.item.content[locale as 'uk' | 'en' | 'de'] }}
        </RouterLink>
      </p>
    </template>
  </div>
</template>

<style scoped>
/* A link in running text keeps the look of the text it sits in. */
.site-link {
  color: inherit;
  text-decoration: none;
}
.site-link:hover {
  text-decoration: underline;
}

.rounded {
  border-radius: var(--large-border-radius) !important;
}
</style>

<style>
/* Not scoped: the window is drawn by Vuetify outside this component.
   The theme stretches every dialog to the full width
   (vuetify-overlay-content.css); the form keeps the width of a form. */
.v-dialog:not(.v-bottom-sheet) > .v-overlay__content.feedback-popup-dialog {
  min-width: 0;
  width: min(440px, calc(100% - 32px));
}
.feedback-popup {
  position: relative;
}
.feedback-popup .footer-feedback-card {
  min-width: 0;
  max-width: none;
  width: 100%;
}
.feedback-popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  color: var(--black);
}
</style>
