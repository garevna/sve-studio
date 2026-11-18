<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import { SOCIAL_ICONS } from '../../../configs/social-icons'
  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS, socialAddress } from '../../../configs/social-networks'
  import { useCommonStore } from '../../../stores/common'

  import LiveChat from '../../small/LiveChat.vue'

  const { company } = storeToRefs(useCommonStore())

  // Every network with an address in the general settings (Загальні
  // налаштування -> Соціальні мережі), in the settings' order, with the
  // network's own colour icon - the same list, names and addresses as the
  // footer (configs/social-networks.ts), so a network added there shows
  // here too.
  const items = computed(() => SOCIAL_NETWORKS
    .map(network => ({
      tooltip: SOCIAL_NETWORK_LABELS[network],
      icon: SOCIAL_ICONS[network].color || SOCIAL_ICONS[network].mono,
      link: socialAddress(network, company.value?.links as Record<string, string> | undefined),
    }))
    .filter(item => item.link))

  // function callback () {}

  // A web address opens in a new tab; an app's (viber:, tg:...) is handed
  // to the app in place - a new tab for it only said the page is unavailable.
  function openLink (link: string | undefined) {
    if (!link) return
    if (/^https?:/i.test(link)) {
      window.open(link, '_blank')
    } else {
      window.location.href = link
    }
  }
</script>

<template>
  <div class="position-fixed">
    <v-speed-dial
      :close-on-content-click="false"
      direction="up"
      open-on-click
      persistent
      scroll-strategy="close"
      transition="scale-transition"
    >
      <template #activator="{ props: activatorProps, isActive }">
        <live-chat
          background="warning"
          class="cursor-pointer"
          :is-active="isActive"
          picture="white"
          v-bind="activatorProps"
        />
      </template>
      <template v-for="(item, index) in items" :key="index">
        <div
          class="cursor-pointer mb-2"
          @click="item.link ? openLink(item.link) : null"
        >
          <v-tooltip location="left">
            <template #activator="{ props }">
              <img v-bind="props" :src="item.icon" style="width: 40px; height: 40px;">
            </template>
            <span class="tooltip-content">
              {{ item.tooltip }}
            </span>
          </v-tooltip>
        </div>
      </template>
    </v-speed-dial>
  </div>
</template>

<style scoped>
.tooltip-content {
  background-color: var(--secondary);
  color: var(--white);
  font-size: 16px;
  padding: 6px 12px;
  border-radius: var(--small-border-radius);
}
.position-fixed {
  position: fixed;
  bottom: 36px;
  right: 24px;
  z-index: 2000;
}
.interactions-container {
  width: calc(100% - 64px);
}

@media screen and (max-width: 600px) {
  .interactions-container {
    width: calc(100% - 32px);
  }
  .position-fixed {
    bottom: 12px;
    right: 12px;
  }
}
</style>
