<script setup lang="ts">
  import type { DockCounter, DockCountersField } from '@sve/dock'
  import { closedLook, countedText, textOf } from '@sve/dock'
  import { computed, ref } from 'vue'
  import { useDockFormScope } from './dock-form-host'
  import DockCountersPanel from './DockCountersPanel.vue'
  import DockFieldOverlay from './DockFieldOverlay.vue'

  // A docking form's counters: numbers stepped with - and + (adults,
  // children, rooms; pieces), each under its own key. The field's line
  // says them in words: "2 дорослі · 1 номер" - a zero that may be zero is
  // left out. Closed and opened as the look says (UI Kit "Елементи форми").
  //
  // NOTE: the site's own copy is site/src/components/dock/DockFormCounters.vue -
  // keep the two identical.
  const props = defineProps<{ field: DockCountersField }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang())
  const open = ref(false)
  const look = computed(() => scope.lookOf(props.field))
  const closed = computed(() => closedLook(look.value))

  function count (item: DockCounter): number {
    const value = Number(scope.values[item.key])
    return Number.isFinite(value) ? value : item.start
  }

  const text = computed(() => props.field.items
    .filter(item => count(item) > 0 || item.min > 0)
    .map(item => textOf(item.units, lang.value) ? countedText(item.units, lang.value, count(item)) : `${textOf(item.label, lang.value)}: ${count(item)}`)
    .join(' · '))
</script>

<template>
  <DockFieldOverlay v-model="open" :look="look">
    <template #activator="{ props: activatorProps }">
      <!-- not a <button>: the theme dresses every bare button (buttons.css,
           !important corners and shadow); the look says how this one is -->
      <div
        v-bind="activatorProps"
        :aria-label="textOf(field.label, lang)"
        :class="['pw-dock__field pw-dock__pick', closed.class]"
        role="button"
        :style="closed.style"
        tabindex="0"
        @keydown.enter.prevent="(event: KeyboardEvent) => (event.currentTarget as HTMLElement).click()"
        @keydown.space.prevent="(event: KeyboardEvent) => (event.currentTarget as HTMLElement).click()"
      >
        <v-icon v-if="field.icon" :icon="field.icon" size="22" />
        <span class="pw-dock__pick-text">
          <span class="pw-dock__pick-label">{{ textOf(field.label, lang) }}</span>
          <span class="pw-dock__pick-value">{{ text }}</span>
        </span>
      </div>
    </template>
    <DockCountersPanel :field="field" :look="look" />
  </DockFieldOverlay>
</template>
