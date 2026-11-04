<script setup lang="ts">
  import { computed, ref } from 'vue'
  import FeedbackPopup from '../components/template-components/FeedbackPopup.vue'
  import { AUTH_TEXTS } from '../configs/auth-texts'
  import { useAuthStore } from '../stores/auth'
  import { useCommonStore } from '../stores/common'
  import { useMessagesStore } from '../stores/messages'
  import AuthPage from './AuthPage.vue'

  // The visitor's own page: who they are, signing out - and, next, their
  // messages from the feedback forms with the replies to them.
  // Not signed in: the sign-in form right here (it comes back to this page).
  // The demo's own look, pw-account-* (see AuthPage.vue's pw-auth-*).
  const auth = useAuthStore()
  const commonStore = useCommonStore()
  const messages = useMessagesStore()
  // "Написати нам": the form in a window, right here; once sent it closes
  // and the message is already in the list below.
  const writing = ref(false)
  function onSent () {
    setTimeout(() => {
      writing.value = false
    }, 1600)
  }
  const when = (date: Date) => date.toLocaleString(commonStore.locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  type Lang = 'uk' | 'en' | 'de'
  const lang = computed(() => (['uk', 'en', 'de'].includes(commonStore.locale) ? commonStore.locale : 'en') as Lang)
  const say = (words: { uk: string, en: string, de: string }) => words[lang.value]

  const displayName = computed(() => auth.user?.name || auth.user?.email.split('@')[0] || '')
  const initials = computed(() => displayName.value.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase())
  const via = computed(() => ({ google: 'Google', github: 'GitHub' } as Record<string, string>)[auth.user?.provider || ''] || say(AUTH_TEXTS.viaPassword))
</script>

<template>
  <div v-if="!auth.ready" class="pw-account pw-account--wait">
    <v-progress-circular color="primary" indeterminate />
  </div>
  <AuthPage v-else-if="!auth.user" />
  <div v-else class="pw-account">
    <section class="pw-account__profile">
      <div class="pw-account__avatar">
        <img v-if="auth.user.photo" alt="" referrerpolicy="no-referrer" :src="auth.user.photo">
        <span v-else>{{ initials }}</span>
      </div>
      <div class="pw-account__who">
        <p class="pw-account__kicker">{{ say(AUTH_TEXTS.accountTitle) }}</p>
        <h1 class="pw-account__name">{{ displayName }}</h1>
        <p class="pw-account__email">{{ auth.user.email }}</p>
        <p class="pw-account__via">{{ say(AUTH_TEXTS.signedInWith) }} {{ via }}</p>
      </div>
      <button class="pw-account__sign-out" :disabled="auth.busy" type="button" @click="auth.signOut()">
        <i aria-hidden="true" class="mdi mdi-logout" />
        {{ say(AUTH_TEXTS.signOut) }}
      </button>
    </section>

    <section class="pw-account__section">
      <div class="pw-account__section-head">
        <h2 class="pw-account__section-title">{{ say(AUTH_TEXTS.messagesTitle) }}</h2>
        <button class="pw-account__write" type="button" @click="writing = true">
          <i aria-hidden="true" class="mdi mdi-pencil-outline" />
          {{ say(AUTH_TEXTS.writeToUs) }}
        </button>
      </div>
      <v-progress-linear v-if="messages.loading" color="primary" indeterminate rounded />
      <p v-else-if="messages.failed" class="pw-account__empty">{{ say(AUTH_TEXTS.messagesFailed) }}</p>
      <p v-else-if="messages.list.length === 0" class="pw-account__empty">{{ say(AUTH_TEXTS.messagesEmpty) }}</p>
      <ol v-else class="pw-account__messages">
        <li v-for="message of messages.list" :key="message.id" class="pw-account__message">
          <div class="pw-account__message-head">
            <time class="pw-account__time">{{ when(message.createdAt) }}</time>
            <span :class="['pw-account__badge', { 'pw-account__badge--answered': message.replies.length > 0 }]">
              {{ say(message.replies.length > 0 ? AUTH_TEXTS.answered : AUTH_TEXTS.waiting) }}
            </span>
          </div>
          <p class="pw-account__text">{{ message.text }}</p>
          <div v-for="(answer, index) of message.replies" :key="index" class="pw-account__reply">
            <p class="pw-account__reply-who">
              <i aria-hidden="true" class="mdi mdi-reply" />
              {{ say(AUTH_TEXTS.replyFrom) }} · {{ when(answer.at) }}
            </p>
            <p class="pw-account__text">{{ answer.text }}</p>
          </div>
        </li>
      </ol>
    </section>

    <FeedbackPopup
      v-model="writing"
      :title="AUTH_TEXTS.popupTitle"
      type="message"
      @sent="onSent"
    />
  </div>
</template>

<style scoped>
.pw-account {
  max-width: 880px;
  margin: 56px auto 96px;
  padding-inline: 16px;
  display: grid;
  gap: 24px;
}
.pw-account--wait {
  justify-items: center;
  padding-block: 96px;
}

.pw-account__profile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px 24px;
  padding: 32px;
  border-radius: var(--large-border-radius, 36px);
  color: var(--white);
  background: var(--night-sky-gradient, linear-gradient(135deg, var(--primary), var(--secondary)));
  box-shadow: 0 24px 64px rgb(21 42 104 / 0.14);
}
.pw-account__avatar {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--secondary);
  border: 3px solid rgb(255 255 255 / 0.6);
  font-size: 30px;
  font-weight: 700;
}
.pw-account__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pw-account__who {
  flex: 1 1 240px;
  min-width: 0;
}
.pw-account__kicker {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}
.pw-account__name {
  margin: 4px 0;
  font-size: 30px;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.pw-account__email,
.pw-account__via {
  font-size: 15px;
  color: var(--accent);
  overflow-wrap: anywhere;
}
.pw-account__via {
  font-size: 13px;
  opacity: 0.8;
}
.pw-account__sign-out {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.6);
  color: var(--white);
  font-weight: 600;
  transition: background 0.15s ease;
}
.pw-account__sign-out:hover {
  background: rgb(255 255 255 / 0.12);
}

