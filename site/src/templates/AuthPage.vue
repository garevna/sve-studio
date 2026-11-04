<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import character from '../assets/auth-character.svg'
  import googleLogo from '../assets/google.svg'
  import { useSiteNavigation } from '../composables/site-navigation'
  import { AUTH_ERRORS, AUTH_TEXTS } from '../configs/auth-texts'
  import { ACCOUNT_PAGE_ID } from '../services/site-links'
  import { useAuthStore } from '../stores/auth'
  import { useCommonStore } from '../stores/common'

  // Signing in and signing up: two tabs, e-mail + password or Google. The
  // Pagewright demo's own look (pw-auth-*): a dark panel with the mascot and
  // what the account gives, the form beside it. No e-mail confirmation - a
  // new account can use the site at once.
  // After signing in: back where the visitor came from (?returnTo=), else
  // the account page.
  const auth = useAuthStore()
  const commonStore = useCommonStore()
  const route = useRoute()
  const router = useRouter()
  const { pagePath } = useSiteNavigation()

  type Lang = 'uk' | 'en' | 'de'
  const lang = computed(() => (['uk', 'en', 'de'].includes(commonStore.locale) ? commonStore.locale : 'en') as Lang)
  const say = (words: { uk: string, en: string, de: string }) => words[lang.value]

  const tab = ref<'sign-in' | 'sign-up'>('sign-in')
  const name = ref('')
  const email = ref('')
  const password = ref('')
  const confirm = ref('')
  const showPassword = ref(false)
  const resetSent = ref(false)

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const emailValid = computed(() => EMAIL.test(email.value.trim()))
  const passwordValid = computed(() => password.value.length >= 6)
  const confirmValid = computed(() => confirm.value === password.value)
  const canSignIn = computed(() => emailValid.value && password.value.length > 0 && !auth.busy)
  const canSignUp = computed(() => emailValid.value && passwordValid.value && confirmValid.value && !auth.busy)
  const errorText = computed(() => (auth.error ? say(AUTH_ERRORS[auth.error]) : ''))

  watch(tab, () => {
    auth.clearError()
    resetSent.value = false
  })
  watch(() => commonStore.locale, locale => auth.setLanguage(locale), { immediate: true })

  function done () {
    const back = typeof route.query.returnTo === 'string' && route.query.returnTo.startsWith('/') ? route.query.returnTo : ''
    void router.replace(back || pagePath(ACCOUNT_PAGE_ID))
  }
  // Signed in already, or just now (Google's window, another tab).
  watch(() => auth.user, user => {
    if (user) {
      done()
    }
  }, { immediate: true })

  async function submit () {
    if (tab.value === 'sign-in' && canSignIn.value) {
      await auth.signIn(email.value, password.value)
    } else if (tab.value === 'sign-up' && canSignUp.value) {
      await auth.signUp(email.value, password.value, name.value)
    }
  }
  async function reset () {
    resetSent.value = await auth.resetPassword(email.value)
  }
</script>

