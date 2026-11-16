// A picture made no bigger than where it is shown needs: scaled down to
// maxWidth (never up) and saved as WebP - the visitor downloads less.
// SVG and animated GIF stay as they are; so does a file that would come
// out no smaller.
//
// Banner sizes: a phone box is at most ~430px wide, ×2 for a sharp screen;
// a desktop one is the whole window, up to a wide monitor.
export const BANNER_MAX_WIDTH = { desktop: 2560, mobile: 960 } as const

const QUALITY = 0.85

export async function fitImage (file: File, maxWidth: number): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // not a picture the browser can draw - left for the caller to report
    return file
  }
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', QUALITY))
  if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) {
    return file
  }
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
}
