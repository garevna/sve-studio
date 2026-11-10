<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { SOCIAL_ICONS } from '../../configs/social-icons'

  // One way back to the visitor, in one field: which messenger (or e-mail)
  // on the left - its own sign and a chevron, picked from a short list, as a
  // phone field picks its country (PhoneNumberInput.vue, the same theme
  // classes) - and the address or number on the right. One field reads as
  // one contact: a row of switches above a field read as tabs, each with a
  // field of its own. The editor has the same component
  // (src/components/inputs/ContactWayInput.vue).
  type Way = { via: string, name: string, placeholder: Record<string, string> }

  const props = defineProps<{
    ways: readonly Way[]
    lang: string
    readonly?: boolean
  }>()
  const via = defineModel<string>('via', { required: true })
  const value = defineModel<string>({ default: '' })

  const NETWORK: Record<string, keyof typeof SOCIAL_ICONS> = { telegram: 'telegram', viber: 'viber', whatsapp: 'whatsApp' }
  function iconOf (way: string): string | null {
    const network = NETWORK[way]
    return network ? SOCIAL_ICONS[network].color ?? null : null
  }

  const current = computed(() => props.ways.find(way => way.via === via.value) ?? props.ways[0]!)
  const open = ref(false)
  function pick (way: Way) {
    via.value = way.via
    open.value = false
  }
</script>

<template>
  <div class="contact-way-input">
    <v-menu v-model="open" :disabled="props.readonly">
      <template #activator="{ props: menuProps }">
        <button
          v-bind="menuProps"
          :aria-label="current.name"
          class="country-code-button contact-way-input__pick"
          type="button"
        >
          <img v-if="iconOf(current.via)" alt="" class="contact-way-input__icon" :src="iconOf(current.via)!">
          <i v-else aria-hidden="true" class="mdi mdi-email-outline contact-way-input__mail" />
          <span class="contact-way-input__name">{{ current.name }}</span>
          <i aria-hidden="true" class="mdi mdi-chevron-down contact-way-input__chevron" />
        </button>
      </template>
      <v-list density="compact">
        <v-list-item
          v-for="way of props.ways"
          :key="way.via"
          :active="way.via === current.via"
          @click="pick(way)"
        >
          <template #prepend>
            <img v-if="iconOf(way.via)" alt="" class="contact-way-input__icon mr-3" :src="iconOf(way.via)!">
            <i v-else aria-hidden="true" class="mdi mdi-email-outline contact-way-input__mail mr-3" />
          </template>
          {{ way.name }}
        </v-list-item>
      </v-list>
    </v-menu>
    <input
      v-model="value"
      class="contact-way-input__value default-text text-medium text-black"
      :inputmode="current.via === 'email' ? 'email' : (current.via === 'telegram' ? 'text' : 'tel')"
      :placeholder="current.placeholder[props.lang] || current.placeholder.en"
      :readonly="props.readonly"
      :type="current.via === 'email' ? 'email' : 'text'"
    >
  </div>
</template>

<style>
/* The phone field's shape (content/styles/inputs.css .phone-number-input). */
.contact-way-input {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  min-height: 56px;
  background: var(--light-grey-2);
  border-radius: var(--large-border-radius);
}
.contact-way-input .contact-way-input__pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: auto;
  height: 100%;
  cursor: pointer;
}
.contact-way-input__icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.contact-way-input__mail {
  font-size: 26px;
  line-height: 1;
  color: var(--primary);
}
.contact-way-input__name {
  font-size: 15px;
  font-weight: 500;
  color: var(--black);
}
.contact-way-input__chevron {
  font-size: 20px;
  color: var(--grey);
}
.contact-way-input__value {
  min-width: 0;
  height: 100%;
  padding: 0 16px;
  border: none;
  outline: none;
  background: transparent;
}
@media (max-width: 420px) {
  .contact-way-input__name {
    display: none;
  }
}
</style>