<template>
  <div class="pw-auth">
    <aside class="pw-auth__intro">
      <img alt="" class="pw-auth__character" :src="character">
      <div class="pw-auth__intro-text">
        <p class="pw-auth__intro-title">{{ say(AUTH_TEXTS.abilitiesTitle) }}</p>
        <ul class="pw-auth__abilities">
          <li v-for="(ability, index) of AUTH_TEXTS.abilities" :key="index">
            <i aria-hidden="true" class="mdi mdi-check-circle" />
            <span>{{ say(ability) }}</span>
          </li>
        </ul>
      </div>
    </aside>

    <section class="pw-auth__card">
      <p v-if="auth.ready && !auth.enabled" class="pw-auth__note">{{ say(AUTH_TEXTS.notSetUp) }}</p>
      <template v-else>
        <div v-if="auth.methods.includes('password')" class="pw-auth__switch" role="tablist">
          <button
            v-for="item of (['sign-in', 'sign-up'] as const)"
            :key="item"
            :aria-selected="tab === item"
            :class="['pw-auth__switch-item', { 'pw-auth__switch-item--on': tab === item }]"
            role="tab"
            type="button"
            @click="tab = item"
          >
            {{ say(item === 'sign-in' ? AUTH_TEXTS.signInTab : AUTH_TEXTS.signUpTab) }}
          </button>
        </div>

        <form v-if="auth.methods.includes('password')" class="pw-auth__form" @submit.prevent="submit">
          <!-- Plain inputs in the demo's own look: the theme styles every
            Vuetify field its own way, and this form is not the theme's. -->
          <label v-if="tab === 'sign-up'" class="pw-auth__field">
            <i aria-hidden="true" class="mdi mdi-account-outline" />
            <input v-model="name" autocomplete="name" :placeholder="say(AUTH_TEXTS.name)" type="text">
          </label>
          <label :class="['pw-auth__field', { 'pw-auth__field--error': email && !emailValid }]">
            <i aria-hidden="true" class="mdi mdi-email-outline" />
            <input
              v-model="email"
              autocomplete="email"
              :disabled="auth.busy"
              :placeholder="say(AUTH_TEXTS.email)"
              type="email"
            >
          </label>
          <div>
            <label :class="['pw-auth__field', { 'pw-auth__field--error': tab === 'sign-up' && password && !passwordValid }]">
              <i aria-hidden="true" class="mdi mdi-lock-outline" />
              <input
                v-model="password"
                :autocomplete="tab === 'sign-in' ? 'current-password' : 'new-password'"
                :disabled="auth.busy"
                :placeholder="say(AUTH_TEXTS.password)"
                :type="showPassword ? 'text' : 'password'"
              >
              <button
                :aria-label="say(AUTH_TEXTS.password)"
                class="pw-auth__eye"
                type="button"
                @click="showPassword = !showPassword"
              >
                <i aria-hidden="true" :class="['mdi', showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline']" />
              </button>
            </label>
            <p v-if="tab === 'sign-up'" class="pw-auth__hint">{{ say(AUTH_TEXTS.passwordHint) }}</p>
          </div>
          <div v-if="tab === 'sign-up'">
            <label :class="['pw-auth__field', { 'pw-auth__field--error': confirm && !confirmValid }]">
              <i aria-hidden="true" class="mdi mdi-lock-check-outline" />
              <input
                v-model="confirm"
                autocomplete="new-password"
                :disabled="auth.busy"
                :placeholder="say(AUTH_TEXTS.confirmPassword)"
                :type="showPassword ? 'text' : 'password'"
              >
            </label>
            <p v-if="confirm && !confirmValid" class="pw-auth__hint pw-auth__hint--error">{{ say(AUTH_TEXTS.passwordsDiffer) }}</p>
          </div>

          <button
            v-if="tab === 'sign-in' && emailValid && !resetSent"
            class="pw-auth__link"
            type="button"
            @click="reset"
          >
            {{ say(AUTH_TEXTS.forgot) }}
          </button>
          <p v-if="resetSent" class="pw-auth__message pw-auth__message--ok" role="status">{{ say(AUTH_TEXTS.resetSent) }}</p>
          <p v-if="errorText" class="pw-auth__message pw-auth__message--error" role="alert">{{ errorText }}</p>

          <button class="pw-auth__button pw-auth__button--main" :disabled="tab === 'sign-in' ? !canSignIn : !canSignUp" type="submit">
            <v-progress-circular v-if="auth.busy" indeterminate size="20" width="2" />
            <span v-else>{{ say(tab === 'sign-in' ? AUTH_TEXTS.signInButton : AUTH_TEXTS.signUpButton) }}</span>
          </button>
        </form>

        <!-- The ways the site's settings turn on (global.json auth.methods). -->
        <template v-if="auth.methods.includes('google') || auth.methods.includes('github')">
          <div v-if="auth.methods.includes('password')" class="pw-auth__or"><span>{{ say(AUTH_TEXTS.or) }}</span></div>
          <div class="pw-auth__socials">
            <button
              v-if="auth.methods.includes('google')"
              class="pw-auth__button pw-auth__button--social"
              :disabled="auth.busy"
              type="button"
              @click="auth.signInWithGoogle()"
            >
              <img alt="" height="22" :src="googleLogo" width="22">
              {{ say(AUTH_TEXTS.google) }}
            </button>
            <button
              v-if="auth.methods.includes('github')"
              class="pw-auth__button pw-auth__button--social"
              :disabled="auth.busy"
              type="button"
              @click="auth.signInWithGithub()"
            >
              <i aria-hidden="true" class="mdi mdi-github pw-auth__github" />
              {{ say(AUTH_TEXTS.github) }}
            </button>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>

