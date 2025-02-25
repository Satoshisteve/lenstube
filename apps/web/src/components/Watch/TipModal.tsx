import { LENSHUB_PROXY_ABI } from '@abis/LensHubProxy'
import HeartOutline from '@components/Common/Icons/HeartOutline'
import { Button } from '@components/UIElements/Button'
import { Input } from '@components/UIElements/Input'
import Modal from '@components/UIElements/Modal'
import { TextArea } from '@components/UIElements/TextArea'
import { zodResolver } from '@hookform/resolvers/zod'
import useHandleWrongNetwork from '@hooks/useHandleWrongNetwork'
import useAuthPersistStore from '@lib/store/auth'
import useChannelStore from '@lib/store/channel'
import usePersistStore from '@lib/store/persist'
import { t, Trans } from '@lingui/macro'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Analytics, getUserLocale, TRACK } from '@tape.xyz/browser'
import {
  ERROR_MESSAGE,
  LENSHUB_PROXY_ADDRESS,
  REQUESTING_SIGNATURE_MESSAGE,
  STATIC_ASSETS,
  TAPE_APP_ID,
  TAPE_WEBSITE_URL
} from '@tape.xyz/constants'
import { getSignature, imageCdn, logger, uploadToAr } from '@tape.xyz/generic'
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
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { parseEther } from 'viem'
import { useContractWrite, useSendTransaction, useSignTypedData } from 'wagmi'
import type { z } from 'zod'
import { number, object, string } from 'zod'

type Props = {
  show: boolean
  setShowTip: React.Dispatch<boolean>
  video: Publication
}

const formSchema = object({
  tipQuantity: number()
    .nonnegative({ message: t`Tip should to greater than zero` })
    .max(100, { message: t`Tip should be less than or equal to 100 MATIC` })
    .refine((n) => n > 0, { message: t`Tip should be greater than 0 MATIC` }),
  message: string().min(1, { message: t`Tip message is requried` })
})
type FormData = z.infer<typeof formSchema>

