<script setup lang="ts">
  import { computed } from 'vue'

  const open = defineModel('open', { default: false })
  const selected = defineModel<number>({ default: 0 })

  const emit = defineEmits(['select-item'])

  const props = defineProps<{
    header?: {
      icon?: string
      text: string
    }
    items: {
      icon?: string
      text: string
    }[]
    iconColor?: string
    textColor?: string
    class?: string
  }>()

  const selectedIcon = computed(() => props.items && props.items[selected.value] ? props.items[selected.value]?.icon || '' : '')
  const selectedText = computed(() => props.items && props.items[selected.value] ? props.items[selected.value]?.text || '' : '')

  function selectItem (index: number) {
    selected.value = index
    open.value = false
    const item = props.items && props.items[index] ? props.items[index].text : ''
    emit('select-item', item)
  }

  // function getItemIcon (index: number) {
  //   return props.items && props.items[index] ? props.items[index]?.icon || '' : ''
  // }
</script>

<template>
  <v-expansion-panels v-model="open" flat static>
    <v-expansion-panel :class="props.class || ''">
      <v-expansion-panel-title>
        <template v-if="props.header">
          <v-icon v-if="props.header?.icon" :color="props.iconColor || 'primary'" size="24">
            {{ props.header.icon || selectedIcon }}
          </v-icon>

          {{ props.header.text }}
        </template>
        <template v-else>
          <v-icon v-if="selectedIcon" :color="props.iconColor || 'primary'" size="24">
            {{ selectedIcon }}
          </v-icon>

          {{ selectedText }}
        </template>
      </v-expansion-panel-title>
      <v-expansion-panel-text class="currency-switcher-content">
        <v-list class="currency-switcher-list" item-props>
          <v-list-item
            v-for="(item, index) in props.items"
            :key="index"
            class="simple-switcher-list-item"
            @click="selectItem(index)"
          >
            <v-icon v-if="item.icon" class="currency-switcher-icon" :color="props.iconColor || 'primary'" size="24">
              {{ item.icon }}
            </v-icon>
            <span>{{ item.text }}</span>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.main-menu-item {
  border: none !important;
  border-radius: 0 !important;
}
</style>
