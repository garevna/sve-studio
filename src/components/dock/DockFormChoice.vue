<script setup lang="ts">
  import type { DockChoiceField, DockOption } from '@sve/dock'
  import { closedLook, textOf } from '@sve/dock'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useDockFormScope } from './dock-form-host'

  // A docking form's choice: one value out of a list from the client's API
  // (a city, a service), typed into or picked.
  //
  // NOTE: the site's own copy is site/src/components/dock/DockFormChoice.vue - keep
  // the two identical.
  const props = defineProps<{ field: DockChoiceField }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang() as 'uk' | 'en' | 'de')

  const WORDS = {
    noOptions: { uk: 'Нічого не знайдено', en: 'Nothing found', de: 'Nichts gefunden' },
  } as const

  const value = computed({
    get: () => {
      const current = scope.values[props.field.key]
      return typeof current === 'string' ? current : null
    },
    set: next => scope.set(props.field.key, next),
  })

  const closed = computed(() => closedLook(scope.lookOf(props.field)))
  // without a caption over it, the empty field says what it is
  const placeholder = computed(() => textOf(props.field.placeholder, lang.value) || (closed.value.class.includes('pw-dock__field--label-hidden') ? textOf(props.field.label, lang.value) : ''))

  const options = ref<DockOption[]>([])
  const loading = ref(false)
  // what the list depends on: the fields its request reads
  const inputs = computed(() => scope.dock.reads(props.field.request).map(key => JSON.stringify(scope.values[key] ?? null)).join('|'))

  async function load () {
    loading.value = true
    try {
      options.value = await scope.dock.options(props.field.request, scope.context({ ...scope.values }))
    } catch (error) {
      options.value = []
      scope.report(`docking form: ${props.field.key}`, error)
    } finally {
      loading.value = false
    }
    scope.lists[props.field.key] = options.value
    // a value no longer offered is let go
    if (value.value && options.value.length > 0 && !options.value.some(option => option.value === value.value)) {
      value.value = null
    }
  }
  onMounted(load)
  watch(() => [props.field.request, inputs.value, lang.value], load)
</script>

<template>
  <div :class="['pw-dock__field pw-dock__pick pw-dock__field--choice', closed.class]" :style="closed.style">
    <v-icon v-if="field.icon" :icon="field.icon" size="22" />
    <span class="pw-dock__pick-text">
      <span class="pw-dock__pick-label">{{ textOf(field.label, lang) }}</span>
      <v-autocomplete
        v-model="value"
        :aria-label="textOf(field.label, lang)"
        class="pw-dock__input"
        :content-class="scope.overlayClass"
        density="compact"
        hide-details
        item-title="label"
        item-value="value"
        :items="options"
        :loading="loading"
        :no-data-text="WORDS.noOptions[lang]"
        :placeholder="placeholder"
        variant="plain"
      />
    </span>
  </div>
</template>
