import axios from 'axios'

// Dev only. An uploaded picture is stored by the content API in this
// browser (a service worker's storage), and the page JSON only links to it
// as /api/content/images/<name>. "Зберегти" writes that JSON into content/,
// but without the picture itself the link breaks on any other browser, a
// fresh local database, or a deployed build - so it used to be copied over
// by hand.
//
// This copies every such picture into content/images under the same name,
// where the content API finds it as part of the starting content. Asks the
// dev server which ones content/ refers to but lacks, so it also catches up
// on pictures uploaded before it existed. Never fails anything: worst case
// a picture is copied on the next save.
let running: Promise<void> | null = null
let again = false

async function bytesToBase64 (blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

export async function copyImageToContent (name: string, blob: Blob): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }
  await axios.put(`${location.origin}/__editor-api__/public-file`, {
    path: `_seed/images/${name}`,
    content: await bytesToBase64(blob),
    encoding: 'base64',
  })
}

async function syncOnce (): Promise<void> {
  const { data } = await axios.get<{ missing: string[] }>(`${location.origin}/__editor-api__/missing-images`)
  for (const name of data.missing) {
    try {
      const response = await fetch(`${location.origin}/api/content/images/${name}`)
      // A picture nobody has comes back from the service worker as its grey
      // stand-in (X-Placeholder), with a 200 - copied, that stand-in became
      // a fake file under the real name.
      if (!response.ok || response.headers.get('X-Placeholder') === '1') {
        console.warn(`Image ${name} is linked from content/ but this browser does not have it either`)
        continue
      }
      await copyImageToContent(name, await response.blob())
    } catch (error) {
      console.warn(`Could not copy image ${name} into content/images`, error)
    }
  }
}

export function syncContentImages (): Promise<void> {
  if (!import.meta.env.DEV) {
    return Promise.resolve()
  }
  if (running) {
    again = true
    return running
  }
  running = syncOnce()
    .catch(error => console.warn('Copying uploaded images into content/ failed', error))
    .finally(() => {
      running = null
      if (again) {
        again = false
        void syncContentImages()
      }
    })
  return running
}
