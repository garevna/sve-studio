<script lang="ts" setup>
  import { SveButton, SveMenu, SveMenuItem, SveMenuLabel, SveTopBar } from '@sve/editor-ui'
  import { computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { EDITOR_ROLES, EDITOR_SECTION_GROUPS, sectionsForRole } from '@/configs/editor-roles'
  import { useCommonStore } from '@/stores/common'
  import { useUsersStore } from '@/stores/users'
  import { lastEditedPage } from '@/utils/last-edited-page'

  // The start screen: who you work as (the role, switched right here), the
  // page you were last editing, and the editor's sections - grouped into
  // what is on the site, how it looks and how it is set up, each with a
  // line about what is in it. The sections and their groups live in
  // configs/editor-roles.ts, next to the roles that filter them.
  const commonStore = useCommonStore()
  // Does this deployment keep the roles on the server? Until the answer is
  // in, neither the sections nor a sign-in are shown - the screen does not
  // yet know which of the two it is. See stores/users.ts.
  const users = useUsersStore()
  onMounted(() => {
    void users.start()
  })

  const groups = computed(() => {
    const sections = sectionsForRole(commonStore.role)
    return EDITOR_SECTION_GROUPS
      .map(group => ({ ...group, sections: sections.filter(section => section.group === group.key) }))
      .filter(group => group.sections.length > 0)
  })

  const role = computed(() => commonStore.roleConfig)
  const lastPage = lastEditedPage()
  const { t } = useI18n()

</script>

<template>
  <v-app>
    <v-main>
      <!-- The same top bar as every other screen, the editor's language and
        colour scheme on it (EditorLocaleMenu, SveLookMenu). -->
      <SveTopBar title="Pagewright" />

      <div class="sve-ui home">
        <header class="home__intro">
          <h1 class="home__greeting">{{ t('home.greeting') }}</h1>
          <!-- The role decides which sections are here. Switched in place:
            it used to be a bar along the bottom that nothing pointed to. -->
          <!-- Nobody is signed in yet on a deployment that signs people in:
            there is no role to show, and offering to switch one would be a
            promise of access that the sign-in has not granted. -->
          <div v-if="!users.needsSignIn" class="home__role">
            <span>{{ t('home.workingAs') }}</span>
            <!-- A role the SERVER gave cannot be switched here: every
              section it would open is refused at the API anyway, so the
              switcher would only promise access that does not exist. -->
            <span v-if="commonStore.roleLocked" class="home__role-given">
              <i :class="['sve-icon mdi', role.icon]" />
              {{ t(`home.roles.${role.value}.title`) }}
              <span class="home__role-source">{{ t('home.roleFromServer') }}</span>
            </span>
            <SveMenu v-else location="bottom start" :min-width="320">
              <template #activator="{ props: activator }">
                <SveButton :icon="role.icon" icon-end="mdi-chevron-down" size="sm" v-bind="activator">
                  {{ t(`home.roles.${role.value}.title`) }}
                </SveButton>
              </template>
              <SveMenuLabel>{{ t('home.roleMenu') }}</SveMenuLabel>
              <SveMenuItem
                v-for="item of EDITOR_ROLES"
                :key="item.value"
                :icon="item.value === role.value ? 'mdi-check' : item.icon"
                @click="commonStore.setRole(item.value)"
              >
                <span class="home__role-option">
                  <span class="home__role-title">{{ t(`home.roles.${item.value}.title`) }}</span>
                  <span class="home__role-hint">{{ t(`home.roles.${item.value}.hint`) }}</span>
                </span>
              </SveMenuItem>
            </SveMenu>
          </div>
          <p v-if="!commonStore.roleless && !users.needsSignIn" class="home__hint">{{ t(`home.roles.${role.value}.hint`) }}</p>
          <SveButton
            v-if="lastPage && !users.needsSignIn && !commonStore.roleless"
            class="home__resume"
            icon="mdi-pencil-outline"
            :to="`/editor/${lastPage}`"
            variant="primary"
          >
            {{ t('home.resume', { page: lastPage }) }}
          </SveButton>
        </header>

        <!-- Signed out on a deployment that signs people in: there is
          nothing to show until we know who this is. -->
        <section v-if="users.needsSignIn" class="home__gate">
          <i class="sve-icon mdi mdi-shield-account-outline home__gate-icon" />
          <h2 class="home__gate-title">{{ t('home.signInTitle') }}</h2>
          <p>{{ t('home.signInText') }}</p>
          <SveButton icon="mdi-google" variant="primary" @click="users.signIn()">
            {{ t('home.signInGoogle') }}
          </SveButton>
        </section>

        <!-- Signed in, no role given yet. An empty board would read as a
          broken editor, so it says what is being waited for. -->
        <section v-else-if="commonStore.roleless && users.user" class="home__gate">
          <i class="sve-icon mdi mdi-account-clock-outline home__gate-icon" />
          <h2 class="home__gate-title">{{ t('home.norole.title') }}</h2>
          <p>{{ t('home.norole.text', { email: users.user.email }) }}</p>
        </section>

        <section v-for="group of (users.needsSignIn || commonStore.roleless ? [] : groups)" :key="group.key" class="home__group">
          <h2 class="home__group-title">{{ t(`home.groups.${group.key}`) }}</h2>
          <div class="home__grid">
            <RouterLink
              v-for="section of group.sections"
              :key="section.key"
              class="home__tile"
              :to="section.to"
            >
              <span class="home__tile-icon"><i :class="['sve-icon mdi', section.icon]" /></span>
              <span class="home__tile-text">
                <span class="home__tile-title">{{ t(`home.sections.${section.key}.title`) }}</span>
                <span class="home__tile-description">{{ t(`home.sections.${section.key}.description`) }}</span>
              </span>
              <i class="sve-icon mdi mdi-arrow-right home__tile-arrow" />
            </RouterLink>
          </div>
        </section>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 36px;
  max-width: 1080px;
  margin-inline: auto;
  padding: clamp(28px, 6vw, 64px) clamp(16px, 5vw, 48px) 64px;
  color: var(--sve-text);
}

