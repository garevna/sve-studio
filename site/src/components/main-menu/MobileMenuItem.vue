<script setup lang="ts">
  import type { MenuItemModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'

  import { useCommonStore } from '../../stores/common'

  // import { useNavigationStore } from '@/stores/navigation'

  import ExpansionItem from '../small/ExpansionItem.vue'

  const { locale } = storeToRefs(useCommonStore())

  const lang = computed<'uk' | 'en' | 'de'>(() => locale.value as 'uk' | 'en' | 'de')

  const expandedItemIndex = defineModel<number>()

  type PropsModel = {
    id: number
    item: MenuItemModel
    isExpanded: number
  }

  const props = defineProps<PropsModel>()

  const title = computed(() => props.item.title[lang.value])

  // const { currentRouteName } = storeToRefs(useNavigationStore())

  const expanded = computed({
    get: () => props.isExpanded === props.id ? 0 : undefined,
    set: (val: number | undefined) => {
      if (val === 0) {
        expanded.value = undefined
        expandedItemIndex.value = -1
      } else {
        expandedItemIndex.value = props.id
      }
    },
  })

  // const color = computed(() => currentRouteName.value === props.item.route ? 'var(--primary)' : 'var(--black)')

  const emit = defineEmits(['switch-expanded', 'select-submenu-item'])

  const open = ref(false)

  function switchExpansion () {
    if (expanded.value === 0) {
      expanded.value = undefined
      expandedItemIndex.value = -1
    } else {
      expandedItemIndex.value = props.id
    }
  }

  function selectSubmenuItem (subMenuItem: string) {
    if (!props.item.submenu) return
    const item = props.item.submenu.find(el => el.title[lang.value] === subMenuItem)
    emit('select-submenu-item', item)
    expanded.value = undefined
  }

  function selectItem () {
    if (props.item.route) {
      emit('select-submenu-item', props.item)
    }
    switchExpansion()
  }
</script>

<template>
  <div>
    <template v-if="props.item.submenu && props.item.submenu.length > 0">
      <expansion-item
        v-model="expanded"
        v-model:open="open"
        class="main-menu-item"
        :header="{ text: title }"
        :items="props.item.submenu.map(subItem => ({ text: subItem.title[lang] }))"
        @select-item="selectSubmenuItem"
      />
    </template>
    <button v-else :class="['v-expansion-panel-title', 'v-expansion-panel-title--static']" @click="selectItem">
      <p class="default-text text-medium text-black" :style="{ whiteSpace: 'nowrap' }">
        {{ title }}
      </p>
    </button>
  </div>
</template>

<style scoped>
.submenu-list {
  min-height: max-content;
  background: transparent !important;
  padding-left: 36px;
}

.active-menu-item {
  color: var(--primary);
  font-weight: 600;
}

.submenu-item {
  cursor: pointer;
  color: var(--special);
  font-weight: 400;
}

.submenu-item:hover {
  color: var(--primary);
}
</style>
