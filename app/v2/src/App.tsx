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

  const sz = 160, sw = 5, r = (sz - sw) / 2
  const fullCi = 2 * Math.PI * r
  const trackLen = (240 / 360) * fullCi
  const gap = fullCi - trackLen
  const offset = trackLen - (Math.min(pct, 100) / 100) * trackLen

  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz}>
        <defs>
          <linearGradient id="dayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={`${trackLen} ${gap}`}
          style={{ transform: 'rotate(150deg)', transformOrigin: 'center' }} />
        {/* Value */}
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="url(#dayGrad)" strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={`${trackLen} ${gap}`}
          strokeDashoffset={mounted ? offset : trackLen}
          style={{ transform: 'rotate(150deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: 8 }}>
        <AnimatedNumber value={mounted ? pct : 0} dec={0}
          className="font-mono tabular-nums"
          style={{ fontSize: 40, lineHeight: 1, fontWeight: 200,
            background: 'linear-gradient(135deg,#f472b6,#fb923c)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
        <span className="font-mono text-muted-foreground" style={{ fontSize: 16, marginLeft: 2 }}>%</span>
      </div>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={checked}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-input'
      )}
      style={{ width: 44, height: 24 }}>
      <span className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, k, color, pct, spark, sub }: {
  label: string; k: string; color: string; pct: number; spark: number[]; sub: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <Sparkline data={spark} color={color} id={k} w={48} h={16} />
      </div>
      <AnimatedNumber value={mounted ? pct : 0} dec={1} suffix="%"
        className="font-mono font-semibold tabular-nums leading-none"
        style={{ fontSize: 26, color }} />
      <div>
        <div className="h-[2px] rounded-full bg-muted overflow-hidden">
          <div style={{ height: '100%', width: `${mounted ? pct : 0}%`, background: color, borderRadius: 99,
            transition: 'width 1.4s cubic-bezier(.16,1,.3,1)' }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground font-mono">{sub}</p>
      </div>
    </div>
  )
}

// ─── Icon Button ─────────────────────────────────────────────────────────────

function IconBtn({ icon: Icon, onClick, active }: { icon: React.ElementType; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors cursor-pointer',
        'text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-accent text-foreground'
      )}>
      <Icon size={16} />
    </button>
  )
}

// ─── Section Card — matches shadcn Card structure exactly ────────────────────
// Card: rounded-xl border bg-card shadow-sm, flex flex-col gap-6 py-6
// Content sections: px-6

