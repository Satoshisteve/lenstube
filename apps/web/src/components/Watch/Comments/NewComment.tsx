import { LENSHUB_PROXY_ABI } from '@abis/LensHubProxy'
import { Button } from '@components/UIElements/Button'
import EmojiPicker from '@components/UIElements/EmojiPicker'
import InputMentions from '@components/UIElements/InputMentions'
import { zodResolver } from '@hookform/resolvers/zod'
import useHandleWrongNetwork from '@hooks/useHandleWrongNetwork'
import useAuthPersistStore from '@lib/store/auth'
import useChannelStore from '@lib/store/channel'
import usePersistStore from '@lib/store/persist'
import { t, Trans } from '@lingui/macro'
import { Analytics, getUserLocale, TRACK } from '@tape.xyz/browser'
import {
  ERROR_MESSAGE,
  LENSHUB_PROXY_ADDRESS,
  REQUESTING_SIGNATURE_MESSAGE,
  TAPE_APP_ID,
  TAPE_WEBSITE_URL
} from '@tape.xyz/constants'
import {
  getProfilePicture,
  getSignature,
  trimify,
  uploadToAr
} from '@tape.xyz/generic'
import type {
  CreateCommentBroadcastItemResult,
  CreateDataAvailabilityCommentRequest,
  CreatePublicCommentRequest,
  Publication
} from '@tape.xyz/lens'
import {
  PublicationDetailsDocument,
  PublicationMainFocus,
  PublicationMetadataDisplayTypes,
  useBroadcastDataAvailabilityMutation,
  useBroadcastMutation,
  useCreateCommentTypedDataMutation,
  useCreateCommentViaDispatcherMutation,
  useCreateDataAvailabilityCommentTypedDataMutation,
  useCreateDataAvailabilityCommentViaDispatcherMutation,
  usePublicationDetailsLazyQuery
} from '@tape.xyz/lens'
import { useApolloClient } from '@tape.xyz/lens/apollo'
import type { CustomErrorWithData } from '@tape.xyz/lens/custom-types'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { useContractWrite, useSignTypedData } from 'wagmi'
import type { z } from 'zod'
import { object, string } from 'zod'

type Props = {
  video: Publication
  defaultValue?: string
  placeholder?: string
  hideEmojiPicker?: boolean
}

const formSchema = object({
  comment: string({ required_error: t`Enter valid comment` })
    .trim()
    .min(1, { message: t`Enter valid comment` })
    .max(5000, { message: t`Comment should not exceed 5000 characters` })
})
type FormData = z.infer<typeof formSchema>

