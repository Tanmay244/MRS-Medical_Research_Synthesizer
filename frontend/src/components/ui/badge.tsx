import * as React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-primary/10 text-primary border border-primary/40',
    outline: 'border border-border/60 text-foreground/80',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40',
    warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/40',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

