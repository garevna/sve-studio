<script setup lang="ts">
  import type { ContactKind, SiteContact } from '@/configs/site-contacts'
  import { computed, ref } from 'vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import { CONTACT_ICONS, CONTACT_KINDS, newContactId } from '@/configs/site-contacts'
  import { t } from '@/i18n'
  import { siteLocales } from '@/utils/locale-text'

  // The site's contacts (global.json contacts) - the one place a phone, an
  // email or the address is typed; lines on the pages and in the footer
  // refer to them (configs/site-contacts.ts).
  const contacts = defineModel<SiteContact[]>({ default: () => [] })

  const locales = computed(() => siteLocales())

  function add (kind: ContactKind) {
    const contact: SiteContact = { id: newContactId(contacts.value), kind }
    if (kind === 'phone' || kind === 'email') contact.value = ''
    else contact.text = Object.fromEntries(locales.value.map(locale => [locale, '']))
    contacts.value = [...contacts.value, contact]
  }

  function setValue (contact: SiteContact, value: string) {
    contact.value = value
    contacts.value = [...contacts.value]
  }
  function setText (contact: SiteContact, locale: string, value: string) {
    contact.text = { ...contact.text, [locale]: value }
    contacts.value = [...contacts.value]
  }

  // A contact in use leaves its lines empty when it goes - asked first.
  const removing = ref<SiteContact | null>(null)
  const removeOpen = ref(false)
  function askRemove (contact: SiteContact) {
    removing.value = contact
    removeOpen.value = true
  }
  function remove () {
    contacts.value = contacts.value.filter(contact => contact !== removing.value)
    removeOpen.value = false
  }
</script>

<template>
  <div class="contacts-settings">
    <div v-for="contact of contacts" :key="contact.id" class="contacts-settings-row">
      <v-icon class="contacts-settings-icon" :icon="CONTACT_ICONS[contact.kind]" :title="t(`contacts.kind.${contact.kind}`)" />
      <div class="contacts-settings-fields">
        <v-text-field
          v-if="contact.kind === 'phone' || contact.kind === 'email'"
          density="compact"
          hide-details
          :label="t(`contacts.value.${contact.kind}`)"
          :model-value="contact.value"
          :type="contact.kind === 'email' ? 'email' : 'tel'"
          variant="outlined"
          @update:model-value="(value: string) => setValue(contact, value)"
        />
        <template v-else>
          <v-text-field
            v-for="locale of locales"
            :key="locale"
            density="compact"
            hide-details
            :label="`${t(`contacts.kind.${contact.kind}`)} (${locale.toUpperCase()})`"
            :model-value="contact.text?.[locale] ?? ''"
            variant="outlined"
            @update:model-value="(value: string) => setText(contact, locale, value)"
          />
        </template>
      </div>
      <v-btn icon="mdi-delete-outline" :title="t('contacts.remove')" variant="text" @click="askRemove(contact)" />
    </div>

    <div class="contacts-settings-add">
      <span>{{ t('common.add') }}:</span>
      <v-btn
        v-for="kind of CONTACT_KINDS"
        :key="kind"
        :prepend-icon="CONTACT_ICONS[kind]"
        size="small"
        variant="outlined"
        @click="add(kind)"
      >
        {{ t(`contacts.kind.${kind}`) }}
      </v-btn>
    </div>

    <ConfirmDialog
      v-model="removeOpen"
      :confirm-text="t('contacts.remove')"
      :text="t('contacts.removeText')"
      :title="t('contacts.removeTitle')"
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.contacts-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.contacts-settings-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.contacts-settings-icon {
  margin-top: 8px;
  color: #7a8699;
}
.contacts-settings-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}
.contacts-settings-add {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}
</style>
