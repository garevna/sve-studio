<script setup lang="ts">
  import type { DockCardsField, DockOption } from '@sve/dock'
  import { textOf } from '@sve/dock'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useDockFormScope } from './dock-form-host'
  import DockChoiceCards from './DockChoiceCards.vue'

  // A docking form's choice as cards (a room, a master, a variant): shown
  // once everything its request reads is chosen - or, while the block is
  // being edited, at once, for sample values, so its look can be seen.
  //
  // NOTE: the editor's copy is src/components/dock/DockFormCards.vue - keep
  // the two identical.
  const props = defineProps<{ field: DockCardsField }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang() as 'uk' | 'en' | 'de')

  const value = computed({
    get: () => {
      const current = scope.values[props.field.key]
      return typeof current === 'string' ? current : null
    },
    set: next => scope.set(props.field.key, next),
  })

  const waiting = computed(() => scope.waitingFor(props.field.request, props.field.key))
  // the values the cards are asked with: the visitor's, or a sample
  const asked = computed(() => {
    if (!props.field.request) {
      return null
    }
    return waiting.value.length === 0 ? { ...scope.values } : scope.sampleFor(waiting.value)
  })
  const sample = computed(() => waiting.value.length > 0 && !!asked.value)

  const options = ref<DockOption[]>([])
  const loading = ref(false)
  const answered = ref(false)
  const inputs = computed(() => JSON.stringify(asked.value && scope.dock.reads(props.field.request).filter(key => key !== props.field.key).map(key => asked.value![key] ?? null)))

  async function load () {
    if (!asked.value) {
      options.value = []
      answered.value = false
      return
    }
    loading.value = true
    try {
      options.value = await scope.dock.options(props.field.request, scope.context(asked.value))
      // the form says the chosen card by its name (a message to the channel)
      scope.lists[props.field.key] = options.value
    } catch (error) {
      options.value = []
      scope.report(`docking form: ${props.field.key}`, error)
    } finally {
      loading.value = false
      answered.value = true
    }
    // one no longer offered for the new choice is let go
    if (!sample.value && value.value && !options.value.some(option => option.value === value.value)) {
      value.value = null
    }
  }
  onMounted(load)
  watch(() => [inputs.value, props.field.request, lang.value], load)

  const SAMPLE = {
    uk: 'Приклад: відвідувач побачить ці картки, щойно обере, від чого вони залежать.',
    en: 'A sample: the visitor sees these cards once what they depend on is chosen.',
    de: 'Ein Beispiel: Die Karten erscheinen, sobald gewählt ist, wovon sie abhängen.',
  } as const
</script>

<template>
  <div v-if="asked" class="pw-dock__cards">
    <h3 v-if="textOf(field.label, lang)" class="pw-dock__cards-title">{{ textOf(field.label, lang) }}</h3>
    <p v-if="sample" class="pw-dock__sample">{{ SAMPLE[lang] }}</p>
    <DockChoiceCards
      v-model="value"
      :empty-text="answered ? textOf(field.empty, lang) : ''"
      :hint-suffix="textOf(field.suffix, lang)"
      :loading="loading"
      :options="options"
    />
  </div>
</template>
