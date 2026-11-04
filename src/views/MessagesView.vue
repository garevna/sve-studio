<script lang="ts" setup>
  import type { InboxContact, InboxMessage } from '@/services/inbox'
  import { SveBadge, SveButton, SveIconButton, SveSegmented, SveTextField } from '@sve/editor-ui'
  import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { editorUiLocale, t } from '@/i18n'
  import { InboxError } from '@/services/inbox'
  import { useInboxStore } from '@/stores/inbox'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // "Повідомлення": what visitors wrote through the site's forms, answered
  // right here. The answer goes where one from the messenger chat goes - the
  // visitor's account, and the chat's post of that message.
  const inbox = useInboxStore()
  const feedback = useUiFeedbackStore()

  type Filter = 'waiting' | 'answered' | 'all'
  const filter = ref<Filter>('waiting')
  // Opened with nothing waiting - the whole list rather than an empty one.
  watch(() => inbox.loaded, loaded => {
    if (loaded && inbox.waitingCount === 0) {
      filter.value = 'all'
    }
  }, { immediate: true })

  const answeredCount = computed(() => inbox.messages.length - inbox.waitingCount)
  const filters = computed(() => [
    { value: 'waiting' as const, label: `${t('inbox.filterWaiting')} · ${inbox.waitingCount}` },
    { value: 'answered' as const, label: `${t('inbox.filterAnswered')} · ${answeredCount.value}` },
    { value: 'all' as const, label: `${t('inbox.filterAll')} · ${inbox.messages.length}` },
  ])
  const shown = computed(() => inbox.messages.filter(item => filter.value === 'all' || (item.replies.length === 0) === (filter.value === 'waiting')))
  const emptyText = computed(() => t({ waiting: 'inbox.emptyWaiting', answered: 'inbox.emptyAnswered', all: 'inbox.emptyAll' }[filter.value]))

  const errorText = computed(() => {
    switch (inbox.error) {
      case 'not-admin': { return t('inbox.notAdmin', { email: inbox.user?.email ?? '' })
      }
      case 'domain': { return t('inbox.domainError')
      }
      case 'network': { return t('inbox.networkError')
      }
      case 'server': { return t('inbox.serverError')
      }
      default: { return ''
      }
    }
  })

  // ---- one message ----

  function formatDate (date: Date): string {
    return new Intl.DateTimeFormat(editorUiLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
  }

  const CONTACT_NAMES = { telegram: 'Telegram', viber: 'Viber', whatsapp: 'WhatsApp', email: 'Email' }

  // A link that opens a chat with the visitor in that messenger.
  function contactHref (contact: InboxContact): string {
    const value = contact.value.trim()
    const digits = value.replaceAll(/\D/g, '')
    switch (contact.via) {
      case 'email': { return `mailto:${value}`
      }
      case 'whatsapp': { return `https://wa.me/${digits}`
      }
      case 'viber': { return `viber://chat?number=%2B${digits}`
      }
      default: { return /^[+\d\s()-]+$/.test(value) ? `https://t.me/+${digits}` : `https://t.me/${value.replace(/^@/, '')}`
      }
    }
  }

  // The answer being written to each message, by its id.
  const drafts = reactive<Record<string, string>>({})
  const sending = ref<string | null>(null)
  // "Ctrl+Enter" means nothing on a phone.
  const keyboardHint = window.matchMedia('(pointer: fine)').matches ? t('inbox.replyHint') : undefined

  async function send (message: InboxMessage) {
    const text = (drafts[message.id] ?? '').trim()
    if (!text || sending.value) {
      return
    }
    sending.value = message.id
    try {
      const inTelegram = await inbox.reply(message.id, text)
      drafts[message.id] = ''
      if (inTelegram) {
        feedback.notifySuccess(t('inbox.sent'))
      } else {
        feedback.notifyWarning(t('inbox.sent'), t('inbox.sentNotInTelegram'))
      }
    } catch (error) {
      feedback.notifyError(t('inbox.sendFailed'), error instanceof InboxError ? error.message : String(error))
    } finally {
      sending.value = null
    }
  }

  const removing = ref<string | null>(null)

  async function remove (message: InboxMessage) {
    const sure = await feedback.confirm({
      title: t('inbox.deleteTitle'),
      text: t('inbox.deleteText', { name: message.name || message.email }),
    })
    if (!sure) {
      return
    }
    removing.value = message.id
    try {
      await inbox.remove(message.id)
      feedback.notifySuccess(t('inbox.deleted'))
    } catch (error) {
      feedback.notifyError(t('inbox.deleteFailed'), error instanceof InboxError ? error.message : String(error))
    } finally {
      removing.value = null
    }
  }

  function onKeydown (event: KeyboardEvent, message: InboxMessage) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void send(message)
    }
  }

  // Back to the tab - the list may have grown meanwhile.
  function onFocus () {
    if (inbox.user && !inbox.loading) {
      void inbox.load()
    }
  }

  onMounted(() => {
    void inbox.start()
    window.addEventListener('focus', onFocus)
  })
  onBeforeUnmount(() => window.removeEventListener('focus', onFocus))
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :detail="inbox.user?.email || t('inbox.detail')" :title="t('inbox.title')">
        <template v-if="inbox.user" #actions>
          <SveIconButton
            :disabled="inbox.loading"
            icon="mdi-refresh"
            :label="t('inbox.refresh')"
            @click="inbox.load()"
          />
          <SveIconButton icon="mdi-logout" :label="t('inbox.signOut')" @click="inbox.signOut()" />
        </template>
      </EditorPageHeader>

      <v-progress-linear v-if="!inbox.ready || inbox.loading" color="primary" indeterminate />

      <div v-if="inbox.ready" class="sve-ui inbox">
        <!-- Nothing to sign in to: global.json sets up no inbox. -->
        <section v-if="!inbox.configured" class="inbox__notice">
          <i class="sve-icon mdi mdi-message-off-outline inbox__notice-icon" />
          <p>{{ t('inbox.notConfigured') }}</p>
        </section>

        <section v-else-if="!inbox.user || inbox.error === 'not-admin'" class="inbox__notice">
          <i class="sve-icon mdi mdi-message-text-lock-outline inbox__notice-icon" />
          <h2 class="inbox__notice-title">{{ t('inbox.signInTitle') }}</h2>
          <p>{{ errorText || t('inbox.signInText') }}</p>
          <SveButton icon="mdi-google" variant="primary" @click="inbox.signIn()">
            {{ inbox.user ? t('inbox.switchAccount') : t('inbox.signInGoogle') }}
          </SveButton>
        </section>

        <template v-else>
          <p v-if="errorText" class="inbox__error">{{ errorText }}</p>

          <template v-if="inbox.loaded">
            <SveSegmented v-model="filter" class="inbox__filter" :options="filters" />

            <p v-if="shown.length === 0" class="inbox__empty">{{ emptyText }}</p>

            <article
              v-for="message of shown"
              :key="message.id"
              :class="['inbox-card', { 'inbox-card--waiting': message.replies.length === 0 }]"
            >
              <header class="inbox-card__head">
                <i
                  :class="['sve-icon mdi inbox-card__status', message.replies.length === 0 ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline']"
                />
                <div class="inbox-card__who">
                  <span class="inbox-card__name">
                    {{ message.name || message.email }}
                    <SveBadge v-if="message.kind !== 'message'">{{ message.kind }}</SveBadge>
                  </span>
                  <span class="inbox-card__meta">
                    <span v-if="message.name && message.email">{{ message.email }}</span>
                    <span>{{ formatDate(message.createdAt) }}</span>
                    <span v-if="message.locale">{{ message.locale.toUpperCase() }}</span>
                  </span>
                </div>
                <a
                  v-if="message.contact"
                  class="inbox-card__contact"
                  :href="contactHref(message.contact)"
                  rel="noopener"
                  target="_blank"
                >
                  <i class="sve-icon mdi mdi-chat-outline" />
                  {{ CONTACT_NAMES[message.contact.via] ?? message.contact.via }}: {{ message.contact.value }}
                </a>
                <SveIconButton
                  class="inbox-card__delete"
                  :disabled="removing === message.id"
                  icon="mdi-delete-outline"
                  :label="t('inbox.delete')"
                  size="sm"
                  @click="remove(message)"
                />
              </header>

              <p class="inbox-card__text">{{ message.text }}</p>

              <ul v-if="message.replies.length > 0" class="inbox-card__replies">
                <li v-for="(answer, index) of message.replies" :key="index" class="inbox-card__reply">
                  <i class="sve-icon mdi mdi-handshake-outline inbox-card__reply-icon" />
                  <div>
                    <span class="inbox-card__reply-time">{{ formatDate(answer.at) }}</span>
                    <p class="inbox-card__reply-text">{{ answer.text }}</p>
                  </div>
                </li>
              </ul>

              <div class="inbox-card__answer" @keydown="onKeydown($event, message)">
                <SveTextField
                  v-model="drafts[message.id]"
                  class="inbox-card__field"
                  :hint="keyboardHint"
                  :placeholder="t('inbox.replyPlaceholder')"
                  :rows="2"
                />
                <SveButton
                  class="inbox-card__send"
                  :disabled="!(drafts[message.id] ?? '').trim()"
                  icon="mdi-send-outline"
                  :loading="sending === message.id"
                  variant="primary"
                  @click="send(message)"
                >
                  {{ t('inbox.send') }}
                </SveButton>
              </div>
            </article>
          </template>
        </template>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.inbox {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
  margin-inline: auto;
  color: var(--sve-text);
}

