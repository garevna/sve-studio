<script setup lang="ts">
  import type { DockCheckField } from '@sve/dock'
  import { textOf } from '@sve/dock'
  import { computed } from 'vue'
  import { useDockFormScope } from './dock-form-host'

  // A docking form's tick: "I agree with the terms". Its caption is the
  // field's label; it stands on its own line, without a field's box.
  //
  // NOTE: the site's own copy is site/src/components/dock/DockFormCheck.vue - keep
  // the two identical.
  const props = defineProps<{ field: DockCheckField }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang())

  const value = computed({
    get: () => scope.values[props.field.key] === true,
    set: next => scope.set(props.field.key, next),
  })
  const label = computed(() => {
    const text = textOf(props.field.label, lang.value)
    return props.field.required ? `${text} *` : text
  })
</script>

<template>
  <v-checkbox
    v-model="value"
    class="pw-dock__check"
    color="primary"
    density="compact"
    hide-details
    :label="label"
  />
</template>
