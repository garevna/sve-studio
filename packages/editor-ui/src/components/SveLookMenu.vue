<script setup lang="ts">
  import { LOOKS } from '../looks'
  import { useLook } from '../use-look'
  import SveIconButton from './SveIconButton.vue'
  import SveMenu from './SveMenu.vue'
  import SveMenuItem from './SveMenuItem.vue'
  import SveMenuLabel from './SveMenuLabel.vue'

  // The editor's colour scheme, chosen by whoever uses it - on every top
  // bar. Mostly so the editor can be told apart from the site being edited
  // when their colours are alike.
  const { look, setLook } = useLook()
</script>

<template>
  <SveMenu :min-width="240">
    <template #activator="{ props: activator }">
      <SveIconButton icon="mdi-palette-outline" label="Оформлення редактора" v-bind="activator" />
    </template>
    <SveMenuLabel>Оформлення редактора</SveMenuLabel>
    <SveMenuItem
      v-for="item of LOOKS"
      :key="item.id"
      :icon="look.id === item.id ? 'mdi-check' : 'mdi-blank'"
      @click="setLook(item.id)"
    >
      <span aria-hidden="true" class="sve-look-swatch">
        <span :style="{ background: item.colors['topbar-bg'] }" />
        <span :style="{ background: item.colors.primary }" />
        <span :style="{ background: item.colors.bg }" />
      </span>
      {{ item.name }}
    </SveMenuItem>
  </SveMenu>
</template>
