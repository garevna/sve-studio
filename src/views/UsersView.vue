<script lang="ts" setup>
  import type { EditorPerson, PersonRole } from '@/services/editor-users'
  import { SveBadge, SveButton, SveIconButton, SveMenu, SveMenuDivider, SveMenuItem, SveMenuLabel } from '@sve/editor-ui'
  import { computed, onMounted } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { EDITOR_ROLES } from '@/configs/editor-roles'
  import { editorUiLocale, t } from '@/i18n'
  import { UsersError } from '@/services/editor-users'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { useUsersStore } from '@/stores/users'

  // "Користувачі": who has signed in to the editor, and the role each of
  // them has. The rules this section works by are the server's (see
  // server/content-api/users.ts) - it only shows them and says plainly what
  // was refused:
  //   - a person appears here after their first sign-in, with no rights;
  //   - an owner is set in the deployment, so this list can never take the
  //     last administrator away;
  //   - nobody changes their own role, so nobody locks themselves out.
  const users = useUsersStore()
  const feedback = useUiFeedbackStore()

  const roleTitles = computed(() => Object.fromEntries(
    EDITOR_ROLES.map(role => [role.value, t(`home.roles.${role.value}.title`)]),
  ) as Record<string, string>)

  function roleTitle (role: PersonRole): string {
    return role === 'none' ? t('users.noRole') : roleTitles.value[role] ?? role
  }

  function roleIcon (role: PersonRole): string {
    return EDITOR_ROLES.find(item => item.value === role)?.icon ?? 'mdi-account-outline'
  }

  function formatDate (date: Date): string {
    return new Intl.DateTimeFormat(editorUiLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
  }

  function initials (person: EditorPerson): string {
    return (person.name || person.email || '?').trim().slice(0, 1).toUpperCase()
  }

  // Every refusal the server names has a sentence of its own - "403" tells
  // the reader nothing about what to do next.
  function errorText (error: unknown): string {
    const code = error instanceof UsersError ? error.code : 'server'
    return t(`users.errors.${code}`)
  }

  async function pick (person: EditorPerson, role: PersonRole) {
    if (role === person.role) {
      return
    }
    // Handing over the supervisor role hands over this section too - the
    // one change that cannot be taken back by the person making it.
    if (role === 'supervisor') {
      const sure = await feedback.confirm({
        title: t('users.supervisorTitle'),
        text: t('users.supervisorText', { name: person.name || person.email }),
      })
      if (!sure) {
        return
      }
    }
    try {
      await users.changeRole(person.uid, role)
      feedback.notifySuccess(t('users.changed', { role: roleTitle(role) }))
    } catch (error) {
      feedback.notifyError(t('users.changeFailed'), errorText(error))
    }
  }

  async function remove (person: EditorPerson) {
    const sure = await feedback.confirm({
      title: t('users.removeTitle'),
      text: t('users.removeText', { name: person.name || person.email }),
    })
    if (!sure) {
      return
    }
    try {
      await users.remove(person.uid)
      feedback.notifySuccess(t('users.removed'))
    } catch (error) {
      feedback.notifyError(t('users.removeFailed'), errorText(error))
    }
  }

  const detail = computed(() => users.me?.email || t('users.detail'))

  onMounted(() => {
    void users.start()
  })
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :detail="detail" :title="t('users.title')">
        <template v-if="users.mayManage" #actions>
          <SveIconButton
            :disabled="users.loading"
            icon="mdi-refresh"
            :label="t('users.refresh')"
            @click="users.loadPeople()"
          />
          <SveIconButton icon="mdi-logout" :label="t('users.signOut')" @click="users.signOut()" />
        </template>
      </EditorPageHeader>

      <v-progress-linear v-if="!users.ready || users.loading" color="primary" indeterminate />

      <div v-if="users.ready" class="sve-ui people">
        <!-- No sign-in in front of the API: the role is the one chosen on the
          home screen, and this section explains what would make it real. -->
        <section v-if="!users.enforced" class="people__notice">
          <i class="sve-icon mdi mdi-account-switch-outline people__notice-icon" />
          <h2 class="people__notice-title">{{ t('users.notEnforcedTitle') }}</h2>
          <p>{{ t('users.notEnforcedText') }}</p>
          <p class="people__notice-how">{{ t('users.notEnforcedHow') }}</p>
        </section>

        <!-- The server asks for a token; the site's settings offer no way to
          get one. Nobody can get in, so say which setting is missing. -->
        <section v-else-if="!users.configured" class="people__notice">
          <i class="sve-icon mdi mdi-account-alert-outline people__notice-icon" />
          <h2 class="people__notice-title">{{ t('users.notConfiguredTitle') }}</h2>
          <p>{{ t('users.notConfiguredText') }}</p>
        </section>

        <section v-else-if="!users.user" class="people__notice">
          <i class="sve-icon mdi mdi-shield-account-outline people__notice-icon" />
          <h2 class="people__notice-title">{{ t('users.signInTitle') }}</h2>
          <p>{{ t('users.signInText') }}</p>
          <SveButton icon="mdi-google" variant="primary" @click="users.signIn()">
            {{ t('users.signInGoogle') }}
          </SveButton>
        </section>

        <section v-else-if="!users.mayManage" class="people__notice">
          <i class="sve-icon mdi mdi-lock-outline people__notice-icon" />
          <h2 class="people__notice-title">{{ t('users.forbiddenTitle') }}</h2>
          <p>{{ t('users.forbiddenText', { email: users.user.email }) }}</p>
          <SveButton icon="mdi-google" @click="users.signIn()">
            {{ t('users.switchAccount') }}
          </SveButton>
        </section>

        <template v-else>
          <!-- Me first: the account the rest of the page is being changed
            from, and - for an owner - why it is not in the list below. -->
          <article class="person person--me">
            <span class="person__avatar">{{ (users.me?.name || users.me?.email || '?').slice(0, 1).toUpperCase() }}</span>
            <div class="person__who">
              <span class="person__name">
                {{ users.me?.name || users.me?.email }}
                <SveBadge>{{ t('users.youTitle') }}</SveBadge>
              </span>
              <span class="person__meta">{{ users.me?.email }}</span>
              <p v-if="users.me?.owner" class="person__hint">{{ t('users.ownerHint') }}</p>
            </div>
            <span class="person__role person__role--static">
              <i :class="['sve-icon mdi', users.me?.owner ? 'mdi-shield-crown-outline' : 'mdi-shield-account']" />
              {{ users.me?.owner ? t('users.owner') : roleTitle((users.me?.role ?? 'none') as PersonRole) }}
            </span>
          </article>

          <header class="people__head">
            <h2 class="people__title">{{ t('users.listTitle') }}</h2>
            <SveBadge v-if="users.waiting > 0">{{ t('users.waiting', { count: users.waiting }) }}</SveBadge>
          </header>
          <p class="people__hint">{{ t('users.listHint') }}</p>

          <p v-if="users.people.length === 0" class="people__empty">{{ t('users.empty') }}</p>

          <article
            v-for="person of users.people"
            :key="person.uid"
            :class="['person', { 'person--waiting': person.role === 'none' }]"
          >
            <span class="person__avatar">{{ initials(person) }}</span>
            <div class="person__who">
              <span class="person__name">{{ person.name || person.email }}</span>
              <span class="person__meta">
                <span v-if="person.name && person.email">{{ person.email }}</span>
                <span>{{ t('users.lastSeen', { when: formatDate(person.lastSeen) }) }}</span>
              </span>
            </div>

            <SveMenu location="bottom end" :min-width="320">
              <template #activator="{ props: activator }">
                <SveButton
                  :disabled="users.busyUid === person.uid"
                  :icon="person.role === 'none' ? 'mdi-account-question-outline' : roleIcon(person.role)"
                  icon-end="mdi-chevron-down"
                  size="sm"
                  v-bind="activator"
                >
                  {{ roleTitle(person.role) }}
                </SveButton>
              </template>
              <SveMenuLabel>{{ t('users.roleMenu') }}</SveMenuLabel>
              <SveMenuItem
                v-for="item of EDITOR_ROLES"
                :key="item.value"
                :icon="item.value === person.role ? 'mdi-check' : item.icon"
                @click="pick(person, item.value)"
              >
                <span class="person__option">
                  <span class="person__option-title">{{ t(`home.roles.${item.value}.title`) }}</span>
                  <span class="person__option-hint">{{ t(`home.roles.${item.value}.hint`) }}</span>
                </span>
              </SveMenuItem>
              <SveMenuDivider />
              <SveMenuItem
                :icon="person.role === 'none' ? 'mdi-check' : 'mdi-account-question-outline'"
                @click="pick(person, 'none')"
              >
                <span class="person__option">
                  <span class="person__option-title">{{ t('users.noRole') }}</span>
                  <span class="person__option-hint">{{ t('users.noRoleHint') }}</span>
                </span>
              </SveMenuItem>
            </SveMenu>

            <SveIconButton
              class="person__remove"
              :disabled="users.busyUid === person.uid"
              icon="mdi-account-remove-outline"
              :label="t('users.remove')"
              size="sm"
              @click="remove(person)"
            />
          </article>
        </template>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.people {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 860px;
  margin-inline: auto;
  color: var(--sve-text);
}

.people__notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 520px;
  margin: clamp(16px, 8vh, 72px) auto 0;
  color: var(--sve-text-muted);
  text-align: center;
  line-height: 1.5;
}
.people__notice p { margin: 0; }
.people__notice-icon { color: var(--sve-text-subtle); font-size: 44px; }
.people__notice-title { margin: 0; color: var(--sve-text); font-size: 20px; font-weight: 700; }
.people__notice-how {
  padding: 12px 14px;
  border-radius: var(--sve-radius-md);
  background: var(--sve-surface-muted);
  color: var(--sve-text-subtle);
  font-size: 13px;
  text-align: left;
}

