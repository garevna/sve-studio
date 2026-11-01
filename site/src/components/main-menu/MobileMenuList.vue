<script setup lang="ts">
  import type { MobileMenuStyle } from '../../configs/menu-style'
  import type { MenuItemModel, SubmenuItemModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useSiteNavigation } from '../../composables/site-navigation'
  import { useCommonStore } from '../../stores/common'

  // The menu's entries in the mobile panel: an entry with a group opens it
  // below itself (one at a time), the others lead to their page. Text
  // formats are the UI Kit's (global.json menuStyle.mobile).
  const props = defineProps<{ look: MobileMenuStyle, align?: 'left' | 'center' | 'right' }>()
  const emit = defineEmits<{ navigate: [] }>()

  const { locale } = storeToRefs(useCommonStore())
  const { visibleMenu, follow, isCurrent } = useSiteNavigation()

  const openIndex = ref(-1)

  function title (item: MenuItemModel | SubmenuItemModel): string {
    return (item.title as Record<string, string>)[locale.value] ?? ''
  }

  function select (item: MenuItemModel | SubmenuItemModel) {
    emit('navigate')
    void follow(item as SubmenuItemModel)
  }

  function onEntry (item: MenuItemModel, index: number) {
    if (item.submenu?.length) {
      openIndex.value = openIndex.value === index ? -1 : index
    } else {
      select(item)
    }
  }
</script>

<template>
  <ul class="mobile-menu-list" :style="{ textAlign: props.align || 'left' }">
    <li v-for="(item, index) of visibleMenu" :key="index">
      <button class="mobile-menu-entry" type="button" @click="onEntry(item, index)">
        <span :class="isCurrent(item) ? props.look.activeClass : props.look.itemClass">{{ title(item) }}</span>
        <v-icon v-if="item.submenu?.length" class="mobile-menu-chevron" size="20">
          {{ openIndex === index ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </v-icon>
      </button>
      <v-expand-transition>
        <ul v-if="item.submenu?.length && openIndex === index" class="mobile-menu-sublist">
          <li v-for="(sub, subIndex) of item.submenu" :key="subIndex">
            <button class="mobile-menu-entry" type="button" @click="select(sub)">
              <span :class="isCurrent(sub) ? props.look.activeClass : props.look.subItemClass">{{ title(sub) }}</span>
            </button>
          </li>
        </ul>
      </v-expand-transition>
    </li>
  </ul>
</template>

<style scoped>
.mobile-menu-list,
.mobile-menu-sublist {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
}
.mobile-menu-sublist {
  padding-left: 16px;
}
.mobile-menu-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 0;
  border: none;
  background: none;
  text-align: inherit;
  cursor: pointer;
}
.mobile-menu-entry span {
  flex: 1 1 auto;
  margin: 0;
}
</style>