.inbox__notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 460px;
  margin: clamp(16px, 8vh, 72px) auto 0;
  color: var(--sve-text-muted);
  text-align: center;
  line-height: 1.5;
}
.inbox__notice p { margin: 0; }
.inbox__notice-icon { color: var(--sve-text-subtle); font-size: 44px; }
.inbox__notice-title { margin: 0; color: var(--sve-text); font-size: 20px; font-weight: 700; }

.inbox__error { margin: 0; color: var(--sve-danger); }
.inbox__filter { align-self: center; max-width: 100%; }
.inbox__empty { margin: 24px 0; color: var(--sve-text-subtle); text-align: center; }

.inbox-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px clamp(14px, 3vw, 20px);
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
}
.inbox-card--waiting { border-left: solid 3px var(--sve-warning); }

.inbox-card__head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 10px 12px; }
.inbox-card__status { flex: none; margin-top: 1px; color: var(--sve-primary); font-size: 22px; }
.inbox-card--waiting .inbox-card__status { color: var(--sve-warning); }
.inbox-card__who { display: flex; flex: 1 1 200px; flex-direction: column; gap: 2px; min-width: 0; }
.inbox-card__name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 600; overflow-wrap: anywhere; }
.inbox-card__meta { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--sve-text-subtle); font-size: 13px; overflow-wrap: anywhere; }

