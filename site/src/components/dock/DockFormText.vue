<script setup lang="ts">
  import type { DockTextField } from '@sve/dock'
  import { closedLook, textOf } from '@sve/dock'
  import { computed } from 'vue'
  import { useDockFormScope } from './dock-form-host'

  // A docking form's typed field: a name, a phone, an e-mail, a message.
  //
  // NOTE: the editor's copy is src/components/dock/DockFormText.vue - keep
  // the two identical.
  const props = defineProps<{ field: DockTextField }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang())
  const AUTOCOMPLETE = { text: 'name', tel: 'tel', email: 'email', textarea: 'off' } as const

  const closed = computed(() => closedLook(scope.lookOf(props.field)))
  // without a caption over it, the empty field says what it is
  const placeholder = computed(() => textOf(props.field.placeholder, lang.value) || (closed.value.class.includes('pw-dock__field--label-hidden') ? textOf(props.field.label, lang.value) : ''))

  const value = computed({
    get: () => {
      const current = scope.values[props.field.key]
      return typeof current === 'string' ? current : ''
    },
    set: next => scope.set(props.field.key, next),
  })
</script>

<template>
  <label :class="['pw-dock__field pw-dock__pick pw-dock__field--text', closed.class, { 'pw-dock__field--long': field.input === 'textarea' }]" :style="closed.style">
    <v-icon v-if="field.icon" :icon="field.icon" size="22" />
    <span class="pw-dock__pick-text">
      <span class="pw-dock__pick-label">{{ textOf(field.label, lang) }}</span>
      <v-textarea
        v-if="field.input === 'textarea'"
        v-model="value"
        :aria-label="textOf(field.label, lang)"
        auto-grow
        class="pw-dock__input"
        density="compact"
        hide-details
        :placeholder="placeholder"
        rows="2"
        variant="plain"
      />
      <v-text-field
        v-else
        v-model="value"
        :aria-label="textOf(field.label, lang)"
        :autocomplete="AUTOCOMPLETE[field.input ?? 'text']"
        class="pw-dock__input"
        density="compact"
        hide-details
        :placeholder="placeholder"
        :type="field.input ?? 'text'"
        variant="plain"
      />
    </span>
  </label>
</template>
