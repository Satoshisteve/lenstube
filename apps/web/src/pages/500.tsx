import { Button } from '@components/UIElements/Button'
import { STATIC_ASSETS, TAPE_APP_NAME } from '@tape.xyz/constants'
import Head from 'next/head'
import Link from 'next/link'
import React from 'react'

export default function Custom500() {
  return (
    <>
      <Head>
        <title>500 - Server Error</title>
      </Head>
      <div className="mt-10 flex h-full flex-col items-center justify-start md:mt-20">
        <img
          src={`${STATIC_ASSETS}/brand/logo.svg`}
          draggable={false}
          height={50}
          width={50}
          alt={TAPE_APP_NAME}
        />
        <div className="py-10 text-center">
          <h1 className="mb-4 text-3xl font-bold">
            Looks like something went wrong!
          </h1>
          <div className="mb-6 max-w-lg">
            We track these errors automatically, but if the problem persists
            feel free to contact us. In the meantime, try refreshing.
          </div>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </>
  )
}
