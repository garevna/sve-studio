<script setup lang="ts">
  import type { SocialNetwork } from '@/configs/social-networks'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import { socialLinkItem } from '@/configs/components/simple/social-link'
  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS } from '@/configs/social-networks'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'

  // Picks a social network or messenger and hands back a ready line for it
  // (configs/components/simple/social-link.ts) - its icon, name and a link
  // to its address in the general settings. The activator is the caller's
  // (a menu item, a button), via the #activator slot.
  const emit = defineEmits<{ insert: [block: TemplateBlockModel] }>()

  const ajaxStore = useAjaxStore()
  const links = ref<Record<string, string>>({})

  async function onOpen (open: boolean) {
    if (!open) return
    const settings = await ajaxStore.getGlobalSettings()
    links.value = settings?.links || {}
  }

  function pick (network: SocialNetwork) {
    emit('insert', socialLinkItem(network) as TemplateBlockModel)
  }
</script>

<template>
  <v-menu location="end" :open-on-hover="false" @update:model-value="onOpen">
    <template #activator="{ props: menuProps }">
      <slot name="activator" :props="menuProps" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="network of SOCIAL_NETWORKS"
          :key="network"
          link
          :subtitle="links[network] ? undefined : t('socialLinks.noAddress')"
          :title="SOCIAL_NETWORK_LABELS[network]"
          @click="pick(network)"
        />
      </v-list>
    </v-card>
  </v-menu>
</template>
