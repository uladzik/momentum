import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Command, Grid3x3, Zap, Edit3, Flame, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import './index.css'

import { getTP, greet, emph, acc, tip } from '@/lib/time'
import { saveSnapshotLocal, loadHistoryLocal, syncHistoryFromAPI, getSparkData } from '@/lib/history'
import { getNotes, saveNote } from '@/lib/notes'
import { initialSync, pushSnapshot, pushNote } from '@/lib/sync'
import type { Habit, Milestone } from '@/types'
import { AnimatedNumber } from '@/components/widgets/AnimatedNumber'
import { Sparkline } from '@/components/widgets/Sparkline'
import { Pomodoro } from '@/components/widgets/Pomodoro'
import { Habits } from '@/components/widgets/Habits'
import { Milestones } from '@/components/widgets/Milestones'
import { NotionPanel } from '@/components/widgets/NotionPanel'
import { YearDots } from '@/components/widgets/YearDots'
import { AmbientMode } from '@/components/widgets/AmbientMode'
import { CommandPalette } from '@/components/widgets/CommandPalette'
import { Logbook } from '@/components/widgets/Logbook'
import type { TimeProgress } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const RINGS = [
  { l: 'Year',  k: 'yP' as const, color: '#818cf8' },
  { l: 'Month', k: 'mP' as const, color: '#34d399' },
  { l: 'Week',  k: 'wP' as const, color: '#fbbf24' },
]

const DAY_COLOR = '#fb7185'

const QUOTES = [
  "The way to get started is to quit talking and begin doing.",
  "You don't need more time. You need more focus.",
  "Small daily improvements lead to staggering long-term results.",
  "Done is better than perfect.",
  "Your future self is watching you right now.",
  "What gets measured gets managed.",
  "Discipline is choosing what you want most over what you want now.",
]

// ─── Day Arc ─────────────────────────────────────────────────────────────────

