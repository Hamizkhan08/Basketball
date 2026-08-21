import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className, glass = false, onClick, hover = false }: CardProps) {
  return (
    <div
      className={clsx(
        glass ? 'glass-card' : 'admin-card',
        hover && 'hover:border-zinc-700 transition-colors cursor-pointer',
        'p-5',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: string
  subtitle?: string
}

export function StatCard({ label, value, icon, color = 'text-brand-400', subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        {icon && <span className={clsx('opacity-80', color)}>{icon}</span>}
      </div>
      <span className={clsx('text-3xl font-bold mt-1', color)}>{value}</span>
      {subtitle && <span className="text-zinc-500 text-xs mt-1">{subtitle}</span>}
    </div>
  )
}
