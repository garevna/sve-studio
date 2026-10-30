<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useButtonVariants } from '@/composables/useButtonVariants'

  // Which of the UI Kit's buttons this is. A component of its own because
  // the question comes up wherever content can carry a button - a page
  // block today, a card's call to action or a banner tomorrow - and each of
  // those would otherwise repeat the same two things: reading the variant
  // out of a class string that also holds other classes, and putting a new
  // one back without disturbing them.
  //
  // The list comes from buttons.css itself (see useButtonVariants), so it
  // can never offer a button the stylesheet doesn't define.
  //
  // The model is the WHOLE class string, not just the variant: that is what
  // the block stores, and a caller shouldn't have to take it apart to use
  // this.
  const className = defineModel<string>('class', { default: '' })

  withDefaults(defineProps<{
    label?: string
    density?: 'default' | 'comfortable' | 'compact'
  }>(), {
    label: 'Вигляд кнопки',
    density: 'compact',
  })

  const { variants, load } = useButtonVariants()

  onMounted(load)

  // Matched WITHIN the string rather than assumed to be all of it: a block's
  // class can carry spacing utilities and anything else the page needs, and
  // choosing a variant must not throw those away.
  const current = computed(() => {
    const tokens = (className.value || '').split(' ').filter(Boolean)
    return tokens.find(token => variants.value.includes(token)) || ''
  })

  function select (variant: string) {
    const kept = (className.value || '').split(' ').filter(token => token && !variants.value.includes(token))
    className.value = [...kept, variant].join(' ').trim()
  }
</script>

<template>
  <v-select
    :density="density"
    hide-details
    :items="variants"
    :label="label"
    :model-value="current"
    variant="outlined"
    @update:model-value="select"
  />
</template>
