<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{
    background?: string
    picture?: string
    isActive?: boolean
  }>()

  const foneFill = computed(() => props.background ? `var(--${props.background})` : 'var(--warning)')
  const pictureFill = computed(() => props.picture ? `var(--${props.picture})` : 'var(--white)')
</script>

<template>
  <div class="icon-background">
    <template v-if="!props.isActive">
      <svg
        fill="none"
        height="30"
        viewBox="0 0 32 32"
        width="36"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          class="live-chat-picture"
          d="M11.2667 12.6981H23.3667M11.2667 16.4717H23.3667M4.8104 23.5777C2.4311 21.1909 1 18.1215 1 14.7736C1 7.16679 8.38723 1 17.5 1C26.6128 1 34 7.16679 34 14.7736C34 22.3804 26.6128 28.5472 17.5 28.5472C15.6278 28.5472 13.8286 28.2868 12.1511 27.8072L12 27.7925L5.03333 31V23.8219L4.8104 23.5777Z"
        />
      </svg>
    </template>
    <template v-else>
      <v-icon color="white" large>mdi-close</v-icon>
    </template>
  </div>
</template>

<style scoped>
  .live-chat-picture {
    fill: none;
    stroke: v-bind(pictureFill);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-miterlimit: 10;
  }

  .icon-background {
    border-radius: 50%;
    background-color: v-bind(foneFill);
    width: 54px;
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 12px 0 rgba(0, 0, 0, 0.3);
    transition: box-shadow 0.3s ease;
  }
  .icon-background:hover {
    box-shadow: 0 0 16px 0 rgba(0, 0, 0, 0.4);
  }
  .live-chat-fone {
    fill: v-bind(foneFill);
  }
</style>
