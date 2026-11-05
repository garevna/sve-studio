<script setup lang="ts">
  import type { Answers, Money } from '../../configs/price-calculator'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useSiteNavigation } from '../../composables/site-navigation'
  import { calculate, complete, describe, QUESTIONS } from '../../configs/price-calculator'
  import { TEXTS } from '../../configs/price-calculator-texts'
  import { AUTH_PAGE_ID } from '../../services/site-links'
  import { useAuthStore } from '../../stores/auth'
  import { useCommonStore } from '../../stores/common'
  import { useMessagesStore } from '../../stores/messages'
  import { askAi } from '../../utils/ai-transport'
  import { sendFeedback } from '../../utils/feedback-transport'

  // A quick quote from six answers, on the offer page.
  //
  // Two halves, deliberately split: the FIGURE is arithmetic over the rate
  // card (configs/price-calculator.ts) and is right every time; the few
  // sentences beside it come from the AI assistant, which is given the
  // finished figure and forbidden to produce one of its own. So the
  // assistant is visible doing real work, and a model having a bad day
  // cannot misprice anything.
  //
  // Signed-in visitors only. The worker counts its daily budget per account
  // and refuses anything else, so the form offers sign-in rather than a
  // button that would fail.

  const commonStore = useCommonStore()
  const { locale, aiEndpoint, feedbackEndpoint } = storeToRefs(commonStore)
  const auth = useAuthStore()
  const messages = useMessagesStore()
  const { pagePath } = useSiteNavigation()

  type Lang = 'uk' | 'en' | 'de'
  const lang = computed(() => (locale.value as Lang))
  const t = computed(() => TEXTS[lang.value])

  const answers = ref<Answers>({})
  const money = ref<Money | null>(null)
  const comment = ref('')
  const busy = ref(false)
  // The budget is gone: the figure is still shown (it owes nothing to the
  // assistant), and this says when the words come back.
  const limitUntil = ref('')
  const limitOpen = ref(false)

  const ready = computed(() => complete(answers.value))
  const signedIn = computed(() => Boolean(auth.user))
  const authPath = computed(() => pagePath(AUTH_PAGE_ID))

  const resetsText = computed(() => {
    if (!limitUntil.value) return ''
    const at = new Date(limitUntil.value)
    return Number.isNaN(at.getTime()) ? '' : at.toLocaleString(lang.value, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' })
  })

  function moneyText (pair: [number, number]): string {
    return pair[0] === pair[1] ? `$${pair[0]}` : `$${pair[0]} – $${pair[1]}`
  }

  // The finished quote goes where the owner will see it before invoicing:
  // the same path a feedback message takes - saved in the visitor's account
  // (Firestore) and posted to the owner's private Telegram channel, where it
  // can be answered. `kind: 'quote'` is what tells the two apart.
  async function keep (summary: string) {
    const messageId = await messages.create({
      name: auth.user?.name || '',
      email: auth.user?.email || '',
      contact: null,
      kind: 'quote',
      text: summary,
      page: typeof location === 'undefined' ? '' : location.pathname,
      locale: lang.value,
    })
    await sendFeedback(feedbackEndpoint.value, {
      messageId: messageId ?? undefined,
      kind: 'quote',
      locale: lang.value,
      page: typeof location === 'undefined' ? '' : location.pathname,
      fields: { name: auth.user?.name || '', email: auth.user?.email || '', message: summary },
    })
  }

  async function run () {
    if (!ready.value || busy.value) {
      return
    }
    busy.value = true
    comment.value = ''
    limitUntil.value = ''
    // The figure first and on its own: whatever happens next, the visitor
    // has an answer.
    const figure = calculate(answers.value)
    money.value = figure
    const summary = describe(answers.value, figure, lang.value)

    const answer = await askAi(aiEndpoint.value, await auth.idToken(), {
      task: 'quote',
      locale: lang.value,
      text: summary,
      context: 'Pagewright: a visual editor for multilingual websites, where the owner answers customers from Telegram',
    })
    if (answer.ok && typeof answer.result === 'string') {
      comment.value = answer.result
    } else if (answer.error === 'daily-limit' || answer.error === 'visitor-limit') {
      limitUntil.value = answer.resetsAt || ''
      limitOpen.value = true
    }

    // Kept whether or not the assistant had anything to add - the answers
    // are what the owner needs, the sentences are a nicety.
    await keep(comment.value ? `${summary}\n\n${comment.value}` : summary)
    busy.value = false
  }

  function reset () {
    answers.value = {}
    money.value = null
    comment.value = ''
    limitUntil.value = ''
  }
</script>

<template>
  <div class="price-calculator">
    <p class="h4 text-bold text-primary mb-2">{{ t.title }}</p>
    <p class="default-text text-thin text-grey mb-6">{{ t.intro }}</p>

    <!-- Nobody signed in: say why, and offer the one thing that helps.
      A button that would answer 401 is worse than no button. -->
    <div v-if="!signedIn" class="price-calculator-gate">
      <v-icon class="mb-2" color="primary" icon="mdi-account-lock-outline" size="32" />
      <p class="default-text text-medium text-black mb-2">{{ t.signInTitle }}</p>
      <p class="small-text text-thin text-grey mb-4">{{ t.signInWhy }}</p>
      <v-btn class="primary-button" :to="authPath || undefined">{{ t.signInButton }}</v-btn>
    </div>

    <template v-else>
      <div
        v-for="question of QUESTIONS"
        :key="question.id"
        class="price-calculator-question"
      >
        <p class="default-text text-medium text-black mb-2">{{ question.label[lang] }}</p>
        <div class="price-calculator-options">
          <button
            v-for="option of question.options"
            :key="option.id"
            :aria-pressed="answers[question.id] === option.id"
            :class="['price-calculator-option', { 'price-calculator-option--on': answers[question.id] === option.id }]"
            type="button"
            @click="answers[question.id] = option.id"
          >
            {{ option.label[lang] }}
          </button>
        </div>
      </div>

      <div class="price-calculator-actions">
        <v-btn
          class="primary-button"
          :disabled="!ready || busy"
          :loading="busy"
          @click="run"
        >
          {{ t.calculate }}
        </v-btn>
        <v-btn v-if="money" variant="text" @click="reset">{{ t.again }}</v-btn>
      </div>
      <p v-if="!ready" class="small-text text-thin text-grey mt-2">{{ t.answerAll }}</p>

      <div v-if="money" class="price-calculator-result">
        <div class="price-calculator-figures">
          <div>
            <p class="small-text text-thin text-grey">{{ t.setup }}</p>
            <p class="h3 text-bold text-primary">{{ moneyText(money.setup) }}</p>
          </div>
          <div v-if="money.monthly[1] > 0">
            <p class="small-text text-thin text-grey">{{ t.monthly }}</p>
            <p class="h3 text-bold text-primary">{{ moneyText(money.monthly) }}</p>
          </div>
          <div>
            <p class="small-text text-thin text-grey">{{ t.weeks }}</p>
            <p class="h3 text-bold text-primary">{{ money.weeks[0] }}–{{ money.weeks[1] }}</p>
          </div>
        </div>

        <p v-if="comment" class="default-text text-thin text-black price-calculator-comment">{{ comment }}</p>
        <p v-else-if="limitUntil" class="small-text text-thin text-grey">{{ t.limitShort }}</p>

        <p class="small-text text-thin text-grey mt-4">{{ t.saved }}</p>
        <p class="small-text text-thin text-grey">{{ t.estimate }}</p>
      </div>
    </template>

    <!-- The day's budget is spent. The figure above is unaffected - it never
      needed the assistant - so this says what is missing and when it is
      back, rather than pretending the whole thing failed. -->
    <v-dialog v-model="limitOpen" max-width="420">
      <div class="price-calculator-limit">
        <v-icon class="mb-3" color="warning" icon="mdi-timer-sand" size="36" />
        <p class="h4 text-bold text-black mb-3">{{ t.limitTitle }}</p>
        <p class="default-text text-thin text-grey mb-2">{{ t.limitBody }}</p>
        <p v-if="resetsText" class="default-text text-medium text-primary mb-4">{{ t.limitWhen }} {{ resetsText }}</p>
        <v-btn class="primary-button" @click="limitOpen = false">{{ t.limitClose }}</v-btn>
      </div>
    </v-dialog>
  </div>
</template>

<style scoped>
.price-calculator {
  background: var(--white);
  border: var(--light-border);
  border-radius: var(--default-border-radius);
  padding: 32px;
  max-width: 760px;
  margin-inline: auto;
}
.price-calculator-gate {
  text-align: center;
  padding: 24px 0;
}
.price-calculator-question {
  margin-bottom: 24px;
}
.price-calculator-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* The same pill as the feedback form's contact switch, so the page has one
   way of asking a short question, not two. */
.price-calculator-option {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--light-grey-1);
  font-size: 14px;
  text-align: left;
  color: var(--dark-grey);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.price-calculator-option:hover {
  border-color: var(--secondary);
}
.price-calculator-option--on {
  border-color: var(--secondary);
  background: var(--secondary);
  color: var(--white);
}
.price-calculator-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.price-calculator-result {
  margin-top: 28px;
  padding-top: 24px;
  border-top: var(--light-border);
}
.price-calculator-figures {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin-bottom: 20px;
}
.price-calculator-comment {
  white-space: pre-line;
  background: var(--light-grey-2);
  border-radius: var(--extra-small-border-radius);
  padding: 16px;
}
.price-calculator-limit {
  background: var(--white);
  border-radius: var(--default-border-radius);
  padding: 32px;
  text-align: center;
}

@media screen and (max-width: 600px) {
  .price-calculator {
    padding: 20px;
  }
  .price-calculator-figures {
    gap: 20px;
  }
}
</style>