.home__intro { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.home__greeting {
  margin: 0;
  font-size: clamp(26px, 4vw, 36px);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.home__role { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--sve-text-muted); font-size: 15px; }
.home__hint { max-width: 640px; margin: 0; color: var(--sve-text-subtle); font-size: 14px; line-height: 1.5; }
.home__resume { margin-top: 8px; }
.home__role-given { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; color: var(--sve-text); font-weight: 600; }
.home__role-source { color: var(--sve-text-subtle); font-size: 13px; font-weight: 400; }

.home__gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 520px;
  margin: clamp(8px, 4vh, 40px) auto 0;
  color: var(--sve-text-muted);
  text-align: center;
  line-height: 1.5;
}
.home__gate p { margin: 0; }
.home__gate-icon { color: var(--sve-text-subtle); font-size: 44px; }
.home__gate-title { margin: 0; color: var(--sve-text); font-size: 20px; font-weight: 700; }

.home__role-option { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; white-space: normal; }
.home__role-title { font-weight: 600; }
.home__role-hint { color: var(--sve-text-subtle); font-size: 12px; line-height: 1.4; }

.home__group-title {
  margin: 0 0 12px;
  color: var(--sve-text-subtle);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 12px;
}
.home__tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
  color: var(--sve-text);
  text-decoration: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
}
.home__tile:hover,
.home__tile:focus-visible {
  outline: none;
  border-color: var(--sve-primary);
  box-shadow: var(--sve-shadow-md);
  transform: translateY(-1px);
}
.home__tile-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--sve-radius-md);
  background: var(--sve-primary-soft);
  color: var(--sve-primary);
  font-size: 22px;
}
.home__tile-text { display: flex; flex: 1 1 auto; flex-direction: column; gap: 2px; min-width: 0; }
.home__tile-title { font-size: 15px; font-weight: 600; }
.home__tile-description { color: var(--sve-text-muted); font-size: 13px; line-height: 1.4; }
.home__tile-arrow { color: var(--sve-text-subtle); font-size: 18px; opacity: 0; transition: opacity 0.12s ease; }
.home__tile:hover .home__tile-arrow { opacity: 1; color: var(--sve-primary); }
</style>
