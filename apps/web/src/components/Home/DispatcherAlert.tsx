import HandWaveOutline from '@components/Common/Icons/HandWaveOutline'
import Toggle from '@components/Settings/Permissions/Dispatcher/Toggle'
import SignalWaveGraphic from '@components/UIElements/SignalWaveGraphic'
import useChannelStore from '@lib/store/channel'
import { t, Trans } from '@lingui/macro'
import { OLD_LENS_RELAYER_ADDRESS, TAPE_APP_NAME } from '@tape.xyz/constants'
import { getIsDispatcherEnabled } from '@tape.xyz/generic'
import React from 'react'

const DispatcherAlert = () => {
  const activeChannel = useChannelStore((state) => state.activeChannel)
  const isDispatcherEnabled = getIsDispatcherEnabled(activeChannel)
  const usingOldDispatcher =
    activeChannel?.dispatcher?.address?.toLocaleLowerCase() ===
    OLD_LENS_RELAYER_ADDRESS.toLocaleLowerCase()

  const getDescription = () => {
    if (usingOldDispatcher) {
      return t`Upgrade your dispatcher to the latest version for better, faster, stronger signless transactions.`
    }
    return `You can enable dispatcher to interact with ${TAPE_APP_NAME} without signing any of your transactions.`
  }

  if (!activeChannel || isDispatcherEnabled) {
    return null
  }

  return (
    <div className="mb-4 w-full">
      <div className="relative flex flex-col overflow-hidden rounded-xl p-6 lg:p-8">
        <div className="absolute inset-0 h-full w-full bg-gray-100 bg-gradient-to-b dark:from-gray-800 dark:to-gray-900" />
        <div className="relative z-[1] flex flex-col items-start space-y-4 text-left">
          <div className="flex items-center rounded-full bg-gradient-to-br from-orange-200 to-orange-300 px-3 py-1 text-xs font-medium text-black">
            <HandWaveOutline className="h-3.5 w-3.5" />
            <span className="ml-1">
              <Trans>Action Required</Trans>
            </span>
          </div>
          <div className="flex w-full flex-1 flex-wrap items-center justify-between gap-y-3 dark:text-gray-100">
            <p className="md:text-md text-sm lg:text-lg">{getDescription()}</p>
            <Toggle />
          </div>
        </div>
        <SignalWaveGraphic />
      </div>
    </div>
  )
}

export default DispatcherAlert