.people__head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 12px; }
.people__title { margin: 0; font-size: 16px; font-weight: 700; }
.people__hint { margin: -4px 0 4px; color: var(--sve-text-subtle); font-size: 13px; line-height: 1.5; }
.people__empty { margin: 16px 0; color: var(--sve-text-subtle); text-align: center; }

.person {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px clamp(14px, 3vw, 18px);
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
}
/* Signed in, no role yet: the one row that is waiting for a decision. */
.person--waiting { border-left: solid 3px var(--sve-warning); }
.person--me { align-items: flex-start; background: var(--sve-surface-muted); }

.person__avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--sve-primary-soft);
  color: var(--sve-primary);
  font-size: 16px;
  font-weight: 700;
}
.person__who { display: flex; flex: 1 1 200px; flex-direction: column; gap: 2px; min-width: 0; }
.person__name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 600; overflow-wrap: anywhere; }
.person__meta { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--sve-text-subtle); font-size: 13px; overflow-wrap: anywhere; }
.person__hint { max-width: 520px; margin: 6px 0 0; color: var(--sve-text-muted); font-size: 13px; line-height: 1.5; }

.person__role { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
.person__role--static { color: var(--sve-text-muted); }

.person__option { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; white-space: normal; }
.person__option-title { font-weight: 600; }
.person__option-hint { color: var(--sve-text-subtle); font-size: 12px; line-height: 1.4; }

.person__remove { flex: none; }
</style>
