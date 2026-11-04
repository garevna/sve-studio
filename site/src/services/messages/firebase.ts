// A signed-in visitor's messages, in the Pagewright demo's Firestore
// (collection "messages"): the form writes one, the channel's reply comes
// back into its `replies` (written by services/feedback-telegram), and the
// account page watches the list. The security rules let a visitor create and
// read only their own (see services/feedback-telegram/README.md).
// Loaded only for a signed-in visitor, on the app the auth adapter started.
import type { MessageDraft, SiteMessage } from './types'

async function firestore () {
  const [{ getApp }, store] = await Promise.all([import('firebase/app'), import('firebase/firestore')])
  return { db: store.getFirestore(getApp()), store }
}

export async function createMessage (draft: MessageDraft): Promise<string> {
  const { db, store } = await firestore()
  const reference = await store.addDoc(store.collection(db, 'messages'), {
    ...draft,
    createdAt: store.serverTimestamp(),
    replies: [],
  })
  return reference.id
}

function toDate (value: unknown): Date | null {
  return value && typeof (value as { toDate?: () => Date }).toDate === 'function' ? (value as { toDate: () => Date }).toDate() : null
}

// Newest first. Sorted here, not by the query: a query on uid and ordered by
// date would need an index made in the Firebase console first.
export async function watchMessages (uid: string, onList: (list: SiteMessage[]) => void, onError: (error: unknown) => void): Promise<() => void> {
  const { db, store } = await firestore()
  const query = store.query(store.collection(db, 'messages'), store.where('uid', '==', uid))
  return store.onSnapshot(query, snapshot => {
    const list = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        kind: String(data.kind || 'message'),
        text: String(data.text || ''),
        contact: data.contact || null,
        page: String(data.page || ''),
        createdAt: toDate(data.createdAt) ?? new Date(),
        replies: (Array.isArray(data.replies) ? data.replies : []).map((item: { text?: string, at?: unknown }) => ({
          text: String(item.text || ''),
          at: toDate(item.at) ?? new Date(),
        })),
      } satisfies SiteMessage
    })
    onList(list.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  }, onError)
}
