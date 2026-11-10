// The "Користувачі" section's state, and - before any section is opened -
// the answer to "who am I here?".
//
// Two deployments, one store:
//   - the demo and the old host-system path have no sign-in in front of the
//     content API. `enforced` stays false, the role goes on being chosen in
//     the interface, and this store does nothing else.
//   - a real deployment (NUXT_CONTENT_API_ACCESS=auth) answers 401 until
//     somebody signs in. Then the role comes from the server, the switcher
//     on the home screen turns into a label, and the person's Firebase
//     token becomes the credential for every save (ajax.setAuthTokenProvider).
//
// start() is called by the home screen and by the section itself, and runs
// once per app.
import type { EditorRoleModel } from '@/configs/editor-roles'
import type { EditorAuth, EditorUser } from '@/services/editor-auth'
import type { EditorMe, EditorPerson, PersonRole, UsersErrorCode } from '@/services/editor-users'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { editorAuth, EditorAuthError } from '@/services/editor-auth'
import { fetchMe, fetchPeople, removePerson, serverRolesEnabled, setPersonRole, UsersError } from '@/services/editor-users'
import { useAjaxStore } from '@/stores/ajax'
import { useCommonStore } from '@/stores/common'

function codeOf (error: unknown): UsersErrorCode {
  return error instanceof UsersError ? error.code : 'server'
}

export const useUsersStore = defineStore('users', () => {
  const ajax = useAjaxStore()
  const common = useCommonStore()

  // The probe has answered: until then the home screen shows neither the
  // sections nor a sign-in - it does not yet know which it is.
  const ready = ref(false)
  // The content API asks for a sign-in.
  const enforced = ref(false)
  // enforced, but the site's own settings set up no sign-in to do it with
  // (global.json: auth.provider/auth.firebase). Nobody can get in, and the
  // section says what is missing rather than looping on a dead button.
  const configured = ref(true)
  const session = shallowRef<EditorAuth | null>(null)
  const user = ref<EditorUser | null>(null)
  const me = ref<EditorMe | null>(null)
  const people = ref<EditorPerson[]>([])
  const loading = ref(false)
  const error = ref<UsersErrorCode | ''>('')
  // The uid whose role is being changed or who is being removed, so one row
  // can show it without the whole list going quiet.
  const busyUid = ref<string | null>(null)

  // Signed in and waiting for somebody to give them a role.
  const waiting = computed(() => people.value.filter(person => person.role === 'none').length)
  // Only a supervisor or an owner may see and change the list.
  const mayManage = computed(() => me.value?.role === 'supervisor' || me.value?.owner === true)
  const needsSignIn = computed(() => enforced.value && configured.value && !user.value)

  async function token (): Promise<string | null> {
    return session.value ? await session.value.token() : null
  }

  async function loadMe () {
    try {
      me.value = await fetchMe(await token())
      common.applyServerRole(me.value.owner ? 'owner' : me.value.role)
      error.value = ''
    } catch (error_) {
      me.value = null
      error.value = codeOf(error_)
    }
  }

  async function loadPeople () {
    if (!mayManage.value) {
      people.value = []
      return
    }
    loading.value = true
    try {
      people.value = await fetchPeople(await token())
      error.value = ''
    } catch (error_) {
      error.value = codeOf(error_)
    } finally {
      loading.value = false
    }
  }

  async function load () {
    await loadMe()
    await loadPeople()
  }

  let started: Promise<void> | null = null

  function start () {
    started ??= (async () => {
      enforced.value = await serverRolesEnabled()
      if (!enforced.value) {
        // Nothing to sign in to: the role stays the one chosen on the home
        // screen, exactly as before.
        ready.value = true
        return
      }
      const settings = await ajax.getGlobalSettings().catch(() => null)
      const firebase = settings?.auth?.provider === 'firebase' ? settings.auth.firebase : undefined
      if (!firebase?.apiKey) {
        configured.value = false
        ready.value = true
        return
      }
      session.value = editorAuth(firebase)
      // From here on every request to this origin's /api carries the signed-in
      // person's token - that is what the server checks the role against.
      ajax.setAuthTokenProvider(() => token())
      await session.value.watchUser(next => {
        const changed = next?.email !== user.value?.email
        user.value = next
        ready.value = true
        if (!changed) {
          return
        }
        me.value = null
        people.value = []
        error.value = ''
        if (next) {
          // The role stays whatever it was until /me answers - the switcher
          // must not come back to life for those few hundred milliseconds.
          void load()
        } else {
          common.applyServerRole('none')
        }
      })
    })()
    return started
  }

  async function signIn () {
    if (!session.value) {
      return
    }
    try {
      error.value = ''
      // A different account, when the one signed in has no role here.
      if (user.value) {
        await session.value.signOut()
      }
      await session.value.signIn()
    } catch (error_) {
      error.value = error_ instanceof EditorAuthError && error_.code === 'domain' ? 'forbidden' : 'server'
    }
  }

  async function signOut () {
    // The role is cleared by the watcher above, which fires for this too.
    await session.value?.signOut()
  }

  // Both throw: the row that asked says what went wrong, in its own words
  // (the server names each refusal - see services/editor-users.ts).
  async function changeRole (uid: string, role: PersonRole) {
    busyUid.value = uid
    try {
      const updated = await setPersonRole(await token(), uid, role)
      const index = people.value.findIndex(person => person.uid === uid)
      if (index !== -1) {
        people.value[index] = updated
      }
    } finally {
      busyUid.value = null
    }
  }

  async function remove (uid: string) {
    busyUid.value = uid
    try {
      await removePerson(await token(), uid)
      people.value = people.value.filter(person => person.uid !== uid)
    } finally {
      busyUid.value = null
    }
  }

  // The role to show for a person in the list: 'none' is not one of the
  // editor's roles, so it has no entry in configs/editor-roles.ts.
  function isEditorRole (role: PersonRole): role is EditorRoleModel {
    return role !== 'none'
  }

  return {
    ready,
    enforced,
    configured,
    user,
    me,
    people,
    loading,
    error,
    busyUid,
    waiting,
    mayManage,
    needsSignIn,
    start,
    load,
    loadPeople,
    signIn,
    signOut,
    changeRole,
    remove,
    isEditorRole,
    // the signed-in person's token, for a request of a section's own
    // (ProblemLogView.vue)
    token,
  }
})
