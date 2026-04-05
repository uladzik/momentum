import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AccentColor } from '@/types'

interface Props {
  dark: boolean
  accent: AccentColor
  onClose: () => void
}

export function YearDots({ dark: _dark, accent: ac, onClose }: Props) {
  const [hov, setHov] = useState<number | null>(null)
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const isLeap = new Date(year, 1, 29).getDate() === 29
  const totalDays = isLeap ? 366 : 365
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / 864e5)
  const daysLeft = totalDays - dayOfYear
  const pct = Math.round((dayOfYear / totalDays) * 100)

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const firstDay = new Date(year, i, 1)
      const dayNum = Math.ceil((firstDay.getTime() - startOfYear.getTime()) / 864e5) + 1
      return { name: firstDay.toLocaleDateString('en', { month: 'short' }), start: dayNum }
    })
  }, [year])

  function dateForDay(d: number) {
    return new Date(year, 0, d).toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  function monthForDay(d: number) {
    for (let i = months.length - 1; i >= 0; i--) {
      if (d >= months[i].start) return i
    }
    return 0
  }

  return (
    <div className="fi fixed inset-0 z-50 flex items-center justify-center cursor-default" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-background/95 backdrop-blur-[30px] transition-colors duration-500" onClick={onClose} />

      <div className="si relative z-10 w-full max-w-lg mx-4 p-8 rounded-[32px] bg-card border border-border shadow-lg">

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-3xl font-mono font-bold text-foreground tabular-nums">{year}</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">Day {dayOfYear} · {pct}%</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-bold tabular-nums gt" style={{ background: ac.g }}>{daysLeft}</p>
            <p className="text-xs text-muted-foreground mt-1">days left</p>
          </div>
        </div>

        <div className="text-center mb-3 h-[18px]">
          {hov !== null && <span className="text-[11px] font-mono font-medium text-muted-foreground">{dateForDay(hov)}</span>}
        </div>

        <div className="dots-grid" style={{ '--ac': ac.c } as React.CSSProperties}>
          {Array.from({ length: totalDays }, (_, idx) => {
            const i = idx + 1
            const isPast = i < dayOfYear, isToday = i === dayOfYear
            const mi = monthForDay(i), evenMonth = mi % 2 === 0
            const bg = isToday ? ac.c
              : isPast ? 'oklch(var(--foreground) / 0.12)'
              : (evenMonth ? 'oklch(var(--foreground) / 0.75)' : 'oklch(var(--foreground) / 0.55)')
            return (
              <div key={i} className={cn('dot', isToday ? 'dot-today' : isPast ? 'dot-past' : 'dot-future')}
                style={{ background: bg, '--ac': ac.c } as React.CSSProperties}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
            )
          })}
        </div>

        <div className="flex justify-between mt-4 px-1">
          {months.filter((_, i) => i % 2 === 0).map(m => (
            <span key={m.name} className="month-label text-muted-foreground/40">{m.name}</span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            {[
              { bg: 'oklch(var(--foreground) / 0.12)', label: 'Elapsed' },
              { bg: 'oklch(var(--foreground) / 0.75)', label: 'Remaining' },
              { bg: ac.c, label: 'Today', glow: ac.c },
            ].map(({ bg, label, glow }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ background: bg, ...(glow ? { boxShadow: `0 0 6px ${glow}` } : {}) }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/50">
            <span className="kbd border-border text-muted-foreground">esc</span> close
          </span>
        </div>
      </div>
    </div>
  )
}
