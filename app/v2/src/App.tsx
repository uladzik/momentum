import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Command, Grid3x3, Zap, Edit3, Flame, BookOpen } from 'lucide-react'
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

// ─── Day Arc — uses stroke-dashoffset for smooth animation ───────────────────

function DayArc({ pct }: { pct: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t) }, [])

  const sz = 160, sw = 6, r = (sz - sw) / 2
  // Full circle circumference, but we only use 240/360 of it
  const fullCi = 2 * Math.PI * r
  const trackLen = (240 / 360) * fullCi          // visible arc length
  const gap = fullCi - trackLen                   // invisible portion
  const offset = trackLen - (Math.min(pct, 100) / 100) * trackLen  // how much to hide

  return (
    <div className="relative" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz}>
        <defs>
          <linearGradient id="dayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="var(--track)" strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${trackLen} ${gap}`}
          style={{ transform: 'rotate(150deg)', transformOrigin: 'center' }} />
        {/* Value — animates via dashoffset */}
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="url(#dayGrad)" strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${trackLen} ${gap}`}
          strokeDashoffset={mounted ? offset : trackLen}
          style={{ transform: 'rotate(150deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: 8 }}>
        <AnimatedNumber value={mounted ? pct : 0} dec={0}
          className="font-mono font-semibold tabular-nums"
          style={{ fontSize: 52, lineHeight: 1, background: 'linear-gradient(135deg,#f472b6,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
        <span className="font-mono" style={{ fontSize: 18, color: 'var(--text-3)', marginLeft: 2 }}>%</span>
      </div>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0,
      background: checked ? 'var(--text)' : 'var(--track)',
      border: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, width: 18, height: 18, borderRadius: 9,
        background: checked ? 'var(--bg)' : 'var(--text-3)',
        left: checked ? 22 : 3, transition: 'left 0.25s cubic-bezier(.16,1,.3,1), background 0.2s',
      }} />
    </button>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, k, color, pct, spark, sub }: { label: string; k: string; color: string; pct: number; spark: number[]; sub: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-3)' }}>{label}</span>
        </div>
        <Sparkline data={spark} color={color} id={k} w={50} h={18} />
      </div>
      <AnimatedNumber value={mounted ? pct : 0} dec={1} suffix="%" className="font-mono font-semibold tabular-nums" style={{ fontSize: 28, color }} />
      <div style={{ height: 2, background: 'var(--track)', borderRadius: 99, margin: '8px 0 6px' }}>
        <div style={{ height: '100%', width: `${mounted ? pct : 0}%`, background: color, borderRadius: 99, transition: 'width 1.4s cubic-bezier(.16,1,.3,1)' }} />
      </div>
      <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-4)' }}>{sub}</p>
    </div>
  )
}

// ─── Icon Button ─────────────────────────────────────────────────────────────

function IconBtn({ icon: Icon, onClick, active }: { icon: React.ElementType; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--track)' : 'none',
      border: 'none', padding: '6px 8px', cursor: 'pointer',
      color: active ? 'var(--text)' : 'var(--icon)',
      borderRadius: 8, transition: 'color .15s, background .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--icon-hover)')}
      onMouseLeave={e => (e.currentTarget.style.color = active ? 'var(--text)' : 'var(--icon)')}>
      <Icon size={16} />
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)', ...style }}>
      {children}
    </div>
  )
}

function CardLabel({ icon: Icon, label }: { icon?: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
      {Icon && <Icon size={11} style={{ color: 'var(--text-3)' }} />}
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark] = useState(true) // light theme disabled until fully implemented
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
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  useEffect(() => {
    // Pull from Supabase on mount
    initialSync().then(({ history: h, habits, milestones }) => {
      if (Object.keys(h).length) {
        const local = loadHistoryLocal()
        const merged = { ...local, ...h }
        localStorage.setItem('m_history', JSON.stringify(merged))
        setHistory(merged)
      }
      if (habits?.length) setSyncedHabits(habits)
      if (milestones?.length) setSyncedMilestones(milestones)
      // Also update note from Supabase
      const remoteNote = getNotes()[today]
      if (remoteNote) setNote(remoteNote)
    }).catch(() => {
      syncHistoryFromAPI().then(merged => setHistory(merged)).catch(() => {})
    })

    // Save snapshot every 5 min
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
    <div style={{ minHeight: '100svh', background: 'var(--bg)', color: 'var(--text)', transition: 'background 0.3s, color 0.3s' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            {editName ? (
              <form onSubmit={e => { e.preventDefault(); saveName(userName) }}>
                <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your name"
                  autoFocus onBlur={() => saveName(userName)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: ac.c, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', width: 140, fontFamily: 'inherit' }} />
              </form>
            ) : (
              <button onClick={() => setEditName(true)} className="flex items-center gap-1.5 group" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <span style={{ color: ac.c, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>
                  {greet(hr, userName).toUpperCase()}
                </span>
                <Edit3 size={9} style={{ color: ac.c, opacity: 0 }} className="group-hover:opacity-60 transition-opacity" />
              </button>
            )}
            <Zap size={11} style={{ color: ac.c }} />
          </div>
          <div className="flex items-center">
            <IconBtn icon={Command} onClick={() => { setCmdkOpen(true); setCmdkQuery('') }} />
            <IconBtn icon={Grid3x3} onClick={() => setYearDots(true)} />
            <IconBtn icon={BookOpen} onClick={() => setLogbookOpen(true)} />
          </div>
        </div>

        {/* ── Clock ── */}
        <div className="mb-1">
          <div className="flex items-end gap-3 leading-none">
            <span className="font-mono tabular-nums" style={{ fontSize: 'clamp(5rem,22vw,8rem)', fontWeight: 500, letterSpacing: '-0.04em', color: ac.c, lineHeight: 0.9 }}>
              {ts}
            </span>
            <span className="font-mono tabular-nums pb-2" style={{ fontSize: 'clamp(1.6rem,6vw,2.6rem)', color: 'var(--text-4)', fontWeight: 300 }}>
              {sc}
            </span>
          </div>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 4 }}>
          {time.now.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p style={{ color: 'var(--text-4)', fontSize: 13, marginBottom: 28 }}>{emph(hr, time)}</p>

        {/* ── Day card ── */}
        <Card style={{ padding: 20, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 24 }}>
          <DayArc pct={time.dP} />
          <div className="flex-1">
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: DAY_COLOR, marginBottom: 8 }}>Day Remaining</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.3 }}>{tip('Day', time.dP)}</p>
            <div className="flex gap-6">
              <div>
                <AnimatedNumber value={time.dP} dec={0} suffix="%" style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }} />
                <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2, color: 'var(--text-4)' }}>Elapsed</p>
              </div>
              <div>
                <AnimatedNumber value={100 - time.dP} dec={0} suffix="%" style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }} />
                <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2, color: 'var(--text-4)' }}>Left</p>
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
        <Card style={{ padding: 18, marginBottom: 10 }}>
          <CardLabel icon={Edit3} label="Quick Note" />
          <textarea value={note} onChange={e => updateNote(e.target.value)}
            placeholder="What's on your mind today…" rows={3}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit' }} />
        </Card>

        {/* ── Focus ── */}
        <Card style={{ padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
          <Zap size={13} style={{ color: focus ? ac.c : 'var(--text-3)', marginRight: 8 }} />
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-3)' }}>Focus</span>
          <div className="ml-auto">
            <Toggle checked={focus} onChange={() => setFocus(f => !f)} />
          </div>
        </Card>

        {/* ── Pomodoro (focus on) ── */}
        {focus && (
          <Card style={{ padding: 18, marginBottom: 10 }} >
            <CardLabel label="Pomodoro" />
            <Pomodoro />
          </Card>
        )}

        {/* ── Habits ── */}
        <Card style={{ padding: 18, marginBottom: 10 }}>
          <CardLabel icon={Flame} label="Habits" />
          <Habits initialHabits={syncedHabits} />
        </Card>

        {/* ── Milestones ── */}
        <Card style={{ padding: 18, marginBottom: 10 }}>
          <CardLabel label="Milestones" />
          <Milestones initialMilestones={syncedMilestones} />
        </Card>

        {/* ── Notion ── */}
        {showNotion && (
          <Card style={{ padding: 18, marginBottom: 10 }}>
            <CardLabel label="Notion" />
            <NotionPanel />
          </Card>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-6">
          <p style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-4)' }}>"{QUOTES[quoteIdx]}"</p>
          <button onClick={() => { setCmdkOpen(true); setCmdkQuery('') }}
            className="kbd flex-shrink-0 ml-4"
            style={{ borderColor: 'var(--border)', color: 'var(--text-3)', background: 'none', cursor: 'pointer' }}>⌘K</button>
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
