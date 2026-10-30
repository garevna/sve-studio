<script setup lang="ts">
  // import type { SubmenuItemModel } from '../../types/common'
  // import { storeToRefs } from 'pinia'

  import { storeToRefs } from 'pinia'

  // import { type LocationQueryRaw, type RouteParamsRawGeneric, useRouter } from 'vue-router'

  import { computed, shallowRef } from 'vue'

  import { useSiteNavigation } from '../../composables/site-navigation'
  import { HOME_PAGE_ID } from '../../services/site-links'
  import { useCommonStore } from '../../stores/common'
  import DesktopMenu from './DesktopMenu.vue'
  import MobileMenu from './MobileMenu.vue'

  const mobileMenuState = shallowRef(false)
  // The logo leads home.
  const { pagePath } = useSiteNavigation()

  const { company, headerSettings } = storeToRefs(useCommonStore())

  // A dark bar shows the light version of the logo when the site has one.
  const logoSrc = computed(() => (headerSettings.value.menuTheme === 'dark' && company.value?.logoWhite) || company.value?.logo.src)
  // const { name: companyName, logo } = company.value

  // const router = useRouter()

  // const { loading, globalProgress } = storeToRefs(useAjaxStore())

  // async function menuCallback (item: SubmenuItemModel) {
  //   if (item.route) {
  //     if (item.route === 'dynamic-page') {
  //       const pageId = (item.params as RouteParamsRawGeneric).pageId
  //       try {
  //         await getDynamicPageContent(pageId as string)
  //         router.push({ name: item.route, params: item.params as RouteParamsRawGeneric, hash: item.hash })
  //       } catch (error) {
  //         console.error('Invalid page or remote server error.\n', error)
  //         return
  //       }
  //     } else {
  //       router.push({ name: item.route, params: item.params as RouteParamsRawGeneric, query: item.query as LocationQueryRaw || {} })
  //     }
  //   } else {
  //     if (item.callback) {
  //       item.callback()
  //     }
  //   }
  // }

  // onBeforeMount(getMainMenuContent)

  // async function goHome () {
  //   await getDynamicPageContent('home-page')
  //   router.push({ name: 'dynamic-page', params: { pageId: 'home-page' } })
  // }
</script>

<template>
  <div>
    <div class="app-menu-bar">
      <!-- <v-progress-linear v-if="loading && globalProgress" class="progress-bar" color="primary" indeterminate /> -->
      <RouterLink class="main-menu-logo cursor-pointer" :to="pagePath(HOME_PAGE_ID)">
        <img
          :alt="company?.name"
          class="app-bar-logo mt-2"
          :height="company?.logo.height"
          :src="logoSrc"
          :width="company?.logo.width"
        >
      </RouterLink>
      <div class="main-menu-controls mt-2">
        <span class="mobile-menu">
          <MobileMenu v-model="mobileMenuState" />
        </span>
        <DesktopMenu class="desktop-menu" />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .mobile-menu {
    display: none;
  }

  .progress-bar {
    grid-area: progress;
  }

  @media screen and (max-width: 1080px) {
    .mobile-menu {
      display: block;
    }
  }
</style>
