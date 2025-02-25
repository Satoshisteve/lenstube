import { FALLBACK_COVER_URL } from '@tape.xyz/constants'
import type { Publication } from '@tape.xyz/lens'

import { sanitizeDStorageUrl } from './sanitizeDStorageUrl'

export const getThumbnailUrl = (
  video: Publication,
  withFallback?: boolean
): string => {
  let url = video?.metadata?.cover?.original.url || video?.metadata?.image

  if (withFallback) {
    url = url || FALLBACK_COVER_URL
  }

  return sanitizeDStorageUrl(url)
}
