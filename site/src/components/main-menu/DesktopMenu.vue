<script setup lang="ts">
  import type { SubmenuItemModel } from '../../types/common'
  import { useSiteNavigation } from '../../composables/site-navigation'
  import DesktopMenuItem from './DesktopMenuItem.vue'
  import LocaleSwitcher from './LocaleSwitcher.vue'

  // No account button and no currency switcher: the demo has no accounts,
  // tickets or prices for them to act on.
  const { visibleMenu, follow } = useSiteNavigation()

  function selectSubmenuItem (item: SubmenuItemModel) {
    void follow(item)
  }
</script>

<template>
  <div class="desktop-app-bar">
    <div class="desktop-menu">
      <template v-for="(item, index) of visibleMenu" :key="index">
        <DesktopMenuItem :id="index" :item="item" @select-submenu-item="selectSubmenuItem" />
      </template>
    </div>
    <div class="user-preferences">
      <LocaleSwitcher />
    </div>
  </div>
</template>