<style scoped>
/* The demo's own sign-in look - every class here is pw-auth-*, the
   palette's variables only. */
.pw-auth {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  max-width: 980px;
  margin: 56px auto 96px;
  border-radius: var(--large-border-radius, 36px);
  overflow: hidden;
  background: var(--white);
  box-shadow: 0 24px 64px rgb(21 42 104 / 0.14);
}

.pw-auth__intro {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 24px;
  padding: 40px 36px;
  color: var(--white);
  background: var(--night-sky-gradient, linear-gradient(135deg, var(--primary), var(--secondary)));
}
.pw-auth__character {
  align-self: center;
  height: 300px;
  width: auto;
  filter: drop-shadow(0 16px 24px rgb(0 0 0 / 0.3));
}
.pw-auth__intro-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}
.pw-auth__abilities {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.pw-auth__abilities li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 15px;
  line-height: 1.4;
  color: var(--accent);
}
.pw-auth__abilities .mdi {
  font-size: 20px;
  line-height: 1;
  color: var(--white);
}

.pw-auth__card {
  padding: 40px 44px;
}
.pw-auth__note {
  padding: 48px 0;
  text-align: center;
  color: var(--grey);
}

.pw-auth__switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 999px;
  background: var(--light-grey-2);
  margin-bottom: 28px;
}
.pw-auth__switch-item {
  padding: 10px 12px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  color: var(--dark-grey);
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}
.pw-auth__switch-item--on {
  background: var(--white);
  color: var(--primary);
  box-shadow: 0 2px 8px rgb(21 42 104 / 0.12);
}

.pw-auth__form {
  display: grid;
  gap: 14px;
}
.pw-auth__field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1.5px solid var(--light-grey-1);
  background: var(--light-grey-2);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.pw-auth__field:focus-within {
  border-color: var(--secondary);
  background: var(--white);
}
.pw-auth__field--error {
  border-color: var(--error);
}
.pw-auth__field .mdi {
  font-size: 20px;
  color: var(--blue);
}
.pw-auth__field input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 16px;
  color: var(--black);
}
.pw-auth__field input::placeholder {
  color: var(--grey);
}
.pw-auth__eye {
  display: grid;
  place-items: center;
  padding: 4px;
}
.pw-auth__hint {
  margin: 6px 4px 0;
  font-size: 13px;
  color: var(--grey);
}
.pw-auth__hint--error {
  color: var(--error);
}
.pw-auth__link {
  justify-self: end;
  margin-top: -4px;
  font-size: 14px;
  color: var(--secondary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.pw-auth__message {
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
}
.pw-auth__message--ok { color: var(--success); }
.pw-auth__message--error { color: var(--error); }

.pw-auth__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.pw-auth__button:disabled {
  opacity: 0.5;
  cursor: default;
}
.pw-auth__button:not(:disabled):hover {
  transform: translateY(-1px);
}
.pw-auth__button--main {
  margin-top: 8px;
  color: var(--white);
  background: var(--night-sky-gradient, linear-gradient(135deg, var(--primary), var(--secondary)));
  box-shadow: 0 8px 20px rgb(48 80 177 / 0.3);
}
.pw-auth__socials {
  display: grid;
  gap: 10px;
}
.pw-auth__github {
  font-size: 24px;
  line-height: 1;
  color: var(--black);
}
.pw-auth__button--social {
  color: var(--black);
  background: var(--white);
  border: 1px solid var(--light-grey-1);
}
.pw-auth__button--social:not(:disabled):hover {
  border-color: var(--secondary);
}

.pw-auth__or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  font-size: 14px;
  color: var(--grey);
}
.pw-auth__or::before,
.pw-auth__or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--light-grey-1);
}

/* A phone: one column, the mascot small on top. */
@media screen and (max-width: 760px) {
  .pw-auth {
    grid-template-columns: minmax(0, 1fr);
    margin: 24px 16px 64px;
  }
  .pw-auth__intro {
    flex-direction: row;
    align-items: center;
    padding: 24px;
  }
  .pw-auth__character {
    height: 140px;
  }
  .pw-auth__card {
    padding: 28px 20px;
  }
}
</style>
