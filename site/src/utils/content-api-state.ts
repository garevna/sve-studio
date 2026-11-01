import { ref } from 'vue'

// Whether the in-browser content API (the editor's service worker) answers
// this page's /api requests. It does not in the first moments of a new
// release, with DevTools' "Bypass for network" on, or where service workers
// are blocked - then /api/... gets no answer on a static host, and pictures
// are read from the published files instead (services/get-image-url.ts).
// Reactive, so pictures already on the page switch when it turns out.
export const contentApiReachable = ref(true)

export async function probeContentApi (root: string): Promise<void> {
  if (!import.meta.env.PROD) {
    return
  }
  try {
    const response = await fetch(`${root}api/content/styles`, { cache: 'no-store' })
    contentApiReachable.value = response.headers.get('X-Content-Api') === 'service-worker'
  } catch {
    contentApiReachable.value = false
  }
}
