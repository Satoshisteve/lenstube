import CheckOutline from '@components/Common/Icons/CheckOutline'
import { Button } from '@components/UIElements/Button'
import Modal from '@components/UIElements/Modal'
import useAppStore from '@lib/store'
import clsx from 'clsx'
import React, { useState } from 'react'
import type { TokenGatingType } from 'utils'
import { useProvider, useSigner } from 'wagmi'

import CollectedForm from './CollectedForm'

const TokenGating = () => {
  const [showModal, setShowModal] = useState(false)
  const uploadedVideo = useAppStore((state) => state.uploadedVideo)
  const setUploadedVideo = useAppStore((state) => state.setUploadedVideo)
  const getTokenGatingInstance = useAppStore(
    (state) => state.getTokenGatingInstance
  )

  const { data: signer } = useSigner()
  const provider = useProvider()

  const initTokenGating = async () => {
    if (!signer || uploadedVideo.tokenGating.instance) return
    const gatedSdk = await getTokenGatingInstance(signer, provider)
    setUploadedVideo({ ...uploadedVideo, tokenGating: { instance: gatedSdk } })
  }

  const getSelectedTokenGatingType = () => {
    const isAccessRestricted = uploadedVideo?.tokenGating?.isAccessRestricted
    if (!isAccessRestricted) {
      return 'Everyone can view'
    } else {
      return 'Only certain audience can view'
    }
  }

  const setTokenGatingType = (data: TokenGatingType) => {
    setUploadedVideo({
      tokenGating: { ...uploadedVideo.tokenGating, ...data }
    })
  }

  return (
    <>
      <div className="flex items-center mb-1 space-x-1.5">
        <div className="text-[11px] font-semibold uppercase opacity-70">
          Token Gated Access
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setShowModal(true)
          initTokenGating()
        }}
        className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left border border-gray-300 focus:outline-none dark:border-gray-700 rounded-xl"
      >
        <span>{getSelectedTokenGatingType()}</span>
        <CheckOutline className="w-3 h-3" />
      </button>
      <Modal
        title="Who can view your content?"
        panelClassName="max-w-lg"
        onClose={() => setShowModal(false)}
        show={showModal}
      >
        <div className="mt-2 space-y-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() =>
                setTokenGatingType({
                  isAccessRestricted: false
                })
              }
              className={clsx(
                'flex items-center justify-between w-full px-4 py-2 text-sm border border-gray-200 hover:!border-indigo-500 focus:outline-none dark:border-gray-800 rounded-xl',
                {
                  '!border-indigo-500':
                    !uploadedVideo.tokenGating.isAccessRestricted
                }
              )}
            >
              <span>Everyone</span>
              {!uploadedVideo?.tokenGating.isAccessRestricted && (
                <CheckOutline className="w-3 h-3" />
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                setTokenGatingType({
                  isAccessRestricted: true
                })
              }
              className={clsx(
                'flex items-center text-left justify-between w-full px-4 py-2 text-sm border border-gray-200 hover:!border-indigo-500 focus:outline-none dark:border-gray-800 rounded-xl',
                {
                  '!border-indigo-500':
                    uploadedVideo.tokenGating.isAccessRestricted
                }
              )}
            >
              <span>Certain Audience</span>
              {uploadedVideo?.tokenGating.isAccessRestricted && (
                <CheckOutline className="w-3 h-3" />
              )}
            </button>
          </div>
          {uploadedVideo.tokenGating.isAccessRestricted ? (
            <CollectedForm
              uploadedVideo={uploadedVideo}
              setTokenGatingType={setTokenGatingType}
              setShowModal={setShowModal}
            />
          ) : (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setShowModal(false)}>
                Set Preference
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export default TokenGating
