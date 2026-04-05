import { useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playChime } from '@/lib/time'

const WORK = 25 * 60
const BREAK = 5 * 60

export function Pomodoro() {
  const [sec, setSec] = useState(WORK)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessions, setSessions] = useState(() => {
    try { return parseInt(localStorage.getItem('mp') || '0') } catch { return 0 }
  })

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSec(s => {
        if (s <= 1) {
          setRunning(false)
          playChime()
          if (!isBreak) {
            const n = sessions + 1
            setSessions(n)
            localStorage.setItem('mp', String(n))
            setIsBreak(true)
            return BREAK
          } else {
            setIsBreak(false)
            return WORK
          }
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, isBreak, sessions])

  const reset = () => { setRunning(false); setIsBreak(false); setSec(WORK) }
  const mn = Math.floor(sec / 60), sc = sec % 60
  const total = isBreak ? BREAK : WORK
  const pct = ((total - sec) / total) * 100
  const rad = 30, ci = 2 * Math.PI * rad
  const doff = ci - (pct / 100) * ci
  const col = isBreak ? '#34d399' : '#f87171'

  return (
    <div className="flex items-center gap-4">
      <div className={`relative ${running && !isBreak ? 'pomo-go' : ''}`}>
        <svg width={70} height={70}>
          <circle cx={35} cy={35} r={rad} fill="none" stroke="currentColor" className="text-black/[0.03] dark:text-white/[0.03]" strokeWidth={3} />
          <circle
            cx={35} cy={35} r={rad} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round"
            strokeDasharray={ci} strokeDashoffset={doff}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-mono font-bold tabular-nums text-gray-900 dark:text-white">
            {String(mn).padStart(2, '0')}:{String(sc).padStart(2, '0')}
          </span>
          <span className="text-[7px] uppercase tracking-[0.15em] font-semibold mt-0.5" style={{ color: col }}>
            {isBreak ? 'break' : 'focus'}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-1">
          <Button size="icon" variant={running ? 'default' : 'secondary'} className="h-7 w-7" onClick={() => setRunning(r => !r)}>
            {running ? <Pause size={11} /> : <Play size={11} />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={reset}>
            <RotateCcw size={11} />
          </Button>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Flame size={10} className="text-orange-400" />
          <span className="font-mono font-semibold">{sessions}</span>
        </div>
      </div>
    </div>
  )
}
