import { useEffect, useRef, useState } from 'react'
import { X, Flame, Target, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { loadHistoryLocal } from '@/lib/history'
import { getNotes, saveNote } from '@/lib/notes'
import { getPomoLog } from '@/components/widgets/Pomodoro'
import type { Habit, Milestone, HistoryData } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): { weekday: string; short: string; isToday: boolean; isYesterday: boolean } {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  return {
    weekday: d.toLocaleDateString('en', { weekday: 'long' }),
    short: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    isToday: dateStr === today,
    isYesterday: dateStr === yesterday,
  }
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 99, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
      </div>
    </div>
  )
}

// ─── Day Entry ───────────────────────────────────────────────────────────────

interface DayEntryProps {
  date: string
  snapshot: { yP: number; mP: number; wP: number; dP: number } | null
  habits: Habit[]
  milestones: Milestone[]
  pomoCount: number
  note: string
  onNoteChange: (date: string, text: string) => void
  defaultOpen: boolean
}

function DayEntry({ date, snapshot, habits, milestones, pomoCount, note, onNoteChange, defaultOpen }: DayEntryProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [localNote, setLocalNote] = useState(note)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { weekday, short, isToday, isYesterday } = formatDate(date)

  const habitsDone = habits.filter(h => h.h[date])
  const totalHabits = habits.length

  // Milestones status on this date
  const milestonesOnDay = milestones.map(m => {
    const target = new Date(m.date + 'T00:00:00')
    const day = new Date(date + 'T00:00:00')
    const diffDays = Math.ceil((target.getTime() - day.getTime()) / 864e5)
    const past = diffDays < 0
    return { ...m, diffDays: Math.abs(diffDays), past }
  })

  function handleNote(v: string) {
    setLocalNote(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onNoteChange(date, v), 600)
  }

  const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : weekday

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 px-4 transition-colors"
        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        {open
          ? <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
          : <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: 13, fontWeight: 600, color: isToday ? '#fff' : 'rgba(255,255,255,0.75)' }}>{label}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{short}</span>
          </div>
        </div>
        {/* Quick summary pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {snapshot && (
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#fb7185', background: 'rgba(251,113,133,0.1)', borderRadius: 4, padding: '1px 5px' }}>
              {snapshot.dP.toFixed(0)}%
            </span>
          )}
          {pomoCount > 0 && (
            <span style={{ fontSize: 9, color: '#fb923c', background: 'rgba(251,146,60,0.1)', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Flame size={8} />{pomoCount}
            </span>
          )}
          {totalHabits > 0 && (
            <span style={{ fontSize: 9, color: habitsDone.length === totalHabits ? '#34d399' : 'rgba(255,255,255,0.3)', background: habitsDone.length === totalHabits ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>
              {habitsDone.length}/{totalHabits}
            </span>
          )}
          {localNote.trim() && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>
              <BookOpen size={8} />
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-4" style={{ marginLeft: 24 }}>

          {/* Progress bars */}
          {snapshot ? (
            <div className="space-y-2 pt-1">
              <ProgressBar label="Day" value={snapshot.dP} color="#fb7185" />
              <ProgressBar label="Week" value={snapshot.wP} color="#fbbf24" />
              <ProgressBar label="Month" value={snapshot.mP} color="#34d399" />
              <ProgressBar label="Year" value={snapshot.yP} color="#818cf8" />
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No time data for this day</p>
          )}

          {/* Pomodoro */}
          {pomoCount > 0 && (
            <div className="flex items-center gap-2">
              <Flame size={11} className="text-orange-400" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                {pomoCount} pomodoro session{pomoCount !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-1 ml-1">
                {Array.from({ length: Math.min(pomoCount, 12) }, (_, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: '#fb923c', opacity: 0.8 }} />
                ))}
                {pomoCount > 12 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+{pomoCount - 12}</span>}
              </div>
            </div>
          )}

          {/* Habits */}
          {totalHabits > 0 && (
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Habits</p>
              <div className="space-y-1.5">
                {habits.map(h => {
                  const done = !!h.h[date]
                  return (
                    <div key={h.id} className="flex items-center gap-2">
                      <div style={{ width: 14, height: 14, borderRadius: 4, background: done ? '#34d399' : 'rgba(255,255,255,0.06)', border: done ? 'none' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {done && <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#0c0c0c" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <span style={{ fontSize: 12, color: done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', textDecoration: done ? 'none' : 'none' }}>{h.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestonesOnDay.length > 0 && (
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Milestones</p>
              <div className="space-y-1.5">
                {milestonesOnDay.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target size={10} style={{ color: m.past ? 'rgba(255,255,255,0.2)' : '#60a5fa', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: m.past ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: m.past ? 'rgba(255,255,255,0.2)' : '#60a5fa' }}>
                      {m.past ? `${m.diffDays}d ago` : `in ${m.diffDays}d`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Note</p>
            <textarea
              value={localNote}
              onChange={e => handleNote(e.target.value)}
              placeholder={isToday ? "What happened today…" : "No note for this day"}
              readOnly={!isToday && !localNote}
              rows={isToday ? 3 : Math.max(1, localNote.split('\n').length)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '8px 10px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                lineHeight: 1.6,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Logbook Panel ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onTodayNoteChange?: (note: string) => void
}

export function Logbook({ open, onClose, onTodayNoteChange }: Props) {
  const [history, setHistory] = useState<HistoryData>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pomoLog, setPomoLog] = useState<Record<string, number>>({})
  const [habits, setHabits] = useState<Habit[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])

  // Load all data when panel opens
  useEffect(() => {
    if (!open) return
    setHistory(loadHistoryLocal())
    setNotes(getNotes())
    setPomoLog(getPomoLog())
    try {
      const h = JSON.parse(localStorage.getItem('mh') || '[]')
      setHabits(Array.isArray(h) ? h : [])
    } catch { setHabits([]) }
    try {
      const m = JSON.parse(localStorage.getItem('mm2') || '[]')
      setMilestones(Array.isArray(m) ? m : [])
    } catch { setMilestones([]) }
  }, [open])

  // Build list of days to show (last 60 days that have any data, plus today)
  const days = (() => {
    const today = new Date().toISOString().slice(0, 10)
    const set = new Set<string>([today])
    Object.keys(history).forEach(d => set.add(d))
    Object.keys(notes).forEach(d => set.add(d))
    Object.keys(pomoLog).forEach(d => set.add(d))
    habits.forEach(h => Object.keys(h.h).forEach(d => set.add(d)))
    return Array.from(set).sort().reverse().slice(0, 60)
  })()

  function handleNoteChange(date: string, text: string) {
    saveNote(date, text)
    setNotes(n => ({ ...n, [date]: text }))
    if (date === today && onTodayNoteChange) onTodayNoteChange(text)
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 90,
        width: 'min(420px, 92vw)',
        background: '#111',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(.16,1,.3,1)',
        boxShadow: open ? '-20px 0 60px rgba(0,0,0,0.6)' : 'none',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <BookOpen size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <div className="flex-1">
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>Logbook</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{days.length} days tracked</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            <X size={15} />
          </button>
        </div>

        {/* Days list */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
          {days.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              No data yet. Start tracking habits and using the timer.
            </div>
          ) : (
            days.map(date => (
              <DayEntry
                key={date}
                date={date}
                snapshot={history[date] ?? null}
                habits={habits}
                milestones={milestones}
                pomoCount={pomoLog[date] ?? 0}
                note={notes[date] ?? ''}
                onNoteChange={handleNoteChange}
                defaultOpen={date === today}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
