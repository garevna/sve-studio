<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // Mounted once, in App.vue, OUTSIDE every view's own <v-app>. That's the
  // whole point - these messages have to appear whichever route is active,
  // and there is no shared app shell to host them (each view wraps itself in
  // its own <v-app>).
  //
  // The notifications are therefore plain HTML/CSS rather than <v-snackbar>:
  // a Vuetify overlay outside any <v-app> is at the mercy of whatever theme
  // and layout context it happens to land in, and this is the one component
  // that must never fail to render - it's how the user finds out a save
  // didn't go through. ConfirmDialog below is the deliberate exception: it
  // sets `theme="editorTheme"` on its own card, so it looks the same here as
  // it does inside a view, and reusing it keeps every confirmation in the
  // app looking identical.
  const feedback = useUiFeedbackStore()
  const { notifications, confirmRequest } = storeToRefs(feedback)

  const ICONS = {
    success: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-2h2zm0-4h-2V7h2z',
    warning: 'M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z',
  }
</script>

<template>
  <div aria-live="polite" class="app-feedback">
    <TransitionGroup name="app-feedback-item">
      <div
        v-for="item of notifications"
        :key="item.id"
        :class="['app-feedback-toast', `app-feedback-toast--${item.kind}`]"
        role="status"
      >
        <svg class="app-feedback-icon" height="20" viewBox="0 0 24 24" width="20">
          <path :d="ICONS[item.kind]" fill="currentColor" />
        </svg>
        <div class="app-feedback-body">
          <p class="app-feedback-text">{{ item.text }}</p>
          <p v-if="item.detail" class="app-feedback-detail">{{ item.detail }}</p>
        </div>
        <button
          :aria-label="t('common.close')"
          class="app-feedback-close"
          type="button"
          @click="feedback.dismiss(item.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>

  <!-- attach="body" (forwarded through to VDialog's own prop): without it a
    Vuetify overlay renders in place in the component tree, which here is
    outside every <v-app>. It would still be position:fixed, but it would
    also be at the mercy of any stacking context around it - and a
    confirmation that fails to appear doesn't just look wrong, it leaves the
    delete waiting on a promise that never resolves. -->
  <ConfirmDialog
    attach="body"
    :cancel-text="confirmRequest?.cancelText"
    :confirm-text="confirmRequest?.confirmText"
    :model-value="!!confirmRequest"
    :text="confirmRequest?.text"
    :title="confirmRequest?.title"
    @confirm="feedback.resolveConfirm(true)"
    @update:model-value="value => !value && feedback.resolveConfirm(false)"
  />
</template>

<style scoped>
.app-feedback {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(520px, calc(100vw - 32px));
  /* The stack must never swallow clicks meant for the page underneath - only
     the toasts themselves are interactive. */
  pointer-events: none;
}
.app-feedback-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border-left: solid 4px currentColor;
  background: #fff;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  font-size: 14px;
  line-height: 1.35;
}
.app-feedback-toast--success {
  color: #17A473;
}
.app-feedback-toast--error {
  color: #E15254;
}
.app-feedback-toast--warning {
  color: #C3840F;
}
.app-feedback-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}
.app-feedback-body {
  flex: 1 1 auto;
  min-width: 0;
}
/* Only the icon and the left rule carry the status colour - the words stay
   near-black, which reads better at 14px than coloured body text does. */
.app-feedback-text {
  margin: 0;
  color: #111827;
  font-weight: 500;
}
.app-feedback-detail {
  margin: 4px 0 0;
  color: #5A6679;
  font-size: 13px;
  font-weight: 400;
}
.app-feedback-close {
  flex: 0 0 auto;
  background: none;
  border: none;
  padding: 0 2px;
  font-size: 15px;
  line-height: 1;
  color: #7A8699;
  cursor: pointer;
}
.app-feedback-close:hover {
  color: #111827;
}

.app-feedback-item-enter-active,
.app-feedback-item-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.app-feedback-item-enter-from,
.app-feedback-item-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
