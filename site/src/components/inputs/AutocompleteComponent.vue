<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref } from 'vue'

  const selected = defineModel()
  type PropsModel = {
    placeholder: string
    emptyData: string
    icon?: string
    image?: string
    items: {
      id: number
      text?: string
      title?: string
      name?: string
      value?: string
    }[]
    disabled?: boolean
  }
  const props = defineProps<PropsModel>()
  const itemTitle = (item: PropsModel['items'][number]) => item.title || item.text || item.name || item.value
  const autocompleteComponent = ref<HTMLElement | null>(null)

  function handleScroll () {
    if (autocompleteComponent.value) {
      autocompleteComponent.value.blur() /* закрывает меню */
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll)
  })
</script>

<template>
  <v-autocomplete
    ref="autocompleteComponent"
    v-model="selected"
    class="autocomplete-class"
    :clear-icon="props.disabled ? '' : 'mdi-close'"
    clearable
    :disabled="props.disabled"
    flat
    hide-details
    hide-selected
    :item-title="itemTitle"
    item-value="id"
    :items="props.items"
    :no-data-text="props.emptyData"
    :placeholder="props.placeholder"
    variant="plain"
  >
    <template #prepend>
      <img
        v-if="props.image"
        class="mr-2"
        height="24"
        :src="props.image"
        width="32"
      >
      <v-icon v-else color="primary" size="28">{{ props.icon }}</v-icon>
    </template>
    <template #item="{ props, item }">
      <div v-bind="props">
        <p class="default-text text-thin px-4 py-2 cursor-pointer hovered">{{ item.title }}</p>
      </div>
    </template>
  </v-autocomplete>
</template>

<style scoped>
  .hovered:hover {
    background-color: #00000016;
  }
</style>
