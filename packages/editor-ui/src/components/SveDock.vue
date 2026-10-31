<script setup lang="ts">
  import { kitLabels } from '../labels'
</script>

<template>
  <!-- The bar of a screen's tools at the bottom of a phone screen, in reach
    of a thumb - the top bar there keeps only "back", the title and the
    main action. Shown on narrow screens only; on a wide one the same tools
    are on the top bar. -->
  <nav :aria-label="kitLabels.tools" class="sve-ui sve-dock">
    <slot />
  </nav>
</template>
