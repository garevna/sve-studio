<script setup lang="ts">
  import type { SubmenuItemModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useSiteNavigation } from '../../composables/site-navigation'
  import { useCommonStore } from '../../stores/common'
  import LocaleSwitcher from './LocaleSwitcher.vue'
  import MobileMenuButton from './MobileMenuButton.vue'
  import MobileMenuItem from './MobileMenuItem.vue'

  // No account button and no currency row: the demo has no accounts,
  // tickets or prices for them to act on.
  const { locale } = storeToRefs(useCommonStore())
  const { visibleMenu, follow } = useSiteNavigation()

  const languageLabel: Record<string, string> = {
    uk: 'Мова',
    en: 'Language',
    de: 'Sprache',
  }

  const mobileMenuState = defineModel({ default: false })

  const expandedItemIndex = ref(-1)

  function selectSubmenuItem (item: SubmenuItemModel) {
    expandedItemIndex.value = -1
    mobileMenuState.value = false
    void follow(item)
  }
</script>

<template>
  <v-dialog
    v-model="mobileMenuState"
    fullscreen
    location="right"
    transition="dialog-bottom-transition"
  >
    <template #activator="{ props: activatorProps }">
      <MobileMenuButton v-model="mobileMenuState" v-bind="activatorProps" />
    </template>

    <v-card class="mobile-menu-container">
      <v-toolbar>
        <v-spacer />
        <v-toolbar-items>
          <MobileMenuButton v-model="mobileMenuState" />
        </v-toolbar-items>
      </v-toolbar>

      <v-divider />
      <div class="h-100 d-flex flex-column justify-space-between my-8">
        <div class="mobile-menu-items">
          <template v-for="(item, index) of visibleMenu" :key="index">
            <MobileMenuItem
              :id="index"
              v-model="expandedItemIndex"
              :is-expanded="expandedItemIndex"
              :item="item"
              @select-submenu-item="selectSubmenuItem"
            />
          </template>
        </div>
        <div class="bottom-elements">
          <div class="d-flex justify-space-between align-center mx-5">
            <span>{{ languageLabel[locale] ?? languageLabel.en }}</span>
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
  .mobile-menu-container {
    padding: 0 !important;
  }

  :deep(.desktop-lang-switcher) {
    display: block !important;
  }
</style>
