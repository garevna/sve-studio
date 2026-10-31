<script lang="ts" setup>
  import { ref } from 'vue'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Step 1 of "pull production pages into the editor one at a time" - this
  // is a plain visual replica of the production site's own
  // AuthorizationPage.vue/AuthComponent.vue (+ SignIn/SignUp/UserEmail/
  // UserPassword/AuthAbilities), copying its markup, classes and real
  // uk locale text (locales/parts/auth.ts) as-is. Deliberately NOT wired to
  // any real auth logic (no store, no Firebase, no submit) - tabs/password-
  // visibility toggle are the only interactive bits, purely so the page
  // doesn't look broken, not because they do anything real yet. Making any
  // of this content actually editable is a separate, later step.
  //
  // Opened in its own window/tab from AccountPagesListView.vue (no editor
  // navigation around it) - no EditorPageHeader here, this shows exactly
  // how the page looks on production, same treatment as the wizard-page
  // previews.
  const tab = ref<'sign-in' | 'sign-up'>('sign-in')
  const showPassword = ref(false)
</script>

<template>
  <v-app>
    <v-main>
      <!-- --v-default-border-radius etc (used by .primary-button/.outlined-button)
        only resolve under a real .v-theme--{name} class, and Vuetify's own
        component-level theme CSS (vuetify-*.css) only applies within
        EDITED_APP_SCOPE_CLASS - same two-part scoping DynamicPageTemplate.vue
        already established for previewed page content, needed here for the
        exact same reason: this is production content, not editor chrome.
        Ordering matches that component exactly (class-carrying div OUTER,
        v-theme-provider INNER) rather than the reverse. -->
      <div class="auth-page-visual" :class="[EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
        <v-theme-provider :theme="APP_THEME_NAME">
          <v-card class="mx-auto my-auto pt-4 pb-8" flat max-width="480">
            <!-- Production's own AuthComponent.vue uses selected-class="primary--text" -
              Vuetify 2-era class naming (Vuetify 3's own utility is text-primary), so it
              does nothing here. The active-tab "pill" look in the reference design comes
              from tab-button--active instead (buttons.css) - the same mechanism
              UserSettings.vue's own v-tabs already uses in production
              (selected-class="tab-button--active" + hide-slider, no separate slider
              indicator once the active tab has its own visible background).

              That class name used to be spelled two ways - components passed
              either tabs-selected-class or tab-button--active for the very same
              look, and buttons.css carried both rules. One name now. -->
            <v-tabs
              v-model="tab"
              class="auth-page-tabs mb-2"
              color="dark-grey"
              grow
              hide-slider
              selected-class="tab-button--active"
            >
              <v-tab value="sign-in">Авторизація</v-tab>
              <v-tab value="sign-up">Реєстрація</v-tab>
            </v-tabs>
            <v-tabs-window v-model="tab" class="w-100 px-8">
              <v-tabs-window-item value="sign-in">
                <div class="mt-10">
                  <v-text-field
                    clear-icon="mdi-close"
                    clearable
                    hide-details
                    placeholder="пошта"
                    prepend-icon="mdi-email-outline"
                    type="email"
                    variant="plain"
                  />
                  <v-text-field
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    class="my-3"
                    clear-icon="mdi-close"
                    clearable
                    hide-details
                    placeholder="Пароль"
                    prepend-icon="mdi-key-variant"
                    required
                    :type="showPassword ? 'text' : 'password'"
                    variant="plain"
                    @click:append="showPassword = !showPassword"
                  />
                  <p class="default-text text-thin text-special mt-n2 text-center text-decoration-underline cursor-pointer">
                    <sup>Забули пароль?</sup>
                  </p>
                  <v-btn class="primary-button mt-8">Авторизуватись</v-btn>
                </div>
                <p class="default-text text-medium text-special my-4 text-center my-5">або</p>
                <!-- Production uses @/assets/google.svg - substituted with
                  mdi-google here rather than copying that asset over, since
                  this pass is about the page's structure/theme classes, not
                  asset parity. -->
                <v-btn class="outlined-button google-button">
                  <img class="mr-2" height="24" src="@/assets/google-icon.svg" width="24">
                  Вхід через Google
                </v-btn>
              </v-tabs-window-item>
              <v-tabs-window-item value="sign-up">
                <div class="mt-8">
                  <v-text-field
                    clear-icon="mdi-close"
                    clearable
                    hide-details
                    placeholder="пошта"
                    prepend-icon="mdi-email-outline"
                    type="email"
                    variant="plain"
                  />
                  <v-text-field
                    append-inner-icon="mdi-eye"
                    class="my-3"
                    clear-icon="mdi-close"
                    clearable
                    hide-details
                    placeholder="Пароль"
                    prepend-icon="mdi-key-variant"
                    required
                    type="password"
                    variant="plain"
                  />
                  <v-text-field
                    append-inner-icon="mdi-eye"
                    class="my-3"
                    clear-icon="mdi-close"
                    clearable
                    hide-details
                    placeholder="Підтвердіть пароль"
                    prepend-icon="mdi-key-variant"
                    required
                    type="password"
                    variant="plain"
                  />
                  <v-btn class="primary-button mt-5">Зареєструватись</v-btn>
                </div>
              </v-tabs-window-item>
            </v-tabs-window>
            <!-- The "what the account lets you do" list (download a ticket,
              return tickets, trip details) is gone for now: it only fits a
              carrier. The account keeps the user's own data; what else it
              offers will depend on the kind of business the site is for. -->
          </v-card>
        </v-theme-provider>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-page-visual {
  padding: 24px clamp(16px, 5vw, 48px) 48px;
}
.auth-page-tabs {
  background: var(--light-grey-2);
  border-radius: var(--large-border-radius);
  color: var(--dark-grey);
}
.google-button {
  border-radius: var(--v-default-border-radius) !important;
  border: solid 1px var(--light-grey-1) !important;
}

.google-button:hover {
  border: solid 2px var(--bright-grey) !important;
  color: var(--secondary);
}

.google-button .v-btn__content {
  font-size: 18px;
  font-weight: 500;
  color: var(--black);
}

.google-button:hover .v-btn__content {
  color: var(--secondary);
}
</style>