const TipModal: FC<Props> = ({ show, setShowTip, video }) => {
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipQuantity: 1,
      message: t`Thanks for making this video!`
    }
  })
  const watchTipQuantity = watch('tipQuantity', 1)

  const { openConnectModal } = useConnectModal()
  const handleWrongNetwork = useHandleWrongNetwork()
  const { cache } = useApolloClient()
  const [loading, setLoading] = useState(false)
  const selectedSimpleProfile = useAuthPersistStore(
    (state) => state.selectedSimpleProfile
  )
  const queuedComments = usePersistStore((state) => state.queuedComments)
  const setQueuedComments = usePersistStore((state) => state.setQueuedComments)
  const activeChannel = useChannelStore((state) => state.activeChannel)
  const userSigNonce = useChannelStore((state) => state.userSigNonce)
  const setUserSigNonce = useChannelStore((state) => state.setUserSigNonce)
  // Dispatcher
  const canUseRelay = activeChannel?.dispatcher?.canUseRelay
  const isSponsored = activeChannel?.dispatcher?.sponsor

  const onError = (error: CustomErrorWithData) => {
    toast.error(error?.data?.message ?? error.message)
    setLoading(false)
  }

  const { sendTransactionAsync } = useSendTransaction({
    onError
  })
  const { signTypedDataAsync } = useSignTypedData({
    onError
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

  const setToQueue = (txn: { txnId?: string; txnHash?: string }) => {
    if (txn?.txnId) {
      setQueuedComments([
        {
          comment: getValues('message'),
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
    toast.success(t`Tipped successfully`)
    Analytics.track(TRACK.PUBLICATION.NEW_COMMENT, {
      publication_id: video.id,
      comment_type: 'tip',
      publication_state: video.isDataAvailability ? 'DATA_ONLY' : 'ON_CHAIN'
    })
    setLoading(false)
    setShowTip(false)
  }

  const { write } = useContractWrite({
    address: LENSHUB_PROXY_ADDRESS,
    abi: LENSHUB_PROXY_ABI,
    functionName: 'comment',
    onError,
    onSuccess: (data) => {
      setToQueue({ txnHash: data.hash })
    }
  })

  const [broadcast] = useBroadcastMutation({
    onError,
    onCompleted: ({ broadcast }) => {
      onCompleted(broadcast.__typename)
      if (broadcast.__typename === 'RelayerResult') {
        setToQueue({ txnId: broadcast.txId })
      }
    }
  })

  const [createCommentViaDispatcher] = useCreateCommentViaDispatcherMutation({
    onError,
    onCompleted: ({ createCommentViaDispatcher }) => {
      onCompleted(createCommentViaDispatcher.__typename)
      if (createCommentViaDispatcher.__typename === 'RelayerResult') {
        setToQueue({ txnId: createCommentViaDispatcher.txId })
      }
    }
  })

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
    if (data?.createCommentViaDispatcher?.__typename === 'RelayError') {
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

  const submitComment = async (txnHash: string) => {
    if (video.isDataAvailability && !isSponsored) {
      return toast.error(
        t`Momoka is currently in beta - during this time certain actions are not available to all channels.`
      )
    }
    try {
      setLoading(true)
      const metadataUri = await uploadToAr({
        version: '2.0.0',
        metadata_id: uuidv4(),
        description: getValues('message'),
        content: getValues('message'),
        locale: getUserLocale(),
        mainContentFocus: PublicationMainFocus.TextOnly,
        external_url: `${TAPE_WEBSITE_URL}/watch/${video?.id}`,
        image: null,
        imageMimeType: null,
        name: `${activeChannel?.handle}'s comment on video ${video.metadata.name}`,
        attributes: [
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'app',
            value: TAPE_APP_ID
          },
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'type',
            value: 'tip'
          },
          {
            displayType: PublicationMetadataDisplayTypes.String,
            traitType: 'hash',
            value: txnHash
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

      return createTypedData(request)
    } catch {}
  }

  const onSendTip = async () => {
    if (!selectedSimpleProfile?.id) {
      return openConnectModal?.()
    }
    if (handleWrongNetwork()) {
      return
    }

    if (video.isDataAvailability && !isSponsored) {
      return toast.error(
        t`Momoka is currently in beta - during this time certain actions are not available to all channels.`
      )
    }
    setLoading(true)
    const amountToSend = Number(getValues('tipQuantity')) * 1
    try {
      const data = await sendTransactionAsync?.({
        to: video.profile?.ownedBy,
        value: BigInt(parseEther(amountToSend.toString() as `${number}`))
      })
      if (data?.hash) {
        await submitComment(data.hash)
      }
      Analytics.track(TRACK.PUBLICATION.TIP.SENT)
    } catch (error) {
      setLoading(false)
      logger.error('[Error Send Tip]', error)
    }
  }

  return (
    <Modal
      title={
        <span className="flex items-center space-x-2 outline-none">
          <HeartOutline className="h-4 w-4" />
          <span>
            <Trans>Tip</Trans> {video.profile?.handle}
          </span>
        </span>
      }
      onClose={() => setShowTip(false)}
      show={show}
      panelClassName="max-w-md"
    >
      <form className="mt-2" onSubmit={handleSubmit(onSendTip)}>
        <div className="flex flex-nowrap items-center justify-center space-x-2 p-10">
          <span className="flex items-center space-x-4">
            <img
              src={imageCdn(
                `${STATIC_ASSETS}/images/raise-hand.png`,
                'AVATAR_LG'
              )}
              alt="Raising Hand"
              className="h-10"
              loading="eager"
              draggable={false}
            />
            <span>x</span>
            <Input
              type="number"
              className="w-14"
              step="any"
              {...register('tipQuantity', { valueAsNumber: true })}
            />
          </span>
        </div>
        <div className="mt-4">
          <TextArea
            label="Message"
            {...register('message')}
            placeholder="Say something nice"
            autoComplete="off"
            className="focus:ring-brand-500 w-full rounded-xl border border-gray-200 bg-white p-2 text-sm outline-none focus:ring-1 disabled:bg-gray-500 disabled:bg-opacity-20 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900"
            rows={3}
          />
          <div className="mx-1 mt-1 text-[11px] opacity-50">
            <Trans>This will be published as a public comment.</Trans>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="w-1/2 truncate">
            {(errors.tipQuantity || errors.message) && (
              <div>
                <p className="text-xs font-medium text-red-500">
                  {errors?.tipQuantity?.message || errors?.message?.message}
                </p>
              </div>
            )}
          </span>
          <Button loading={loading} disabled={!isValid || loading}>
            {`Tip ${
              isNaN(Number(watchTipQuantity) * 1) ||
              Number(watchTipQuantity) < 0
                ? 0
                : Number(watchTipQuantity) * 1
            } MATIC`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default TipModal