function DayArc({ pct }: { pct: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t) }, [])

  const sz = 160, sw = 6, r = (sz - sw) / 2
  const fullCi = 2 * Math.PI * r
  const trackLen = (240 / 360) * fullCi
  const gap = fullCi - trackLen
  const offset = trackLen - (Math.min(pct, 100) / 100) * trackLen

  return (
    <div className="relative" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz}>
        <defs>
          <linearGradient id="dayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${trackLen} ${gap}`}
          style={{ transform: 'rotate(150deg)', transformOrigin: 'center' }} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="url(#dayGrad)" strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${trackLen} ${gap}`}
          strokeDashoffset={mounted ? offset : trackLen}
          style={{ transform: 'rotate(150deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: 8 }}>
        <AnimatedNumber value={mounted ? pct : 0} dec={0}
          className="font-mono tabular-nums"
          style={{ fontSize: 44, lineHeight: 1, fontWeight: 200, background: 'linear-gradient(135deg,#f472b6,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
        <span className="font-mono text-muted-foreground" style={{ fontSize: 18, marginLeft: 2 }}>%</span>
      </div>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={cn(
      'relative flex-shrink-0 cursor-pointer rounded-full border border-border transition-colors',
      checked ? 'bg-primary' : 'bg-muted'
    )} style={{ width: 44, height: 24 }}>
      <div className={cn(
        'absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all duration-200',
        checked ? 'bg-primary-foreground left-[23px]' : 'bg-muted-foreground left-[3px]'
      )} />
    </button>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, k, color, pct, spark, sub }: { label: string; k: string; color: string; pct: number; spark: number[]; sub: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        </div>
        <Sparkline data={spark} color={color} id={k} w={50} h={18} />
      </div>
      <AnimatedNumber value={mounted ? pct : 0} dec={1} suffix="%" className="font-mono font-semibold tabular-nums" style={{ fontSize: 28, color }} />
      <div className="h-[2px] rounded-full bg-muted my-2">
        <div style={{ height: '100%', width: `${mounted ? pct : 0}%`, background: color, borderRadius: 99, transition: 'width 1.4s cubic-bezier(.16,1,.3,1)' }} />
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">{sub}</p>
    </div>
  )
}

// ─── Icon Button ─────────────────────────────────────────────────────────────

function IconBtn({ icon: Icon, onClick, active }: { icon: React.ElementType; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={cn(
      'p-1.5 rounded-md cursor-pointer transition-colors text-muted-foreground hover:text-foreground',
      active ? 'bg-accent text-foreground' : 'hover:bg-accent'
    )}>
      <Icon size={16} />
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)} style={style}>
      {children}
    </div>
  )
}

function CardLabel({ icon: Icon, label }: { icon?: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3.5">
      {Icon && <Icon size={11} className="text-muted-foreground" />}
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark] = useState(true)
  const [time, setTime] = useState<TimeProgress>(getTP)
  const [focus, setFocus] = useState(false)
  const [ambient, setAmbient] = useState(false)
  const [yearDots, setYearDots] = useState(false)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [cmdkQuery, setCmdkQuery] = useState('')
  const [userName, setUserName] = useState(() => { try { return localStorage.getItem('m_name') || '' } catch { return '' } })
  const [editName, setEditName] = useState(false)
  const [logbookOpen, setLogbookOpen] = useState(false)
  const [showNotion, setShowNotion] = useState(false)
  const [syncedHabits, setSyncedHabits] = useState<Habit[] | null>(null)
  const [syncedMilestones, setSyncedMilestones] = useState<Milestone[] | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [note, setNote] = useState(() => getNotes()[today] ?? '')
  const [history, setHistory] = useState(loadHistoryLocal)
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { const id = setInterval(() => setTime(getTP()), 1000); return () => clearInterval(id) }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    initialSync().then(({ history: h, habits, milestones }) => {
      if (Object.keys(h).length) {
        const local = loadHistoryLocal()
        const merged = { ...local, ...h }
        localStorage.setItem('m_history', JSON.stringify(merged))
        setHistory(merged)
      }
      if (habits?.length) setSyncedHabits(habits)
      if (milestones?.length) setSyncedMilestones(milestones)
      const remoteNote = getNotes()[today]
      if (remoteNote) setNote(remoteNote)
    }).catch(() => {
      syncHistoryFromAPI().then(merged => setHistory(merged)).catch(() => {})
    })

    function doSnap() {
      const t = getTP()
      const d = saveSnapshotLocal(t)
      setHistory(d)
      pushSnapshot(today, { yP: t.yP, mP: t.mP, wP: t.wP, dP: t.dP }).catch(() => {})
    }
    doSnap()
    const id = setInterval(doSnap, 300000)
    return () => clearInterval(id)
  }, [])

  const hr = time.now.getHours()
  const ac = acc(hr)

  const now = time.now
  const year = now.getFullYear()
  const dayOfYear = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / 864e5)
  const daysInYear = new Date(year, 1, 29).getDate() === 29 ? 366 : 365
  const dayOfMonth = now.getDate()
  const dayOfWeek = ((now.getDay() + 6) % 7) + 1

  const subLabels: Record<string, string> = {
    yP: `Day ${dayOfYear}/${daysInYear}`,
    mP: `Day ${dayOfMonth}`,
    wP: `Day ${dayOfWeek}/7`,
  }

  const sparkData = useMemo(() => {
    const d: Record<string, number[]> = {}
    RINGS.forEach(r => {
      const real = getSparkData(history, r.k as 'yP' | 'mP' | 'wP' | 'dP', 7)
      if (real) { d[r.k] = real } else {
        const v = time[r.k] as number
        d[r.k] = Array.from({ length: 7 }, (_, i) => Math.max(0, Math.min(100, v - (6 - i) * v / 7 * (0.7 + Math.random() * 0.6))))
        d[r.k][6] = v
      }
    })
    return d
  }, [history])

  function updateNote(v: string) {
    setNote(v); clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      saveNote(today, v)
      pushNote(today, v).catch(() => {})
    }, 500)
  }

  function saveName(n: string) {
    setUserName(n); localStorage.setItem('m_name', n); setEditName(false)
  }

  const cmdActions = useMemo(() => [
    { id: 'focus', label: focus ? 'Disable focus' : 'Enable focus', kw: 'focus pomodoro work', icon: Zap, shortcut: 'F', fn: () => setFocus(f => !f) },
    { id: 'ambient', label: 'Ambient mode', kw: 'ambient fullscreen clock zen', shortcut: 'A', fn: () => setAmbient(true) },
    { id: 'yeardots', label: 'Year in dots', kw: 'year dots calendar', icon: Grid3x3, shortcut: 'Y', fn: () => setYearDots(true) },
    { id: 'logbook', label: 'Open Logbook', kw: 'logbook journal diary history log', icon: BookOpen, shortcut: 'L', fn: () => setLogbookOpen(true) },
    { id: 'notion', label: showNotion ? 'Hide Notion' : 'Show Notion', kw: 'notion pages', fn: () => setShowNotion(s => !s) },
  ], [dark, focus, showNotion])

  useEffect(() => {
    function fn(e: KeyboardEvent) {
      if (cmdkOpen) return
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdkOpen(true); setCmdkQuery(''); return }
      if (e.key === 'f' || e.key === 'F') setFocus(f => !f)
      if (e.key === 'a' || e.key === 'A') { setAmbient(a => !a); return }
      if (e.key === 'y' || e.key === 'Y') { setYearDots(y => !y); return }
      if (e.key === 'l' || e.key === 'L') { setLogbookOpen(o => !o); return }
      if (e.key === 'Escape') { setAmbient(false); setYearDots(false); setLogbookOpen(false) }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [cmdkOpen])

  const ts = time.now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  const sc = String(time.now.getSeconds()).padStart(2, '0')
  const closeCmdk = useCallback(() => setCmdkOpen(false), [])

  const quoteIdx = Math.floor(Date.now() / 8000) % QUOTES.length

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Ambient glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse 80% 50% at 50% -5%, ${ac.c}18 0%, transparent 65%)` }} />

      <div className="relative z-10" style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            {editName ? (
              <form onSubmit={e => { e.preventDefault(); saveName(userName) }}>
                <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your name"
                  autoFocus onBlur={() => saveName(userName)}
                  className="bg-transparent border-none outline-none text-[11px] font-semibold uppercase tracking-[0.14em] w-36"
                  style={{ color: ac.c }} />
              </form>
            ) : (
              <button onClick={() => setEditName(true)} className="flex items-center gap-1.5 group bg-transparent border-none p-0 cursor-pointer">
                <span className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: ac.c }}>
                  {greet(hr, userName).toUpperCase()}
                </span>
                <Edit3 size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: ac.c }} />
              </button>
            )}
            <Zap size={11} style={{ color: ac.c }} />
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn icon={Command} onClick={() => { setCmdkOpen(true); setCmdkQuery('') }} />
            <IconBtn icon={Grid3x3} onClick={() => setYearDots(true)} />
            <IconBtn icon={BookOpen} onClick={() => setLogbookOpen(true)} />
          </div>
        </div>

        {/* ── Clock ── */}
        <div className="mb-1">
          <div className="flex items-end gap-3 leading-none">
            <span className="font-mono tabular-nums" style={{ fontSize: 'clamp(4rem,18vw,6.5rem)', fontWeight: 200, letterSpacing: '-0.03em', color: ac.c, lineHeight: 0.9 }}>
              {ts}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground pb-2" style={{ fontSize: 'clamp(1.2rem,5vw,2rem)', fontWeight: 300 }}>
              {sc}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          {time.now.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p className="text-sm text-muted-foreground/70 mb-7">{emph(hr, time)}</p>

        {/* ── Day card ── */}
        <Card className="p-5 mb-2.5 flex items-center gap-6">
          <DayArc pct={time.dP} />
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: DAY_COLOR }}>Day Progress</p>
            <p className="text-base font-medium text-foreground/80 mb-4 leading-snug">{tip('Day', time.dP)}</p>
            <div className="flex gap-6">
              <div>
                <AnimatedNumber value={time.dP} dec={0} suffix="%" className="text-xl font-mono font-semibold text-foreground tabular-nums" />
                <p className="text-[9px] uppercase tracking-[0.12em] mt-1 text-muted-foreground">Elapsed</p>
              </div>
              <div>
                <AnimatedNumber value={100 - time.dP} dec={0} suffix="%" className="text-xl font-mono font-semibold text-foreground tabular-nums" />
                <p className="text-[9px] uppercase tracking-[0.12em] mt-1 text-muted-foreground">Left</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Year / Month / Week ── */}
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {RINGS.map(r => (
            <StatCard key={r.k} label={r.l} k={r.k} color={r.color} pct={time[r.k] as number} spark={sparkData[r.k] ?? []} sub={subLabels[r.k]} />
          ))}
        </div>

        {/* ── Quick note ── */}
        <Card className="p-4 mb-2.5">
          <CardLabel icon={Edit3} label="Quick Note" />
          <textarea value={note} onChange={e => updateNote(e.target.value)}
            placeholder="What's on your mind today…" rows={3}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground/80 leading-relaxed placeholder:text-muted-foreground/50" />
        </Card>

        {/* ── Focus ── */}
        <Card className="px-4 py-3 mb-2.5 flex items-center">
          <Zap size={13} className={focus ? '' : 'text-muted-foreground'} style={focus ? { color: ac.c } : {}} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ml-2">Focus</span>
          <div className="ml-auto">
            <Toggle checked={focus} onChange={() => setFocus(f => !f)} />
          </div>
        </Card>

        {/* ── Pomodoro ── */}
        {focus && (
          <Card className="p-4 mb-2.5">
            <CardLabel label="Pomodoro" />
            <Pomodoro />
          </Card>
        )}

        {/* ── Habits ── */}
        <Card className="p-4 mb-2.5">
          <CardLabel icon={Flame} label="Habits" />
          <Habits initialHabits={syncedHabits} />
        </Card>

        {/* ── Milestones ── */}
        <Card className="p-4 mb-2.5">
          <CardLabel label="Milestones" />
          <Milestones initialMilestones={syncedMilestones} />
        </Card>

        {/* ── Notion ── */}
        {showNotion && (
          <Card className="p-4 mb-2.5">
            <CardLabel label="Notion" />
            <NotionPanel />
          </Card>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-[10px] italic text-muted-foreground/60">"{QUOTES[quoteIdx]}"</p>
          <button onClick={() => { setCmdkOpen(true); setCmdkQuery('') }} className="kbd flex-shrink-0 ml-4 cursor-pointer">⌘K</button>
        </div>
      </div>

      {/* ── Overlays ── */}
      {ambient && <AmbientMode t={time} dark={dark} onClose={() => setAmbient(false)} />}
      {yearDots && <YearDots dark={dark} accent={ac} onClose={() => setYearDots(false)} />}
      <Logbook open={logbookOpen} onClose={() => setLogbookOpen(false)} onTodayNoteChange={setNote} />
      <CommandPalette open={cmdkOpen} query={cmdkQuery} setQuery={setCmdkQuery} onClose={closeCmdk} actions={cmdActions} />
    </div>
  )
}
