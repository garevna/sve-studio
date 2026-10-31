<script setup lang="ts">
  import { computed } from 'vue'
  import { kitLabels } from '../labels'
  import SveField from './SveField.vue'

  // A colour: the swatch opens the system colour picker, the text takes any
  // #RRGGBB or #RRGGBBAA. The picker knows nothing of transparency, so a
  // colour picked there keeps the alpha the value already had.
  const model = defineModel<string>({ default: '#000000' })
  defineProps<{ label?: string, hint?: string }>()

  const VALID = /^#[\da-f]{6}([\da-f]{2})?$/i
  const opaque = computed(() => VALID.test(model.value) ? model.value.slice(0, 7) : '#000000')
  const alpha = computed(() => VALID.test(model.value) ? model.value.slice(7) : '')

  function pick (event: Event) {
    model.value = `${(event.target as HTMLInputElement).value.toUpperCase()}${alpha.value}`
  }
  function type (event: Event) {
    const value = (event.target as HTMLInputElement).value.trim()
    if (VALID.test(value)) {
      model.value = value.toUpperCase()
    }
  }
</script>

<template>
  <SveField :hint="hint" :label="label">
    <span class="sve-input sve-input--affix sve-color-field">
      <span class="sve-color-field__swatch" :style="{ background: model }">
        <input :aria-label="kitLabels.pickColor" type="color" :value="opaque" @input="pick">
      </span>
      <input
        class="sve-input--mono"
        maxlength="9"
        spellcheck="false"
        type="text"
        :value="model"
        @change="type"
      >
    </span>
  </SveField>
</template>
