import { useEffect, useState } from 'react'

interface Props {
  size: number
  pct: number
  colors: [string, string]
  label: string
  idx: number
  isActive?: boolean
}

export function Ring({ size: sz, pct, colors, label, idx, isActive }: Props) {
  const sw = 3, r = (sz - sw) / 2, ci = 2 * Math.PI * r
  const off = ci - (Math.min(pct, 100) / 100) * ci
  const c = sz / 2
  const gid = `rg${label}`
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100 + idx * 150)
    return () => clearTimeout(t)
  }, [idx])

  return (
    <div className="absolute" style={{ width: sz, height: sz, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
      {isActive && (
        <div
          className="breathe absolute rounded-full"
          style={{ width: sz + 10, height: sz + 10, top: '50%', left: '50%', border: `1.5px solid ${colors[0]}`, opacity: 0.25 }}
        />
      )}
      <svg width={sz} height={sz}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" className="text-black/[0.03] dark:text-white/[0.03]" strokeWidth={sw} />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={ci}
          strokeDashoffset={mounted ? off : ci}
          className="ring-draw"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
    </div>
  )
}
