<script setup lang="ts">
  import type { DockCounter, DockCountersField, DockFieldLook } from '@sve/dock'
  import { textOf } from '@sve/dock'
  import { computed } from 'vue'
  import { useDockFormScope } from './dock-form-host'

  // What opens from a docking form's counters: a row for each, its name and
  // − n +. The buttons are the look's (UI Kit "Елементи форми": outlined,
  // filled or bare). The UI Kit shows it on its own, opened.
  //
  // NOTE: the editor's copy is src/components/dock/DockCountersPanel.vue -
  // keep the two identical.
  const props = defineProps<{ field: DockCountersField, look: DockFieldLook }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang())
  const STEPPERS = { outlined: 'outlined', filled: 'flat', text: 'text' } as const

  function count (item: DockCounter): number {
    const value = Number(scope.values[item.key])
    return Number.isFinite(value) ? value : item.start
  }
  function step (item: DockCounter, by: number) {
    scope.set(item.key, Math.min(item.max, Math.max(item.min, count(item) + by)))
  }
  const variant = computed(() => STEPPERS[props.look.opened.stepper] ?? 'outlined')
</script>

<template>
  <div class="pw-dock__counters">
    <div v-for="item of field.items" :key="item.key" class="pw-dock__counters-row">
      <span>{{ textOf(item.label, lang) }}</span>
      <span class="pw-dock__stepper">
        <v-btn
          :aria-label="`${textOf(item.label, lang)} −`"
          :color="variant === 'flat' ? 'primary' : undefined"
          :disabled="count(item) <= item.min"
          icon="mdi-minus"
          size="small"
          :variant="variant"
          @click="step(item, -1)"
        />
        <span class="pw-dock__count">{{ count(item) }}</span>
        <v-btn
          :aria-label="`${textOf(item.label, lang)} +`"
          :color="variant === 'flat' ? 'primary' : undefined"
          :disabled="count(item) >= item.max"
          icon="mdi-plus"
          size="small"
          :variant="variant"
          @click="step(item, 1)"
        />
      </span>
    </div>
  </div>
</template>
