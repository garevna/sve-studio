<script setup lang="ts">
  import { usePageBlocks } from '@/composables/usePageBlocks'
  import { t } from '@/i18n'

  // A place on the page a new block can go: a thin line with "+" that shows
  // in the space between two blocks when pointed at (always visible on a
  // touch screen), or - with `end` - the "add a block" place after the last
  // block. Opens the block gallery for that very spot.
  //
  // position: the unit the new block goes before (usePageBlocks).
  // offset: between blocks, how far above its block the gap's middle is
  //         (half the space between blocks).
  const props = defineProps<{ position: number | null, end?: boolean, offset?: number }>()

  const pageBlocks = usePageBlocks()
</script>

<template>
  <div
    v-if="props.end"
    class="sve-ui sve-insert-end"
    role="button"
    tabindex="0"
    @click="pageBlocks.openGallery(null)"
    @keydown.enter.prevent="pageBlocks.openGallery(null)"
  >
    <i class="sve-icon mdi mdi-plus" />
    {{ t('blockMenu.addBlock') }}
  </div>
  <div
    v-else
    class="sve-ui sve-insert-gap"
    :style="{ top: `${-(props.offset ?? 24)}px` }"
  >
    <span class="sve-insert-gap__line" />
    <span
      class="sve-insert-gap__button"
      role="button"
      tabindex="0"
      :title="t('block.addHere')"
      @click="pageBlocks.openGallery(props.position)"
      @keydown.enter.prevent="pageBlocks.openGallery(props.position)"
    >
      <i class="sve-icon mdi mdi-plus" />
      <span class="sve-insert-gap__label">{{ t('blockMenu.addBlock') }}</span>
    </span>
    <span class="sve-insert-gap__line" />
  </div>
</template>
