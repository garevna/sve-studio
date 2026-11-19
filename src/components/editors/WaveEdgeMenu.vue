<script setup lang="ts">
  import type { WaveEdgeSide } from '@/configs/site-style'
  import { SveMenu, SveMenuItem, SveMenuLabel } from '@sve/editor-ui'
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { WAVE_EDGE_SIDES } from '@/configs/site-style'
  import { t } from '@/i18n'

  // «Хвиля» on one picture: which of its edges waves under the pointer
  // (utils/wave-edge.ts) - the site's edge (the «Стиль сайту» menu), one of
  // its own, or none. Kept as a wave-edge-<side> class in the block's class
  // list, read by content/styles/site-styles.css on the site as here.
  const className = defineModel<string | undefined>({ default: undefined })

  type Choice = WaveEdgeSide | 'none' | 'site'
  const CHOICES: Choice[] = ['site', ...WAVE_EDGE_SIDES, 'none']
  const PATTERN = /^wave-edge-(?:bottom|top|left|right|none)$/

  const tokens = computed(() => (className.value ?? '').split(/\s+/).filter(Boolean))
  const current = computed<Choice>(() => {
    const own = tokens.value.find(token => PATTERN.test(token))
    return own ? own.slice('wave-edge-'.length) as Choice : 'site'
  })

  function choose (choice: Choice) {
    const rest = tokens.value.filter(token => !PATTERN.test(token))
    if (choice !== 'site') {
      rest.push(`wave-edge-${choice}`)
    }
    className.value = rest.join(' ') || undefined
  }

  function label (choice: Choice): string {
    if (choice === 'site') return t('kit.waveEdgeSite')
    if (choice === 'none') return t('kit.waveEdgeNone')
    return t(`kit.waveEdges.${choice}`)
  }
</script>

<template>
  <SveMenu :min-width="200">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton icon="mdi-wave" :tooltip="t('kit.waveEdgeImage')" v-bind="menuProps" />
    </template>
    <SveMenuLabel>{{ t('kit.waveEdgeImage') }}</SveMenuLabel>
    <SveMenuItem
      v-for="choice of CHOICES"
      :key="choice"
      :icon="current === choice ? 'mdi-check' : 'mdi-blank'"
      @click="choose(choice)"
    >
      {{ label(choice) }}
    </SveMenuItem>
  </SveMenu>
</template>
