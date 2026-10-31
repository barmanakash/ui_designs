// Client-side image pipeline used by /submit and /admin:
//   validate (type + 5 MB) → resize to max 1600px → convert to WebP → extract dominant colors.
// Doing this in the browser keeps uploads small without a server-side image service. Supabase
// Storage still enforces the 5 MB / image-only limits independently (see policies.sql).
import { COLOR_FAMILIES } from './constants'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export interface ProcessedImage {
  blob: Blob
  width: number
  height: number
  /** [accent family hex, average background hex], same shape as the seed data. */
  colors: string[]
}

/** Returns an error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Please choose a PNG, JPG or WebP image.'
  if (file.size > MAX_UPLOAD_BYTES) return 'That image is larger than 5 MB. Please choose a smaller one.'
  return null
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]
const FAMILIES = COLOR_FAMILIES.map((f) => ({ hex: f.hex, rgb: hexToRgb(f.hex) }))

/** Picks the canonical accent family that most pixels are closest to, ignoring greys. */
export function dominantColors(data: Uint8ClampedArray): string[] {
  const counts = new Map<string, number>()
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < data.length; i += 4) {
    const [R, G, B, A] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (A < 128) continue
    r += R; g += G; b += B; n++
    if (Math.max(R, G, B) - Math.min(R, G, B) < 24) continue // greys carry no hue
    let best = FAMILIES[0]
    let bestDist = Infinity
    for (const f of FAMILIES) {
      const d = (R - f.rgb[0]) ** 2 + (G - f.rgb[1]) ** 2 + (B - f.rgb[2]) ** 2
      if (d < bestDist) { bestDist = d; best = f }
    }
    counts.set(best.hex, (counts.get(best.hex) ?? 0) + 1)
  }
  const accent = [...counts.entries()].sort((a, c) => c[1] - a[1])[0]?.[0] ?? '#334155'
  const avg = n ? '#' + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('') : '#ffffff'
  return [accent, avg]
}

export async function processImage(file: File, maxWidth = 1600): Promise<ProcessedImage> {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not supported in this browser.')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not convert the image.'))), 'image/webp', 0.85),
  )

  // Sample a tiny copy for colors: fast and plenty accurate.
  const small = document.createElement('canvas')
  small.width = 24
  small.height = 24
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx?.drawImage(canvas, 0, 0, 24, 24)
  const colors = sctx ? dominantColors(sctx.getImageData(0, 0, 24, 24).data) : ['#334155', '#ffffff']

  bitmap.close()
  return { blob, width, height, colors }
}