const NewComment: FC<Props> = ({
  video,
  defaultValue = '',
  placeholder = t`How's this video?`,
  hideEmojiPicker = false
}) => {
  const { cache } = useApolloClient()

  const [loading, setLoading] = useState(false)
  const activeChannel = useChannelStore((state) => state.activeChannel)
  const selectedSimpleProfile = useAuthPersistStore(
    (state) => state.selectedSimpleProfile
  )
  const handleWrongNetwork = useHandleWrongNetwork()
  const queuedComments = usePersistStore((state) => state.queuedComments)
  const setQueuedComments = usePersistStore((state) => state.setQueuedComments)
  const userSigNonce = useChannelStore((state) => state.userSigNonce)
  const setUserSigNonce = useChannelStore((state) => state.setUserSigNonce)
  // Dispatcher
  const canUseRelay = activeChannel?.dispatcher?.canUseRelay
  const isSponsored = activeChannel?.dispatcher?.sponsor

  const {
    clearErrors,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm<FormData>({
    defaultValues: {
      comment: defaultValue
    },
    resolver: zodResolver(formSchema)
  })

  useEffect(() => {
    setValue('comment', defaultValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue])

  const setToQueue = (txn: { txnId?: string; txnHash?: string }) => {
    if (txn?.txnId) {
      setQueuedComments([
        {
          comment: getValues('comment'),
          txnId: txn.txnId,
          txnHash: txn.txnHash,
          pubId: video.id
        },
        ...(queuedComments || [])
      ])
    }
  }

  const onCompleted = (__typename?: 'RelayError' | 'RelayerResult') => {
    if (__typename === 'RelayError') {
      return
    }
    Analytics.track(TRACK.PUBLICATION.NEW_COMMENT, {
      publication_id: video.id,
      publication_state: video.isDataAvailability ? 'DATA_ONLY' : 'ON_CHAIN'
    })
    reset()
    setLoading(false)
  }

  const onError = (error: CustomErrorWithData) => {
    toast.error(error?.data?.message ?? error?.message ?? ERROR_MESSAGE)
    setLoading(false)
  }

  const { signTypedDataAsync } = useSignTypedData({
    onError
  })

  const { write } = useContractWrite({
    address: LENSHUB_PROXY_ADDRESS,
    abi: LENSHUB_PROXY_ABI,
    functionName: 'comment',
    onError,
    onSuccess: (data) => {
      if (data.hash) {
        setToQueue({ txnHash: data.hash })
      }
    }
  })

  const [broadcast] = useBroadcastMutation({
    onError,
    onCompleted: ({ broadcast }) => {
      if (broadcast.__typename === 'RelayerResult') {
        setToQueue({ txnId: broadcast.txId })
      }
      onCompleted(broadcast.__typename)
    }
  })

  const [createCommentViaDispatcher] = useCreateCommentViaDispatcherMutation({
    onError,
    onCompleted: ({ createCommentViaDispatcher }) => {
      if (createCommentViaDispatcher.__typename === 'RelayerResult') {
        setToQueue({ txnId: createCommentViaDispatcher.txId })
      }
      onCompleted(createCommentViaDispatcher.__typename)
    }
  })

  const [getComment] = usePublicationDetailsLazyQuery()

  const fetchAndCacheComment = async (commentId: string) => {
    const { data } = await getComment({
      variables: {
        request: {
          publicationId: commentId
        }
      }
    })
    if (data?.publication) {
      cache.modify({
        fields: {
          publications() {
            cache.writeQuery({
              data: { publication: data?.publication },
              query: PublicationDetailsDocument
            })
          }
        }
      })
    }
  }

  const getSignatureFromTypedData = async (
    data: CreateCommentBroadcastItemResult
  ) => {
    const { typedData } = data
    toast.loading(REQUESTING_SIGNATURE_MESSAGE)
    const signature = await signTypedDataAsync(getSignature(typedData))
    return signature
  }

  const [createCommentTypedData] = useCreateCommentTypedDataMutation({
    onCompleted: async ({ createCommentTypedData }) => {
      const { typedData, id } = createCommentTypedData
      try {
        const signature = await getSignatureFromTypedData(
          createCommentTypedData
        )
        setUserSigNonce(userSigNonce + 1)
        const { data } = await broadcast({
          variables: { request: { id, signature } }
        })
        if (data?.broadcast?.__typename === 'RelayError') {
          write?.({ args: [typedData.value] })
        }
      } catch {
        setLoading(false)
      }
    },
    onError
  })

  const createTypedData = async (request: CreatePublicCommentRequest) => {
    await createCommentTypedData({
      variables: { options: { overrideSigNonce: userSigNonce }, request }
    })
  }

  const createViaDispatcher = async (request: CreatePublicCommentRequest) => {
    const { data } = await createCommentViaDispatcher({
      variables: { request }
    })
    if (data?.createCommentViaDispatcher.__typename === 'RelayError') {
      await createTypedData(request)
    }
  }

  /**
   * DATA AVAILABILITY STARTS
   */
  const [broadcastDataAvailabilityComment] =
    useBroadcastDataAvailabilityMutation({
      onCompleted: async (data) => {
        onCompleted()
        if (data.broadcastDataAvailability.__typename === 'RelayError') {
          return toast.error(ERROR_MESSAGE)
        }
        if (
          data?.broadcastDataAvailability.__typename ===
          'CreateDataAvailabilityPublicationResult'
        ) {
          const commentId = data?.broadcastDataAvailability.id
          await fetchAndCacheComment(commentId)
        }
      },
      onError
    })

  const [createDataAvailabilityCommentViaDispatcher] =
    useCreateDataAvailabilityCommentViaDispatcherMutation({
      onCompleted: async (data) => {
        if (
          data?.createDataAvailabilityCommentViaDispatcher?.__typename ===
          'RelayError'
        ) {
          return
        }
        if (
          data?.createDataAvailabilityCommentViaDispatcher.__typename ===
          'CreateDataAvailabilityPublicationResult'
        ) {
          onCompleted()
          const { id: commentId } =
            data.createDataAvailabilityCommentViaDispatcher
          await fetchAndCacheComment(commentId)
        }
      },
      onError
    })

  const [createDataAvailabilityCommentTypedData] =
    useCreateDataAvailabilityCommentTypedDataMutation({
      onCompleted: async ({ createDataAvailabilityCommentTypedData }) => {
        const { id } = createDataAvailabilityCommentTypedData
        const signature = await getSignatureFromTypedData(
          createDataAvailabilityCommentTypedData
        )
        return await broadcastDataAvailabilityComment({
          variables: { request: { id, signature } }
        })
      }
    })

  const createViaDataAvailablityDispatcher = async (
    request: CreateDataAvailabilityCommentRequest
  ) => {
    const variables = { request }

    const { data } = await createDataAvailabilityCommentViaDispatcher({
      variables
    })

    if (
      data?.createDataAvailabilityCommentViaDispatcher?.__typename ===
      'RelayError'
    ) {
      return await createDataAvailabilityCommentTypedData({ variables })
    }
  }
  /**
   * DATA AVAILABILITY ENDS
   */

  const submitComment = async (formData: FormData) => {
    if (video.isDataAvailability && !isSponsored) {
      return toast.error(
        t`Momoka is currently in beta - during this time certain actions are not available to all channels.`
      )
    }
    try {
      if (handleWrongNetwork()) {
        return
      }
      setLoading(true)
      const metadataUri = await uploadToAr({
        version: '2.0.0',
        metadata_id: uuidv4(),
        description: trimify(formData.comment),
        content: trimify(formData.comment),
        locale: getUserLocale(),
        mainContentFocus: PublicationMainFocus.TextOnly,
        external_url: `${TAPE_WEBSITE_URL}/watch/${video?.id}`,
        image: null,
        imageMimeType: null,
        name: `${activeChannel?.handle}'s comment on video ${video.metadata.name}`,
        attributes: [
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'publication',
            value: 'comment'
          },
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'app',
            value: TAPE_APP_ID
          }
        ],
        media: [],
        appId: TAPE_APP_ID
      })

      const dataAvailablityRequest = {
        from: activeChannel?.id,
        commentOn: video.id,
        contentURI: metadataUri
      }
      const request = {
        profileId: activeChannel?.id,
        publicationId: video?.id,
        contentURI: metadataUri,
        collectModule: {
          revertCollectModule: true
        },
        referenceModule: {
          followerOnlyReferenceModule: false
        }
      }

      if (canUseRelay) {
        if (video.isDataAvailability && isSponsored) {
          return await createViaDataAvailablityDispatcher(
            dataAvailablityRequest
          )
        }

        return await createViaDispatcher(request)
      }

      return await createTypedData(request)
    } catch {}
  }

  if (!activeChannel || !selectedSimpleProfile?.id) {
    return null
  }

  return (
    <form
      onSubmit={handleSubmit(submitComment)}
      className="mb-2 flex w-full flex-wrap items-start justify-end gap-2"
    >
      <div className="flex flex-1 items-center space-x-2 md:space-x-3">
        <div className="flex-none">
          <img
            src={getProfilePicture(activeChannel, 'AVATAR')}
            className="h-9 w-9 rounded-full"
            draggable={false}
            alt={activeChannel?.handle}
          />
        </div>
        <div className="relative w-full">
          <InputMentions
            placeholder={placeholder}
            autoComplete="off"
            validationError={errors.comment?.message}
            value={watch('comment')}
            onContentChange={(value) => {
              setValue('comment', value)
              clearErrors('comment')
            }}
            mentionsSelector="input-mentions-single"
          />
          {!hideEmojiPicker && (
            <div className="absolute bottom-2 right-2">
              <EmojiPicker
                onEmojiSelect={(emoji) =>
                  setValue('comment', `${getValues('comment')}${emoji}`)
                }
              />
            </div>
          )}
        </div>
      </div>
      <Button variant="outline" loading={loading}>
        <Trans>Comment</Trans>
      </Button>
    </form>
  )
}

export default NewComment
