<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import { contactsIcons } from '../../../assets'

  // import facebook from '@/assets/contacts/facebook-color.svg'
  // import instagram from '@/assets/contacts/instagram-color.svg'
  // import telegram from '@/assets/contacts/telegram-color.svg'
  // import viber from '@/assets/contacts/viber-color.svg'
  // import whatsApp from '@/assets/contacts/whats-app-color.svg'
  // import tiktok from '@/assets/contacts/tik-tok.svg'

  import { useCommonStore } from '../../../stores/common'

  import LiveChat from '../../small/LiveChat.vue'

  const icons = { ...contactsIcons }
  const tooltips = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    telegram: 'Telegram',
    viber: 'Viber',
    whatsApp: 'Whatsapp',
    tiktok: 'Tiltok',
  }

  const { company } = storeToRefs(useCommonStore())

  const links = computed(() => company.value?.links || {})

  const items = computed(() => {
    return Object.keys(links.value).map(key => ({
      tooltip: tooltips[key as keyof typeof tooltips],
      icon: icons[key as keyof typeof icons],
      link: links.value[key as keyof typeof links.value] as string | undefined,
    })).filter(item => item.link)
  })

  // function callback () {}

  function openLink (link: string | undefined) {
    if (link) window.open(link, '_blank')
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
