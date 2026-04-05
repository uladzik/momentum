import { useMemo } from 'react'
import { Ring } from './Ring'
import { AnimatedNumber } from './AnimatedNumber'
import { tip, acc } from '@/lib/time'
import type { TimeProgress } from '@/types'

const RINGS = [
  { l: 'Year', k: 'yP' as const, c: ['#818cf8', '#c4b5fd'] as [string, string], s: 156 },
  { l: 'Month', k: 'mP' as const, c: ['#34d399', '#6ee7b7'] as [string, string], s: 120 },
  { l: 'Week', k: 'wP' as const, c: ['#fbbf24', '#fde68a'] as [string, string], s: 84 },
  { l: 'Day', k: 'dP' as const, c: ['#fb7185', '#fecdd3'] as [string, string], s: 48 },
]

interface Particle { i: number; l: number; sz: number; dur: number; del: number; op: number }

function Particles({ color }: { color: string }) {
  const items = useMemo<Particle[]>(() =>
    Array.from({ length: 30 }, (_, i) => ({
      i, l: Math.random() * 100, sz: Math.random() * 2 + 0.5,
      dur: Math.random() * 12 + 6, del: Math.random() * 8, op: Math.random() * 0.25 + 0.05,
    })), [])
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {items.map(pt => (
        <div key={pt.i} className="particle" style={{ left: `${pt.l}%`, bottom: '-5px', width: pt.sz, height: pt.sz, background: color, opacity: pt.op, animationDuration: `${pt.dur}s`, animationDelay: `${pt.del}s` }} />
      ))}
    </div>
  )
}

interface Props {
  t: TimeProgress
  dark: boolean
  onClose: () => void
}

export function AmbientMode({ t, dark, onClose }: Props) {
  const hr = t.now.getHours(), ac = acc(hr)
  const ts = t.now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  const sc = String(t.now.getSeconds()).padStart(2, '0')
  const ds = t.now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="fi fixed inset-0 z-50 flex items-center justify-center flex-col cursor-default" onClick={onClose}>
      <div className={`absolute inset-0 transition-colors duration-1000 ${dark ? 'bg-[#020204]' : 'bg-[#fafafa]'}`}>
        <div className="absolute rounded-full" style={{ width: 500, height: 500, top: '8%', left: '12%', background: ac.c, opacity: dark ? 0.06 : 0.08, filter: 'blur(130px)', animation: 'orbA 18s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 400, bottom: '10%', right: '8%', background: ac.c2, opacity: dark ? 0.04 : 0.06, filter: 'blur(110px) hue-rotate(40deg)', animation: 'orbB 14s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ width: 300, height: 300, top: '40%', left: '50%', background: ac.c, opacity: dark ? 0.03 : 0.04, filter: 'blur(90px) hue-rotate(-30deg)', animation: 'orbC 20s ease-in-out infinite' }} />
        <Particles color={ac.c} />
      </div>

      <div className="relative z-10 text-center select-none">
        <div className="relative w-44 h-44 mx-auto mb-10">
          {RINGS.map((r, i) => (
            <Ring key={r.l} size={r.s} pct={t[r.k]} colors={r.c} label={r.l} idx={i} isActive={r.l === 'Day'} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedNumber value={t.dP} dec={0} className="text-lg font-mono font-bold text-gray-900 dark:text-white" />
            <span className="text-[10px] text-gray-400">%</span>
          </div>
        </div>

        <p className="fu font-mono tracking-tight tabular-nums leading-none text-gray-900 dark:text-white"
          style={{ fontSize: 'clamp(4rem,14vw,9rem)', fontWeight: 100, animationDelay: '0.1s' }}>
          {ts}<span className="text-gray-300 dark:text-gray-700" style={{ fontSize: '0.3em', marginLeft: 6 }}>{sc}</span>
        </p>
        <p className="fu text-sm text-gray-400 dark:text-gray-500 mt-3 tracking-wide" style={{ animationDelay: '0.2s' }}>{ds}</p>
        <p className="fu text-xs text-gray-300 dark:text-gray-700 mt-6 max-w-xs mx-auto italic" style={{ animationDelay: '0.3s' }}>
          "{tip('Day', t.dP)}"
        </p>
        <p className="fi text-[10px] text-gray-300 dark:text-gray-800 mt-12" style={{ animationDelay: '1s' }}>
          <span className="kbd border-gray-300 dark:border-gray-800">esc</span> to exit
        </p>
      </div>
    </div>
  )
}
