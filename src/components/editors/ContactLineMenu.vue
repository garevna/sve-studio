<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { useSiteContacts } from '@/composables/useSiteContacts'
  import { contactLine } from '@/configs/components/simple/contact-line'
  import { CONTACT_ICONS, contactText } from '@/configs/site-contacts'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'

  // Picks one of the site's contacts (general settings) and hands back a
  // ready line for it (configs/components/simple/contact-line.ts). The
  // activator is the caller's, via the #activator slot - the same shape as
  // SocialLinkMenu.vue.
  const emit = defineEmits<{ insert: [block: TemplateBlockModel] }>()
  const { contacts } = useSiteContacts()
  const commonStore = useCommonStore()
</script>

<template>
  <v-menu location="end">
    <template #activator="{ props: menuProps }">
      <slot name="activator" :props="menuProps" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="contact of contacts"
          :key="contact.id"
          link
          :prepend-icon="CONTACT_ICONS[contact.kind]"
          :title="contactText(contact, commonStore.locale) || t(`contacts.kind.${contact.kind}`)"
          @click="emit('insert', contactLine(contact) as TemplateBlockModel)"
        />
        <v-list-item v-if="contacts.length === 0" disabled :title="t('contacts.none')" />
      </v-list>
    </v-card>
  </v-menu>
</template>
