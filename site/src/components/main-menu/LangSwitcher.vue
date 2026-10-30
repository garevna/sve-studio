<script setup lang="ts">
  import type { LocaleModel } from '../../types/common'

  import { ref } from 'vue'

  type LangModel = {
    id: LocaleModel
    prependAvatar: string
    title: string
  }

  const props = defineProps<{
    langs: LangModel[]
    current: LangModel
  }>()

  const opened = ref(false)

  const emit = defineEmits(['switch-locale'])
</script>

<template>
  <div>
    <div class="desktop-lang-switcher">
      <!-- <span v-html="current?.prependAvatar"></span> -->
      {{ props.current?.title }}
      <v-icon class="ml-4">
        {{ opened ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
      </v-icon>
    </div>

    <v-menu v-model="opened" activator="parent">
      <v-list class="lang-switcher-menu-list">
        <v-list-item
          v-for="(item, index) in props.langs"
          :key="index"
          :value="item"
          @click="emit('switch-locale', item.id)"
        >
          <v-list-item-title>
            <!-- <span v-html="item.prependAvatar" class="mr-3" /> -->
            {{ item.title }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>
