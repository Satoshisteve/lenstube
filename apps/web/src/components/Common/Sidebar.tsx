import Tooltip from '@components/UIElements/Tooltip'
import usePersistStore from '@lib/store/persist'
import { t, Trans } from '@lingui/macro'
import { getShowFullScreen } from '@tape.xyz/browser'
import { STATIC_ASSETS, TAPE_APP_NAME } from '@tape.xyz/constants'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

import CreateChannel from './CreateChannel'
import Footer from './Footer'
import BytesOutline from './Icons/BytesOutline'
import ChevronLeftOutline from './Icons/ChevronLeftOutline'
import ChevronRightOutline from './Icons/ChevronRightOutline'
import ExploreOutline from './Icons/ExploreOutline'
import FeedOutline from './Icons/FeedOutline'
import HomeOutline from './Icons/HomeOutline'
import Locale from './Locale'
import MobileBottomNav from './MobileBottomNav'

const Sidebar = () => {
  const router = useRouter()
  const sidebarCollapsed = usePersistStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = usePersistStore(
    (state) => state.setSidebarCollapsed
  )

  const isActivePath = (path: string) => router.pathname === path

  return (
    <>
      {!getShowFullScreen(router.pathname) && <MobileBottomNav />}
      <CreateChannel />
      <div
        className={clsx(
          'transition-width fixed bottom-0 left-0 top-0 z-10 hidden items-start justify-between bg-white dark:bg-black/50 md:flex md:flex-col',
          sidebarCollapsed ? 'w-[90px]' : 'w-[180px]'
        )}
      >
        <div
          className={clsx(
            'flex flex-col space-y-2',
            sidebarCollapsed ? 'self-center' : 'w-full px-3'
          )}
          data-testid="sidebar-items"
        >
          <div className={clsx('py-3', sidebarCollapsed ? 'px-2' : 'px-3')}>
            <Link
              href="/"
              className="flex items-center pt-0.5 focus:outline-none"
            >
              <img
                src={`${STATIC_ASSETS}/brand/logo.svg`}
                draggable={false}
                className="h-8 w-8"
                alt={TAPE_APP_NAME}
              />
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2">
            <Tooltip
              content={t`Home`}
              visible={sidebarCollapsed}
              placement="right"
            >
              <Link
                href="/"
                className={clsx(
                  'group flex h-12 items-center rounded-full py-2 2xl:py-2.5',
                  isActivePath('/')
                    ? 'bg-brand-50 dark:bg-brand-900'
                    : 'dark:hover:bg-brand-900 hover:bg-brand-50',
                  sidebarCollapsed
                    ? 'w-12 justify-center'
                    : 'w-full space-x-3 px-3.5'
                )}
              >
                <HomeOutline className="h-5 w-5" />
                {!sidebarCollapsed && (
                  <span className="text-sm">
                    <Trans>Home</Trans>
                  </span>
                )}
              </Link>
            </Tooltip>
            <Tooltip
              content={t`Subscriptions`}
              visible={sidebarCollapsed}
              placement="right"
            >
              <Link
                href="/feed"
                className={clsx(
                  'group flex h-12 items-center rounded-full py-2 2xl:py-2.5',
                  isActivePath('/feed')
                    ? 'bg-brand-50 dark:bg-brand-900'
                    : 'hover:bg-brand-50 dark:hover:bg-brand-900',
                  sidebarCollapsed
                    ? 'w-12 justify-center'
                    : 'w-full space-x-3 px-3.5'
                )}
              >
                <FeedOutline className="h-5 w-5 flex-none" />
                {!sidebarCollapsed && (
                  <span className="text-sm">
                    <Trans>Subscriptions</Trans>
                  </span>
                )}
              </Link>
            </Tooltip>
            <Tooltip
              content={t`Bytes`}
              visible={sidebarCollapsed}
              placement="right"
            >
              <Link
                href="/bytes"
                className={clsx(
                  'group flex h-12 items-center rounded-full py-2 2xl:py-2.5',
                  isActivePath('/bytes') || router.pathname === '/bytes/[id]'
                    ? 'bg-brand-50 dark:bg-brand-900'
                    : 'hover:bg-brand-50 dark:hover:bg-brand-900',
                  sidebarCollapsed
                    ? 'w-12 justify-center'
                    : 'w-full space-x-3 px-3.5'
                )}
              >
                <BytesOutline className="h-5 w-5" />
                {!sidebarCollapsed && (
                  <span className="text-sm">
                    <Trans>Bytes</Trans>
                  </span>
                )}
              </Link>
            </Tooltip>
            <Tooltip
              content={t`Explore`}
              visible={sidebarCollapsed}
              placement="right"
            >
              <Link
                href="/explore"
                className={clsx(
                  'group flex h-12 items-center rounded-full py-2 2xl:py-2.5',
                  isActivePath('/explore')
                    ? 'bg-brand-50 dark:bg-brand-900'
                    : 'hover:bg-brand-50 dark:hover:bg-brand-900',
                  sidebarCollapsed
                    ? 'w-12 justify-center'
                    : 'w-full space-x-3 px-3.5'
                )}
              >
                <ExploreOutline className="h-5 w-5" />
                {!sidebarCollapsed && (
                  <span className="text-sm">
                    <Trans>Explore</Trans>
                  </span>
                )}
              </Link>
            </Tooltip>
          </div>
        </div>
        <div
          className={clsx(
            'mb-2 flex flex-col',
            sidebarCollapsed ? 'mx-auto' : 'px-3'
          )}
        >
          {!sidebarCollapsed && <Footer />}
          <Locale />
          <button
            type="button"
            className={clsx(
              'hover:bg-brand-50 dark:hover:bg-brand-800 flex h-12 items-center justify-center rounded-full p-3.5 opacity-90 hover:opacity-100 focus:outline-none',
              sidebarCollapsed ? 'w-12' : 'w-full'
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRightOutline className="h-3 w-3" />
            ) : (
              <ChevronLeftOutline className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default Sidebar