function SectionCard({ title, icon: Icon, children, className }: {
  title?: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)}>
      {title && (
        <div className="flex items-center gap-2 px-6 pt-6 pb-4">
          {Icon && <Icon size={16} className="text-muted-foreground shrink-0" />}
          <h3 className="font-semibold leading-none">{title}</h3>
        </div>
      )}
      <div className={cn('px-6', title ? 'pb-6' : 'py-6')}>
        {children}
      </div>
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
    yP: `Day ${dayOfYear} of ${daysInYear}`,
    mP: `Day ${dayOfMonth}`,
    wP: `Day ${dayOfWeek} of 7`,
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
    { id: 'focus',   label: focus ? 'Disable focus' : 'Enable focus', kw: 'focus pomodoro work', icon: Zap, shortcut: 'F', fn: () => setFocus(f => !f) },
    { id: 'ambient', label: 'Ambient mode', kw: 'ambient fullscreen clock zen', shortcut: 'A', fn: () => setAmbient(true) },
    { id: 'yeardots',label: 'Year in dots', kw: 'year dots calendar', icon: Grid3x3, shortcut: 'Y', fn: () => setYearDots(true) },
    { id: 'logbook', label: 'Open Logbook', kw: 'logbook journal diary history log', icon: BookOpen, shortcut: 'L', fn: () => setLogbookOpen(true) },
    { id: 'notion',  label: showNotion ? 'Hide Notion' : 'Show Notion', kw: 'notion pages', fn: () => setShowNotion(s => !s) },
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
      {/* Subtle time-of-day ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse 80% 45% at 50% -5%, ${ac.c}15 0%, transparent 60%)`
      }} />

      <div className="relative z-10 mx-auto w-full max-w-[520px] px-4 py-8 pb-16">

        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {editName ? (
              <form onSubmit={e => { e.preventDefault(); saveName(userName) }}>
                <input value={userName} onChange={e => setUserName(e.target.value)}
                  placeholder="Your name" autoFocus onBlur={() => saveName(userName)}
                  className="bg-transparent border-none outline-none text-sm font-medium w-36"
                  style={{ color: ac.c }} />
              </form>
            ) : (
              <button onClick={() => setEditName(true)}
                className="group flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer">
                <span className="text-sm font-medium" style={{ color: ac.c }}>
                  {greet(hr, userName)}
                </span>
                <Edit3 size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: ac.c }} />
              </button>
            )}
            <Zap size={12} style={{ color: ac.c }} />
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn icon={Command}  onClick={() => { setCmdkOpen(true); setCmdkQuery('') }} />
            <IconBtn icon={Grid3x3} onClick={() => setYearDots(true)} />
            <IconBtn icon={BookOpen} onClick={() => setLogbookOpen(true)} />
          </div>
        </header>

        {/* ── Clock ── */}
        <section className="mb-8">
          <div className="flex items-end gap-3 leading-none mb-2">
            <span className="font-mono tabular-nums"
              style={{ fontSize: 'clamp(3.5rem,16vw,5.5rem)', fontWeight: 200, letterSpacing: '-0.03em', color: ac.c, lineHeight: 0.9 }}>
              {ts}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground pb-1"
              style={{ fontSize: 'clamp(1rem,4vw,1.75rem)', fontWeight: 300 }}>
              {sc}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {time.now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-0.5">{emph(hr, time)}</p>
        </section>

        {/* ── Day progress card ── */}
        <div className="flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm mb-3">
          <div className="flex items-center gap-6 px-6 py-6">
            <DayArc pct={time.dP} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-1" style={{ color: DAY_COLOR }}>Day Progress</p>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{tip('Day', time.dP)}</p>
              <div className="flex gap-6">
                <div>
                  <AnimatedNumber value={time.dP} dec={0} suffix="%"
                    className="text-xl font-mono font-semibold tabular-nums text-foreground" />
                  <p className="text-xs text-muted-foreground mt-0.5">Elapsed</p>
                </div>
                <div>
                  <AnimatedNumber value={100 - time.dP} dec={0} suffix="%"
                    className="text-xl font-mono font-semibold tabular-nums text-foreground" />
                  <p className="text-xs text-muted-foreground mt-0.5">Remaining</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Year / Month / Week ── */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {RINGS.map(r => (
            <StatCard key={r.k} label={r.l} k={r.k} color={r.color}
              pct={time[r.k] as number} spark={sparkData[r.k] ?? []} sub={subLabels[r.k]} />
          ))}
        </div>

        {/* ── Quick note ── */}
        <SectionCard title="Note" icon={Edit3} className="mb-3">
          <textarea value={note} onChange={e => updateNote(e.target.value)}
            placeholder="What's on your mind today…" rows={3}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground/80 leading-relaxed placeholder:text-muted-foreground/40" />
        </SectionCard>

        {/* ── Focus toggle ── */}
        <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm mb-3">
          <div className="flex items-center px-6 py-4">
            <Zap size={14} className={focus ? '' : 'text-muted-foreground'} style={focus ? { color: ac.c } : {}} />
            <span className="ml-2 text-sm font-medium text-foreground">Focus mode</span>
            <p className="ml-2 text-xs text-muted-foreground hidden sm:block">
              {focus ? 'Pomodoro timer active' : 'Start a focused session'}
            </p>
            <div className="ml-auto">
              <Toggle checked={focus} onChange={() => setFocus(f => !f)} />
            </div>
          </div>
        </div>

        {/* ── Pomodoro ── */}
        {focus && (
          <SectionCard title="Pomodoro" className="mb-3">
            <Pomodoro />
          </SectionCard>
        )}

        {/* ── Habits ── */}
        <SectionCard title="Habits" icon={Flame} className="mb-3">
          <Habits initialHabits={syncedHabits} />
        </SectionCard>

        {/* ── Milestones ── */}
        <SectionCard title="Milestones" className="mb-3">
          <Milestones initialMilestones={syncedMilestones} />
        </SectionCard>

        {/* ── Notion ── */}
        {showNotion && (
          <SectionCard title="Notion" className="mb-3">
            <NotionPanel />
          </SectionCard>
        )}

        {/* ── Footer ── */}
        <footer className="flex items-start justify-between mt-8 gap-4">
          <p className="text-xs italic text-muted-foreground/50 leading-relaxed">"{QUOTES[quoteIdx]}"</p>
          <button onClick={() => { setCmdkOpen(true); setCmdkQuery('') }} className="kbd shrink-0 cursor-pointer">⌘K</button>
        </footer>
      </div>

      {/* ── Overlays ── */}
      {ambient   && <AmbientMode t={time} dark={dark} onClose={() => setAmbient(false)} />}
      {yearDots  && <YearDots dark={dark} accent={ac} onClose={() => setYearDots(false)} />}
      <Logbook open={logbookOpen} onClose={() => setLogbookOpen(false)} onTodayNoteChange={setNote} />
      <CommandPalette open={cmdkOpen} query={cmdkQuery} setQuery={setCmdkQuery} onClose={closeCmdk} actions={cmdActions} />
    </div>
  )
}
