import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Command, Grid3x3, Maximize2, Sun, Moon, Zap, Edit3, Flame, BookOpen } from 'lucide-react'
import './index.css'

import { getTP, greet, emph, acc, tip } from '@/lib/time'
import { saveSnapshotLocal, loadHistoryLocal, syncHistoryFromAPI, getSparkData } from '@/lib/history'
import { getNotes, saveNote } from '@/lib/notes'
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
  { l: 'Year',  k: 'yP' as const, color: '#818cf8', s: 156 },
  { l: 'Month', k: 'mP' as const, color: '#34d399', s: 120 },
  { l: 'Week',  k: 'wP' as const, color: '#fbbf24', s: 84  },
]

const DAY_COLOR = '#fb7185'

// ─── Day Arc ─────────────────────────────────────────────────────────────────

function DayArc({ pct }: { pct: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t) }, [])

  const sz = 160, sw = 6, r = (sz - sw) / 2
  const startAngle = -210  // 240° sweep, ends at 30°
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = sz / 2, cy = sz / 2

  function arcPath(pct: number) {
    const sweep = 240 * (Math.min(pct, 100) / 100)
    const end = startAngle + sweep
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(end))
    const y2 = cy + r * Math.sin(toRad(end))
    const large = sweep > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const trackPath = arcPath(100)
  const valuePath = arcPath(mounted ? pct : 0)

  return (
    <div className="relative" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} strokeLinecap="round" />
        <path d={valuePath} fill="none" stroke="url(#dayGrad)" strokeWidth={sw} strokeLinecap="round"
          style={{ transition: 'all 1.8s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center" style={{ marginTop: 8 }}>
          <span className="font-mono font-semibold tabular-nums" style={{ fontSize: 52, lineHeight: 1, background: 'linear-gradient(135deg,#f472b6,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {Math.round(pct)}
          </span>
          <span className="text-gray-500 font-mono" style={{ fontSize: 18, marginLeft: 2 }}>%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="relative flex-shrink-0 transition-colors duration-300"
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? '#ffffff' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}>
      <div className="absolute top-[3px] transition-all duration-300"
        style={{ width: 18, height: 18, borderRadius: 9, background: checked ? '#111' : 'rgba(255,255,255,0.4)', left: checked ? 23 : 3 }} />
    </button>
  )
}

// ─── Mini Stat Card ───────────────────────────────────────────────────────────

function StatCard({ label, k, color, pct, spark, sub }: { label: string; k: string; color: string; pct: number; spark: number[]; sub: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
        </div>
        <Sparkline data={spark} color={color} id={k} w={50} h={18} />
      </div>
      <div className="mb-2">
        <AnimatedNumber value={pct} dec={1} suffix="%" className="font-mono font-semibold tabular-nums" style={{ fontSize: 32, color }} />
      </div>
      <div className="h-[2px] rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{sub}</p>
    </div>
  )
}

// ─── Quote ────────────────────────────────────────────────────────────────────

const QUOTES = [
  "The way to get started is to quit talking and begin doing.",
  "Time is what we want most, but what we use worst.",
  "You don't need more time. You need more focus.",
  "Small daily improvements lead to staggering long-term results.",
  "Done is better than perfect.",
  "Your future self is watching you right now.",
  "What gets measured gets managed.",
]

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState(true)
  const [time, setTime] = useState<TimeProgress>(getTP)
  const [focus, setFocus] = useState(false)
  const [ambient, setAmbient] = useState(false)
  const [yearDots, setYearDots] = useState(false)
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [cmdkQuery, setCmdkQuery] = useState('')
  const [userName, setUserName] = useState(() => { try { return localStorage.getItem('m_name') || '' } catch { return '' } })
  const [editName, setEditName] = useState(false)
  const [note, setNote] = useState(() => {
    const notes = getNotes()
    return notes[new Date().toISOString().slice(0, 10)] ?? ''
  })
  const [history, setHistory] = useState(loadHistoryLocal)
  const [showNotion, setShowNotion] = useState(false)
  const [logbookOpen, setLogbookOpen] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { const id = setInterval(() => setTime(getTP()), 1000); return () => clearInterval(id) }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  useEffect(() => {
    syncHistoryFromAPI().then(merged => setHistory(merged)).catch(() => {})
    function doSnap() { const d = saveSnapshotLocal(time); setHistory(d) }
    doSnap()
    const id = setInterval(doSnap, 300000)
    return () => clearInterval(id)
  }, [])

  const hr = time.now.getHours()
  const ac = acc(hr)

  // Stats for sub-labels
  const now = time.now
  const year = now.getFullYear()
  const dayOfYear = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / 864e5)
  const daysInYear = new Date(year, 1, 29).getDate() === 29 ? 366 : 365
  const dayOfMonth = now.getDate()
  const dw = now.getDay(), dayOfWeek = ((dw + 6) % 7) + 1

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
    noteTimer.current = setTimeout(() => saveNote(today, v), 500)
  }

  // Work day remaining
  const ws = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9)
  const we = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18)
  const wdRemainMin = now < we && now >= ws ? Math.ceil((we.getTime() - now.getTime()) / 60000) : 0
  const wdH = Math.floor(wdRemainMin / 60), wdM = wdRemainMin % 60

  const cmdActions = useMemo(() => [
    { id: 'theme', label: dark ? 'Switch to light' : 'Switch to dark', kw: 'theme dark light toggle', icon: dark ? Sun : Moon, shortcut: 'D', fn: () => setDark(d => !d) },
    { id: 'focus', label: focus ? 'Disable focus' : 'Enable focus', kw: 'focus work', icon: Zap, shortcut: 'F', fn: () => setFocus(f => !f) },
    { id: 'ambient', label: 'Ambient mode', kw: 'ambient fullscreen zen', icon: Maximize2, shortcut: 'A', fn: () => setAmbient(true) },
    { id: 'yeardots', label: 'Year in dots', kw: 'year dots calendar', icon: Grid3x3, shortcut: 'Y', fn: () => setYearDots(true) },
    { id: 'notion', label: showNotion ? 'Hide Notion' : 'Show Notion', kw: 'notion pages', fn: () => setShowNotion(s => !s) },
    { id: 'logbook', label: 'Open Logbook', kw: 'logbook journal diary history log', icon: BookOpen, shortcut: 'L', fn: () => setLogbookOpen(true) },
  ], [dark, focus, showNotion])

  useEffect(() => {
    function fn(e: KeyboardEvent) {
      if (cmdkOpen) return
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdkOpen(true); setCmdkQuery(''); return }
      if (e.key === 'd' || e.key === 'D') setDark(d => !d)
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

  const greetText = greet(hr, userName).toUpperCase()
  const emphText = emph(hr, time)

  return (
    <div style={{ minHeight: '100svh', background: '#0c0c0c', color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            {editName ? (
              <form onSubmit={e => { e.preventDefault(); localStorage.setItem('m_name', userName); setEditName(false) }}>
                <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your name"
                  autoFocus onBlur={() => { localStorage.setItem('m_name', userName); setEditName(false) }}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: ac.c, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', width: 140 }} />
              </form>
            ) : (
              <button onClick={() => setEditName(true)} className="flex items-center gap-1.5 group" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <span style={{ color: ac.c, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>{greetText}</span>
                <Edit3 size={9} style={{ color: ac.c, opacity: 0 }} className="group-hover:opacity-60 transition-opacity" />
              </button>
            )}
            <Zap size={11} style={{ color: ac.c }} />
          </div>
          <div className="flex items-center gap-1">
            {[
              { icon: Command, action: () => { setCmdkOpen(true); setCmdkQuery('') } },
              { icon: Grid3x3, action: () => setYearDots(true) },
              { icon: BookOpen, action: () => setLogbookOpen(true) },
              { icon: Maximize2, action: () => setAmbient(true) },
              { icon: dark ? Sun : Moon, action: () => setDark(d => !d) },
            ].map(({ icon: Icon, action }, i) => (
              <button key={i} onClick={action} style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', borderRadius: 8, transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)') }
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Clock ── */}
        <div className="mb-1">
          <div className="flex items-end gap-3 leading-none">
            <span className="font-mono tabular-nums" style={{ fontSize: 'clamp(5rem,22vw,8rem)', fontWeight: 500, letterSpacing: '-0.04em', color: ac.c, lineHeight: 0.9 }}>
              {ts}
            </span>
            <span className="font-mono tabular-nums pb-2" style={{ fontSize: 'clamp(1.6rem,6vw,2.6rem)', color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}>
              {sc}
            </span>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 4 }}>
          {time.now.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 28 }}>{emphText}</p>

        {/* ── Day card ── */}
        <div className="rounded-2xl p-5 mb-3 flex items-center gap-6" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <DayArc pct={time.dP} />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: DAY_COLOR }}>Day Remaining</p>
            <p className="text-xl font-medium mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>{tip('Day', time.dP)}</p>
            <div className="flex gap-6">
              <div>
                <p className="font-mono font-semibold tabular-nums" style={{ fontSize: 24, color: '#fff' }}>
                  {wdH > 0 ? `${wdH}h` : `${wdM}m`}
                </p>
                <p className="text-[9px] uppercase tracking-[0.12em] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Left</p>
              </div>
              <div>
                <AnimatedNumber value={time.dP} dec={0} suffix="%" className="font-mono font-semibold tabular-nums" style={{ fontSize: 24, color: '#fff' }} />
                <p className="text-[9px] uppercase tracking-[0.12em] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Elapsed</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Year / Month / Week cards ── */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {RINGS.map(r => (
            <StatCard key={r.k} label={r.l} k={r.k} color={r.color} pct={time[r.k] as number} spark={sparkData[r.k] ?? []} sub={subLabels[r.k]} />
          ))}
        </div>

        {/* ── Quick note ── */}
        <div className="rounded-2xl p-5 mb-3" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Edit3 size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Quick Note</span>
          </div>
          <textarea value={note} onChange={e => updateNote(e.target.value)}
            placeholder="What's on your mind today…"
            rows={3}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit' }}
          />
        </div>

        {/* ── Focus ── */}
        <div className="rounded-2xl px-5 py-4 mb-3 flex items-center" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Zap size={13} style={{ color: 'rgba(255,255,255,0.4)', marginRight: 8 }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Focus</span>
          {wdRemainMin > 0 && (
            <span className="text-[10px] font-mono ml-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
              · {wdH}h{wdM}m left
            </span>
          )}
          <div className="ml-auto">
            <Toggle checked={focus} onChange={() => setFocus(f => !f)} />
          </div>
        </div>

        {/* ── Pomodoro (visible when focus on) ── */}
        {focus && (
          <div className="rounded-2xl p-5 mb-3 si" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={11} style={{ color: ac.c }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Pomodoro</span>
            </div>
            <Pomodoro />
          </div>
        )}

        {/* ── Habits ── */}
        <div className="rounded-2xl p-5 mb-3" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={12} style={{ color: '#fb923c' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Habits</span>
          </div>
          <Habits />
        </div>

        {/* ── Milestones ── */}
        <div className="rounded-2xl p-5 mb-3" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Milestones</span>
          </div>
          <Milestones />
        </div>

        {/* ── Notion (collapsible) ── */}
        {showNotion && (
          <div className="rounded-2xl p-5 mb-3 si" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Notion</span>
            </div>
            <NotionPanel />
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.15)' }}>
            "{QUOTES[Math.floor(Date.now() / 8000) % QUOTES.length]}"
          </p>
          <button onClick={() => { setCmdkOpen(true); setCmdkQuery('') }}
            className="kbd border-gray-800 text-gray-600 hover:text-gray-400 transition ml-4 flex-shrink-0">⌘K</button>
        </div>
      </div>

      {/* ── Overlays ── */}
      {ambient && <AmbientMode t={time} dark={dark} onClose={() => setAmbient(false)} />}
      {yearDots && <YearDots dark={dark} accent={ac} onClose={() => setYearDots(false)} />}
      <Logbook open={logbookOpen} onClose={() => setLogbookOpen(false)} />
      <CommandPalette open={cmdkOpen} query={cmdkQuery} setQuery={setCmdkQuery} onClose={closeCmdk} actions={cmdActions} />
    </div>
  )
}