.inbox-card__contact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: var(--sve-radius-md);
  background: var(--sve-surface-muted);
  color: var(--sve-text-muted);
  font-size: 13px;
  text-decoration: none;
  overflow-wrap: anywhere;
}
.inbox-card__contact:hover { color: var(--sve-primary); }
.inbox-card__delete { flex: none; margin-left: auto; }
.inbox-card__contact + .inbox-card__delete { margin-left: 0; }

.inbox-card__text { margin: 0; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }

.inbox-card__replies {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 12px 0 0;
  border-top: solid 1px var(--sve-border);
  list-style: none;
}
.inbox-card__reply { display: flex; gap: 10px; }
.inbox-card__reply-icon { flex: none; color: var(--sve-primary); font-size: 18px; }
.inbox-card__reply-time { color: var(--sve-text-subtle); font-size: 12px; }
.inbox-card__reply-text { margin: 2px 0 0; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }

.inbox-card__answer { display: flex; align-items: flex-start; gap: 10px; }
.inbox-card__field { flex: 1; min-width: 0; }
.inbox-card__send { flex: none; margin-top: 2px; }

/* A phone: the button under the field, full width. */
@media (max-width: 560px) {
  .inbox-card__answer { flex-direction: column; align-items: stretch; }
  .inbox-card__send { justify-content: center; }
}
</style>
