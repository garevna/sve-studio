<template>
  <!-- The editor's own look (SveLookMenu): a window of the editor - its
       side panel and a light/dark disc - so it is not taken for the site's
       palette or style (the site's style has a brush). -->
  <svg
    aria-hidden="true"
    class="sve-look-icon"
    fill="none"
    height="1em"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.7"
    viewBox="0 0 24 24"
    width="1em"
  >
    <rect
      height="16"
      rx="2.5"
      width="19"
      x="2.5"
      y="4"
    />
    <path d="M8.5 4v16" />
    <path d="M4.8 8h1.6M4.8 11h1.6M4.8 14h1.6" />
    <circle cx="15" cy="12" r="3.8" />
    <path d="M15 8.2a3.8 3.8 0 0 1 0 7.6z" fill="currentColor" />
  </svg>
</template>

<style scoped>
.sve-look-icon {
  font-size: 22px;
}
</style>
