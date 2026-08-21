import React from 'react'
import { clsx } from 'clsx'
import type { MatchStatus } from '@/lib/database.types'

interface BadgeProps {
  children: React.ReactNode
  variant?: MatchStatus | 'info' | 'warning' | 'success'
  className?: string
}

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  const variants = {
    live: 'badge-live',
    scheduled: 'badge-upcoming',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    info: 'bg-court-900/80 text-court-300 border border-court-700/50 px-2.5 py-1 rounded-full text-xs font-semibold',
    warning: 'bg-yellow-900/80 text-yellow-300 border border-yellow-700/50 px-2.5 py-1 rounded-full text-xs font-semibold',
    success: 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 px-2.5 py-1 rounded-full text-xs font-semibold',
  }

  return (
    <span className={clsx('inline-flex items-center gap-1.5', variants[variant], className)}>
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-pulse" />
      )}
      {children}
    </span>
  )
}
