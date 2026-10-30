import { t } from '@/i18n'

export interface ReadImageResult {
  dataUrl: string
  width: number
  height: number
}

const SVG_NS = 'http://www.w3.org/2000/svg'

function readAs (file: File, kind: 'text' | 'dataUrl'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.onload = () => resolve(String(reader.result))
    if (kind === 'text') {
      reader.readAsText(file)
    } else {
      reader.readAsDataURL(file)
    }
  })
}

// An SVG only renders as an image (<img>, data: URL) when its root carries
// the SVG namespace - inline <svg> in HTML forgives a missing xmlns, an
// image does not, and the browser then reports nothing but a load error.
// Add it when missing, and reject markup that isn't well-formed XML with a
// message that says so.
async function svgToDataUrl (file: File): Promise<string> {
  let text = await readAs(file, 'text')
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml')
  const error = parsed.querySelector('parsererror')
  if (error) {
    const detail = (error.textContent || '').match(/error on line[^\n]*/i)?.[0] ?? (error.textContent || '').trim()
    throw new Error(t('images.svgMarkupError', { detail }))
  }
  if (parsed.documentElement.namespaceURI !== SVG_NS) {
    text = text.replace(/<svg\b/, `<svg xmlns="${SVG_NS}"`)
  }
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

function isSvg (file: File): boolean {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)
}

export async function readImageFile (file: File): Promise<ReadImageResult> {
  const dataUrl = isSvg(file) ? await svgToDataUrl(file) : await readAs(file, 'dataUrl')
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error(t('images.cannotDisplay', { name: file.name })))
    img.src = dataUrl
  })
}
