<script setup lang="ts">
  import SveIconButton from './SveIconButton.vue'

  // A panel beside the page: on a wide screen it stands at the right edge,
  // under the top bar, and the page stays usable next to it; on a phone it
  // slides up from the bottom over a dimmed page (a tap outside closes it).
  const open = defineModel<boolean>({ default: false })
  // size 'lg': wider on a wide screen, for panels with pictures in them.
  defineProps<{ title: string, subtitle?: string, size?: 'md' | 'lg' }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sve-sheet-fade">
      <div v-if="open" class="sve-sheet-backdrop" @click="open = false" />
    </Transition>
    <Transition name="sve-sheet">
      <aside v-if="open" :aria-label="title" :class="['sve-ui sve-sheet', { 'sve-sheet--lg': size === 'lg' }]" role="dialog">
        <div aria-hidden="true" class="sve-sheet__grip" />
        <header class="sve-sheet__header">
          <div class="sve-sheet__titles">
            <div class="sve-sheet__title">{{ title }}</div>
            <div v-if="subtitle" class="sve-sheet__subtitle">{{ subtitle }}</div>
          </div>
          <SveIconButton icon="mdi-close" label="Закрити" size="sm" @click="open = false" />
        </header>
        <div class="sve-sheet__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="sve-sheet__footer">
          <slot name="footer" />
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>
