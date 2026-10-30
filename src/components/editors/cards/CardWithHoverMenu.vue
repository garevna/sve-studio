<script setup lang="ts">
  import { onBeforeMount, ref, watch, watchEffect } from 'vue'

  const props = defineProps<{
    type: 'text' | 'header' | 'title'
    currentClass: string
    parentType: 'usual' | 'icon' | 'parallax'
    icon?: string
  }>()

  const availableIconColors = ['icon-grey', 'icon-blue', 'icon-green', 'icon-red', 'icon-yellow', 'primary']
  const defaultIconSize = '24'

  const emit = defineEmits([
    'remove-item',
    'toggle-text-align',
    'toggle-text-color',
    'toggle-text-type',
    'toggle-icon-color',
  ])

  const menuItems = ref([
    { key: 1, type: 'remove', color: '#900', icon: 'mdi-delete', size: 'small', onClick: () => emit('remove-item'), active: false, show: true },
    { key: 2, type: 'header', color: '#49b', icon: 'mdi-format-header-2', size: '32', onClick: () => emit('toggle-text-type', 'header'), active: false, show: props.parentType !== 'icon' },
    { key: 3, type: 'title', color: '#49b', icon: 'mdi-format-header-3', size: '24', onClick: () => emit('toggle-text-type', 'title'), active: false, show: props.parentType !== 'icon' },
    { key: 4, type: 'text', color: '#49b', icon: 'mdi-format-title', size: '16', onClick: () => emit('toggle-text-type', 'text'), active: false, show: true },
    { key: 5, type: 'align', color: '#49b', icon: 'mdi-format-align-left', size: 'small', onClick: () => emit('toggle-text-align', 'text-left'), active: false, show: props.parentType !== 'icon' },
    { key: 6, type: 'align', color: '#49b', icon: 'mdi-format-align-center', size: 'small', onClick: () => emit('toggle-text-align', 'text-center'), active: false, show: props.parentType !== 'icon' },
    { key: 7, type: 'align', color: '#49b', icon: 'mdi-format-align-right', size: 'small', onClick: () => emit('toggle-text-align', 'text-right'), active: false, show: props.parentType !== 'icon' },
    { key: 8, type: 'text-color', color: 'primary', icon: 'mdi-format-color-text', size: defaultIconSize, onClick: () => emit('toggle-text-color', 'text-primary'), active: false, show: props.parentType !== 'parallax' },
    { key: 9, type: 'text-color', color: 'dark-grey', icon: 'mdi-format-color-text', size: defaultIconSize, onClick: () => emit('toggle-text-color', 'text-dark-grey'), active: false, show: props.parentType !== 'parallax' },
    { key: 10, type: 'text-color', color: 'black', icon: 'mdi-format-color-text', size: defaultIconSize, onClick: () => emit('toggle-text-color', 'text-black'), active: false, show: props.parentType !== 'parallax' },
  ])

  watchEffect(setActive)

  watch(() => props.icon, val => updateIconMenuItems(val || ''))

  onBeforeMount(() => {
    setActive()
    if (props.icon) {
      for (const color of availableIconColors) {
        menuItems.value.push({
          key: menuItems.value.length + 1,
          type: 'icon-color',
          color,
          icon: props.icon,
          size: defaultIconSize,
          onClick: () => emit('toggle-icon-color', color),
          active: false,
          show: props.parentType === 'icon',
        })
      }
    }
  })

  function updateIconMenuItems (icon: string) {
    if (!props.icon || !menuItems.value[10] || !menuItems.value[11] || !menuItems.value[12] || !menuItems.value[13] || !menuItems.value[14] || !menuItems.value[15]) return
    const iconValue = icon.replace('fill="currentColor"', '')
    for (const color of availableIconColors) {
      const menuItem = menuItems.value.find(item => item.type === 'icon-color' && item.color === color)
      if (menuItem) {
        menuItem.icon = iconValue
      }
    }
  }

  function setActive () {
    if (!menuItems.value || !menuItems.value[1] || !menuItems.value[2] || !menuItems.value[3] || !menuItems.value[4] || !menuItems.value[5] || !menuItems.value[6] || !menuItems.value[7] || !menuItems.value[8] || !menuItems.value[9] || !menuItems.value[10]) return
    menuItems.value[1].active = props.type === 'header'
    menuItems.value[2].active = props.type === 'title'
    menuItems.value[3].active = props.type === 'text'

    menuItems.value[4].active = props.currentClass.includes('text-left')
    menuItems.value[5].active = props.currentClass.includes('text-center')
    menuItems.value[6].active = props.currentClass.includes('text-right')
    menuItems.value[7].active = props.currentClass.includes('text-primary')
    menuItems.value[8].active = props.currentClass.includes('text-dark-grey')
    menuItems.value[9].active = props.currentClass.includes('text-black')
  }
</script>

<template>
  <v-speed-dial
    location="top start"
    transition="fade-transition"
  >
    <template #activator="{ props: activatorProps }">
      <v-fab
        v-bind="activatorProps"
        close-on-content-click
        color="primary"
        icon="mdi-menu-down"
        location="top end"
        :size="20"
        style="margin-top: -8px !important; font-size: 16px !important"
      />
    </template>

    <template v-for="item of menuItems" :key="item.key">
      <template v-if="item.show">
        <v-icon
          v-if="item.icon?.startsWith('mdi-')"
          :color="item.color"
          :disabled="item.active"
          :icon="item.icon"
          :size="item.size"
          @click="item.onClick"
        />
        <!-- <i v-else v-html="item.icon?.replace('<svg', `\<svg fill=var(--${item.color}) width=${Number(item.size) || 24} height=${Number(item.size) || 24}`)" /> -->
        <i
          v-else
          :style="{ fill: `var(--${item.color})`, width: `${Number(item.size) || 24}px`, height: `${Number(item.size) || 24}px` }"
          @click="item.onClick"
          v-html="item.icon"
        />
      </template>
    </template>
  </v-speed-dial>
</template>
