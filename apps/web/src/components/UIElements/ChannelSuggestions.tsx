import Badge from '@components/Common/Badge'
import { Trans } from '@lingui/macro'
import { formatNumber, trimLensHandle } from '@tape.xyz/generic'
import clsx from 'clsx'
import type { FC } from 'react'
import React from 'react'

type Props = {
  className?: string
  picture: string
  handle: string
  id: string
  subscribersCount: number
}

const ChannelSuggestions: FC<Props> = ({
  className,
  picture,
  handle,
  id,
  subscribersCount
}) => {
  return (
    <div className={clsx('flex space-x-1.5 truncate px-1.5 py-1.5', className)}>
      <img
        src={picture}
        className="mt-1 h-6 w-6 rounded-full"
        alt="pfp"
        draggable={false}
      />
      <div className="overflow-hidden">
        <div className="flex items-center space-x-0.5">
          <p className="truncate font-medium leading-4">
            {trimLensHandle(handle)}
          </p>
          <Badge id={id} size="xs" />
        </div>
        <span className="text-xs opacity-80">
          {formatNumber(subscribersCount)} <Trans>subscribers</Trans>
        </span>
      </div>
    </div>
  )
}

export default ChannelSuggestions