.pw-account__section {
  padding: 28px 32px;
  border-radius: var(--large-border-radius, 36px);
  background: var(--white);
  border: 1px solid var(--light-grey-1);
}
.pw-account__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.pw-account__section-head .pw-account__section-title {
  margin-bottom: 0;
}
.pw-account__write {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  color: var(--white);
  background: var(--secondary);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}
.pw-account__messages {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
}
.pw-account__message {
  padding: 18px 20px;
  border-radius: 20px;
  background: var(--light-grey-2);
}
.pw-account__message-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.pw-account__time {
  font-size: 13px;
  color: var(--grey);
}
.pw-account__badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--warning);
  background: var(--light-warning);
}
.pw-account__badge--answered {
  color: var(--success);
  background: var(--light-green);
}
.pw-account__text {
  font-size: 15px;
  line-height: 1.5;
  color: var(--black);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.pw-account__reply {
  margin: 12px 0 0 20px;
  padding: 14px 16px;
  border-radius: 16px 16px 16px 4px;
  background: var(--white);
  border-left: 3px solid var(--secondary);
}
.pw-account__reply-who {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--secondary);
  margin-bottom: 4px;
}
.pw-account__section-title {
  font-size: 22px;
  color: var(--primary);
  margin-bottom: 12px;
}
.pw-account__empty {
  font-size: 15px;
  line-height: 1.5;
  color: var(--dark-grey);
}

@media screen and (max-width: 600px) {
  .pw-account {
    margin-top: 24px;
  }
  .pw-account__profile,
  .pw-account__section {
    padding: 24px 20px;
  }
}
</style>
