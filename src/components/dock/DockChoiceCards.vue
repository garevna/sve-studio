<script setup lang="ts">
  import type { DockOption } from '@sve/dock'
  import { ref } from 'vue'
  import { CHECKER_STYLE } from '@/utils/image-fallback'

  // A choice shown as cards: a picture, a name, its points and a line under
  // them (a price). The list comes from the client's API through the docking
  // block (an "options" request with image / details / hint) - a hotel's
  // room categories, a salon's masters, a shop's variants. One card is
  // picked; picking it again lets it go.
  //
  // NOTE: the site's own copy is site/src/components/dock/DockChoiceCards.vue -
  // keep the two identical.
  const props = defineProps<{
    options: DockOption[]
    modelValue: string | null
    loading?: boolean
    // after the hint: "Р·Р° РЅС–С‡"
    hintSuffix?: string
    // shown when the client has nothing to offer
    emptyText?: string
  }>()
  const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

  // pictures that did not load: the checkerboard stays, never a broken icon
  const failed = ref(new Set<string>())

  function pick (value: string) {
    emit('update:modelValue', props.modelValue === value ? null : value)
  }
</script>

<template>
  <div :aria-busy="loading" class="pw-choice">
    <v-progress-linear v-if="loading" class="pw-choice__loading" color="primary" indeterminate />
    <p v-if="!loading && options.length === 0 && emptyText" class="pw-choice__empty">{{ emptyText }}</p>
    <div class="pw-choice__grid" role="radiogroup">
      <button
        v-for="option of options"
        :key="option.value"
        :aria-checked="modelValue === option.value"
        :class="['pw-choice__card', { 'pw-choice__card--picked': modelValue === option.value }]"
        role="radio"
        type="button"
        @click="pick(option.value)"
      >
        <span class="pw-choice__picture" :style="CHECKER_STYLE">
          <img
            v-if="option.image && !failed.has(option.image)"
            alt=""
            loading="lazy"
            :src="option.image"
            @error="failed = new Set([...failed, option.image ?? ''])"
          >
          <v-icon v-if="modelValue === option.value" class="pw-choice__mark" icon="mdi-check-circle" size="28" />
        </span>
        <span class="pw-choice__body">
          <span class="pw-choice__name">{{ option.label }}</span>
          <ul v-if="option.details?.length" class="pw-choice__details">
            <li v-for="point of option.details" :key="point">{{ point }}</li>
          </ul>
          <span v-if="option.hint" class="pw-choice__hint">
            <b>{{ option.hint }}</b>
            <span v-if="hintSuffix" class="pw-choice__suffix">{{ hintSuffix }}</span>
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pw-choice {
  position: relative;
}
.pw-choice__loading {
  position: absolute;
  inset: -8px 0 auto;
}
.pw-choice__empty {
  margin: 0;
  color: var(--dark-grey);
  text-align: center;
}
.pw-choice__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 320px));
  justify-content: center;
  gap: 16px;
}
.pw-choice__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--extra-small-border-radius, 8px);
  background: var(--white);
  box-shadow: 0 4px 20px rgb(0 0 0 / 0.08);
  color: var(--black);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pw-choice__card:hover {
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.14);
}
.pw-choice__card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.pw-choice__card--picked {
  border-color: var(--primary);
}
.pw-choice__picture {
  position: relative;
  display: block;
  aspect-ratio: 3 / 2;
}
.pw-choice__picture img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pw-choice__mark {
  position: absolute;
  top: 10px;
  right: 10px;
  border-radius: 50%;
  background: var(--white);
  color: var(--primary);
}
.pw-choice__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
}
.pw-choice__name {
  font-size: 1.1rem;
  font-weight: 600;
}
.pw-choice__details {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
  color: var(--dark-grey);
}
.pw-choice__details li {
  position: relative;
  padding-left: 18px;
}
.pw-choice__details li::before {
  content: '';
  position: absolute;
  top: 0.55em;
  left: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
}
.pw-choice__hint {
  margin-top: auto;
  padding-top: 4px;
  font-size: 0.95rem;
}
.pw-choice__hint b {
  font-size: 1.2rem;
}
.pw-choice__suffix {
  margin-left: 0.3em;
}
</style>
