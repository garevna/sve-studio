<script setup lang="ts">
  import type { MenuItemModel, SubmenuItemModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'

  import { useSiteNavigation } from '../../composables/site-navigation'
  import { dropdownVars } from '../../configs/menu-style'
  import { useCommonStore } from '../../stores/common'

  const { locale, menuStyle } = storeToRefs(useCommonStore())
  // The dropdown's look from the UI Kit (global.json menuStyle).
  const dropdown = computed(() => menuStyle.value.dropdown)
  const dropdownProps = computed(() => ({ style: dropdownVars(dropdown.value) }))
  const { isCurrent } = useSiteNavigation()

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')

  type PropsModel = {
    id: number
    item: MenuItemModel
  }
  const props = defineProps<PropsModel>()

  const expanded = ref(false)

  // The entry of the page shown (or the group holding it) is highlighted.
  const color = computed(() => {
    if (expanded.value || isCurrent(props.item)) return 'var(--primary)'
    return props.item.submenu ? 'var(--black)' : 'var(--grey)'
  })

  const emit = defineEmits(['select-submenu-item'])

  function selectSubMenuItem (item: SubmenuItemModel) {
    emit('select-submenu-item', item)
  }

  function selectItem () {
    if (props.item.route) selectSubMenuItem(props.item as SubmenuItemModel)
    else if (props.item.callback) props.item.callback()
  }
</script>

<template>
  <div class="menu-item text-center">
    <div v-if="props.item.submenu && props.item.submenu.length > 0">
      <div style="display: grid; grid-template-columns: max-content max-content">
        {{ props.item.title[lang] }}
        <v-icon v-if="props.item.submenu" class="ml-4">
          {{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </v-icon>
      </div>
      <v-menu v-model="expanded" activator="parent" content-class="site-dropdown" :content-props="dropdownProps">
        <v-list class="main-menu-submenu">
          <v-list-item
            v-for="(item, index) in props.item.submenu"
            :key="index"
            :value="item"
            @click="selectSubMenuItem(item)"
          >
            <v-list-item-title>
              <p :class="isCurrent(item) ? dropdown.activeClass : dropdown.itemClass">{{ item.title[lang] }}</p>
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <div v-else @click="selectItem">
      {{ props.item.title[lang] }}
    </div>
  </div>
</template>

<style>
/* The dropdown's corners and fill (global.json menuStyle, set as CSS
   variables on the box): above the theme's own .v-menu rules. Shared by
   the language switcher (LangSwitcher.vue). */
.v-menu > .v-overlay__content.site-dropdown {
  border-radius: var(--dropdown-radius) !important;
}
.v-menu > .v-overlay__content.site-dropdown > .v-list {
  border-radius: inherit;
  background: var(--dropdown-background) !important;
}
</style>

<style scoped>
.menu-item {
  font-size: 16px;
  font-weight: 500;
  width: max-content;
  color: v-bind(color);
  cursor: pointer;
}

.main-menu-submenu {
  box-shadow: none !important;
  margin-left: -16px !important;
}
</style>
