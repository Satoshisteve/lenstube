import { Loader } from '@tape.xyz/ui'
import clsx from 'clsx'
import type { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from 'react'
import React, { forwardRef } from 'react'

export type ButtonVariants = 'primary' | 'hover' | 'danger' | 'outline' | 'none'
export type ButtonSizes = 'sm' | 'md' | 'lg' | 'xl'

interface Props
  extends DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  size?: ButtonSizes
  variant?: ButtonVariants
  loading?: boolean
  children?: ReactNode
  icon?: ReactNode
  className?: string
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    className = '',
    size = 'md',
    variant = 'primary',
    loading,
    children,
    icon,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        {
          'btn-primary': variant === 'primary',
          'btn-danger': variant === 'danger',
          'btn-hover': variant === 'hover',
          'btn-outline': variant === 'outline'
        },
        {
          'px-4 py-1.5 text-xs': size === 'sm',
          'px-5 py-1.5 text-sm md:py-2': size === 'md',
          'px-6 py-3 text-sm': size === 'lg',
          'px-8 py-4 text-lg': size === 'xl',
          '!p-0': variant === 'none'
        },
        className
      )}
      disabled={loading}
      {...rest}
    >
      <span
        className={clsx('flex items-center justify-center space-x-2', {
          'text-white': variant === 'primary' || variant === 'danger'
        })}
      >
        {icon}
        {loading && <Loader size="sm" />}
        {children && (
          <span className="whitespace-nowrap font-medium">{children}</span>
        )}
      </span>
    </button>
  )
})
