import { useMemo, useState } from 'react'
import type { AccentColor } from '@/types'

interface Props {
  dark: boolean
  accent: AccentColor
  onClose: () => void
}

export function YearDots({ dark, accent: ac, onClose }: Props) {
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
      <div className={`absolute inset-0 transition-colors duration-500 ${dark ? 'bg-[#020204]/95' : 'bg-[#f8f9fb]/95'}`}
        style={{ backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }} onClick={onClose} />

      <div className="si relative z-10 w-full max-w-lg mx-4 p-8 rounded-[32px]"
        style={dark
          ? { background: 'linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))', border: '1px solid rgba(255,255,255,.07)' }
          : { background: 'linear-gradient(145deg,rgba(255,255,255,.7),rgba(255,255,255,.4))', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.12)' }}>

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">{year}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-1">Day {dayOfYear} · {pct}%</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-bold tabular-nums gt" style={{ background: ac.g }}>{daysLeft}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">days left</p>
          </div>
        </div>

        <div className="text-center mb-3" style={{ height: 18 }}>
          {hov !== null && <span className="text-[11px] font-mono font-medium text-gray-400 dark:text-gray-500">{dateForDay(hov)}</span>}
        </div>

        <div className="dots-grid" style={{ '--ac': ac.c } as React.CSSProperties}>
          {Array.from({ length: totalDays }, (_, idx) => {
            const i = idx + 1
            const isPast = i < dayOfYear, isToday = i === dayOfYear
            const mi = monthForDay(i), evenMonth = mi % 2 === 0
            const bg = isToday ? ac.c
              : isPast ? (dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)')
              : (dark ? (evenMonth ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.55)') : (evenMonth ? 'rgba(0,0,0,.65)' : 'rgba(0,0,0,.4)'))
            return (
              <div key={i} className={`dot${isToday ? ' dot-today' : isPast ? ' dot-past' : ' dot-future'}`}
                style={{ background: bg, '--ac': ac.c } as React.CSSProperties}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
            )
          })}
        </div>

        <div className="flex justify-between mt-4 px-1">
          {months.filter((_, i) => i % 2 === 0).map(m => (
            <span key={m.name} className="month-label">{m.name}</span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
          <div className="flex items-center gap-3">
            {[
              { bg: dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)', label: 'Elapsed' },
              { bg: dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)', label: 'Remaining' },
              { bg: ac.c, label: 'Today', glow: ac.c },
            ].map(({ bg, label, glow }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: bg, ...(glow ? { boxShadow: `0 0 6px ${glow}` } : {}) }} />
                <span className="text-[10px] text-gray-400 dark:text-gray-600">{label}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-700">
            <span className="kbd border-gray-300 dark:border-gray-800">esc</span> close
          </span>
        </div>
      </div>
    </div>
  )
}
