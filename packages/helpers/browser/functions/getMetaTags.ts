import {
  OG_IMAGE,
  TAPE_API_URL,
  TAPE_APP_DESCRIPTION,
  TAPE_APP_NAME,
  TAPE_EMBED_URL,
  TAPE_WEBSITE_URL,
  TAPE_X_HANDLE
} from '@tape.xyz/constants'
import { getPublicationMediaUrl } from '@tape.xyz/generic'
import type { Publication } from '@tape.xyz/lens'

type Args = {
  title: string
  description: string
  image: string
  page?: 'PROFILE' | 'VIDEO'
  handle?: string
  pubId?: string
  publication?: Publication
}

export const getMetaTags = ({
  title,
  description,
  image,
  page,
  handle,
  pubId,
  publication
}: Args) => {
  const isVideo = page === 'VIDEO'
  const meta = {
    title: title ?? TAPE_APP_NAME,
    description: description || TAPE_APP_DESCRIPTION,
    image: image ?? OG_IMAGE,
    url: isVideo
      ? `${TAPE_WEBSITE_URL}/watch/${pubId}`
      : `${TAPE_WEBSITE_URL}/channel/${handle}`
  }

  let defaultMeta = `<title>${meta.title}</title>
              <meta charset="UTF-8" />
              <meta content="${meta.description}" name="description" />
              <meta name="robots" content="follow, index" />
              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
              <meta property="og:url" content="${meta.url}" />
              <meta property="og:site_name" content="${TAPE_APP_NAME}" />
              <meta property="og:description" content="${meta.description}" />
              <meta property="og:title" content="${meta.title}" />
              <meta property="og:image" content="${meta.image}" />
              <meta property="og:image:width" content="${
                isVideo ? 480 : 400
              }" />
              <meta property="og:image:height" content="${
                isVideo ? 360 : 400
              }" />
              <meta property="twitter:image:width" content="${
                isVideo ? 480 : 400
              }" />
              <meta property="twitter:image:height" content="${
                isVideo ? 360 : 400
              }" />
              <meta name="twitter:site" content="@${TAPE_X_HANDLE}" />
              <meta name="twitter:title" content="${meta.title}" />
              <meta name="twitter:description" content="${meta.description}" />
              <meta property="twitter:image" content="${meta.image}" />
              <meta property="twitter:creator" content="${TAPE_X_HANDLE}" />
              <meta name="twitter:card" content="${
                isVideo ? 'player' : 'summary'
              }" />`

  if (isVideo && publication) {
    const embedUrl = `${TAPE_EMBED_URL}/${pubId}`
    // TODO: add `hasPart`
    const schemaObject = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: meta.title,
      description,
      thumbnailUrl: meta.image,
      uploadDate: publication.createdAt,
      // duration: secondsToISO(
      //   getValueFromTraitType(
      //     publication.metadata.attributes as Attribute[],
      //     'durationInSeconds'
      //   )
      // ),
      contentUrl: getPublicationMediaUrl(publication),
      embedUrl,
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: { '@type': 'LikeAction' },
        userInteractionCount: publication?.stats.totalUpvotes
      }
    }
    defaultMeta += `<meta property="og:video" content="${embedUrl}" />
      <meta property="og:video:width" content="1280" />
      <meta property="og:video:height" content="720" />
      <meta property="og:video:url" content="${embedUrl}" />
      <meta property="og:video:secure_url" content="${embedUrl}"/>
      <meta property="og:video:type" content="text/html" />

      <meta name="twitter:url" content="${meta.url}" />
      <meta name="twitter:player" content="${embedUrl}" />
      <meta property="twitter:player:width" content="1280" />
      <meta property="twitter:player:height" content="720" />
      <link rel="iframely player" type="text/html" href="${embedUrl}" media="(aspect-ratio: 1280/720)" />
      <link rel="alternate" type="text/xml+oembed" href="${TAPE_API_URL}/oembed?format=xml&id=${pubId}" title="${title}" />
      <link rel="alternate" type="application/json+oembed" href="${TAPE_API_URL}/oembed?format=json&id=${pubId}" title="${title}" />

      <meta property="og:video:url" content="${meta.url}" />
      <meta property="og:video:secure_url" content="${meta.url}" />
      <meta property="og:video:type" content="application/x-shockwave-flash" />
      <meta property="og:video:width" content="1280" />
      <meta property="og:video:height" content="720" />
      <script type="application/ld+json">${JSON.stringify(
        schemaObject
      )}</script>`
  }

  return `<!DOCTYPE html>
          <html lang="en">
            <head>
              ${defaultMeta}
            </head>
            <body>
              <h1>${title}</h1>
            </body>
          </html>`
}
