export const currentTrackSelector = 'a.playbackSoundBadge__titleLink[href]'

const ignoredPaths = new Set([
  '/',
  '/discover',
  '/stream',
  '/you/library',
  '/you/likes',
  '/charts/top',
])

export function normalizeSoundCloudTrackUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const url = parseUrl(trimmed)
  if (!url) return null
  if (url.origin !== 'https://soundcloud.com') return null

  const pathname = normalizePathname(url.pathname)
  if (!pathname || ignoredPaths.has(pathname)) return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null
  if (segments.some((segment) => segment.length === 0)) return null

  return pathname
}

export function readCurrentTrackUrl(root: ParentNode = document): string | null {
  const link = root.querySelector<HTMLAnchorElement>(currentTrackSelector)
  const href = link?.getAttribute('href') ?? link?.href
  return href ? normalizeSoundCloudTrackUrl(href) : null
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value, 'https://soundcloud.com')
  } catch {
    return null
  }
}

function normalizePathname(pathname: string): string | null {
  const decoded = pathname.replace(/\/+/g, '/').replace(/\/$/, '')
  return decoded.startsWith('/') ? decoded : `/${decoded}`
}
