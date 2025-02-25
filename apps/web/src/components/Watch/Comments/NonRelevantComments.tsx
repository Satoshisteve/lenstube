import ChevronDownOutline from '@components/Common/Icons/ChevronDownOutline'
import ChevronUpOutline from '@components/Common/Icons/ChevronUpOutline'
import CommentsShimmer from '@components/Shimmers/CommentsShimmer'
import { Button } from '@components/UIElements/Button'
import useAuthPersistStore from '@lib/store/auth'
import { t } from '@lingui/macro'
import { LENS_CUSTOM_FILTERS, SCROLL_ROOT_MARGIN } from '@tape.xyz/constants'
import type { Publication } from '@tape.xyz/lens'
import {
  CommentOrderingTypes,
  CommentRankingFilter,
  useCommentsQuery
} from '@tape.xyz/lens'
import { Loader } from '@tape.xyz/ui'
import type { FC } from 'react'
import React, { useState } from 'react'
import { useInView } from 'react-cool-inview'

import Comment from './Comment'

type Props = {
  video: Publication
  className?: string
}

const NonRelevantComments: FC<Props> = ({ video, className }) => {
  const [showSection, setShowSection] = useState(false)
  const selectedSimpleProfile = useAuthPersistStore(
    (state) => state.selectedSimpleProfile
  )

  const request = {
    limit: 10,
    customFilters: LENS_CUSTOM_FILTERS,
    commentsOf: video.id,
    commentsOfOrdering: CommentOrderingTypes.Ranking,
    commentsRankingFilter: CommentRankingFilter.NoneRelevant
  }
  const variables = {
    request,
    reactionRequest: selectedSimpleProfile
      ? { profileId: selectedSimpleProfile?.id }
      : null,
    channelId: selectedSimpleProfile?.id ?? null
  }

  const { data, loading, fetchMore } = useCommentsQuery({
    variables
  })

  const comments = data?.publications?.items as Publication[]
  const pageInfo = data?.publications?.pageInfo

  const { observe } = useInView({
    rootMargin: SCROLL_ROOT_MARGIN,
    onEnter: async () => {
      await fetchMore({
        variables: {
          ...variables,
          request: {
            ...request,
            cursor: pageInfo?.next
          }
        }
      })
    }
  })

  const onToggle = () => {
    setShowSection(!showSection)
  }

  if (!comments?.length) {
    return null
  }

  return (
    <div className={className}>
      <Button
        className="group w-full text-center"
        onClick={() => onToggle()}
        variant="outline"
        size="lg"
      >
        <span className="flex items-center space-x-2">
          <span className="opacity-70 group-hover:opacity-100">
            {showSection ? t`Hide more comments` : t`Show more comments`}
          </span>
          {showSection ? (
            <ChevronUpOutline className="h-3 w-3" />
          ) : (
            <ChevronDownOutline className="h-3 w-3" />
          )}
        </span>
      </Button>
      {showSection ? (
        <>
          <div className="space-y-4 pt-6">
            {loading && <CommentsShimmer />}
            {comments?.map(
              (comment: Publication) =>
                !comment.hidden && (
                  <Comment
                    key={`${comment?.id}_${comment.createdAt}`}
                    comment={comment}
                  />
                )
            )}
          </div>
          {pageInfo?.next && (
            <span ref={observe} className="flex justify-center p-10">
              <Loader />
            </span>
          )}
        </>
      ) : null}
    </div>
  )
}

export default NonRelevantComments
