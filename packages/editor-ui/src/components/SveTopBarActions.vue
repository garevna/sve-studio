<template>
  <!-- Puts its content on the screen's top bar, wherever in the screen it
    is written - e.g. a form's Save button, kept next to the form's own
    code. `defer`: the bar is rendered in the same pass, by SvePage. -->
  <Teleport defer to="#sve-topbar-actions">
    <slot />
  </Teleport>
</template>
