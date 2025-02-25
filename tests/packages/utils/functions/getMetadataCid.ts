import { getMetadataCid } from '@tape.xyz/generic'
import type { Publication } from '@tape.xyz/lens'
import { expect, test } from '@playwright/test'

test('getMetadataCid', async () => {
  const publication = {
    onChainContentURI:
      'ipfs://bafybeic7346c53qefcpm4kbiyhmwomqutcqi3bhf6gppocnajppiui475u'
  }

  const expectedHash =
    'bafybeic7346c53qefcpm4kbiyhmwomqutcqi3bhf6gppocnajppiui475u'
  const actualHash = getMetadataCid(publication as Publication)

  expect(actualHash).toBe(expectedHash)
})
