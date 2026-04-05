import { useEffect, useRef, useState } from 'react'
import { Flame, Target, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { loadHistoryLocal } from '@/lib/history'
import { getNotes, saveNote } from '@/lib/notes'
import { getPomoLog } from '@/components/widgets/Pomodoro'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
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
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <span className="text-xs text-muted-foreground/60 font-mono">{value.toFixed(1)}%</span>
      </div>
      <div className="h-[3px] bg-muted rounded-full">
        <div className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
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
    <div className="border-b border-border">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 px-4 bg-transparent border-none cursor-pointer text-left hover:bg-accent/50 transition-colors"
      >
        {open
          ? <ChevronDown size={12} className="text-muted-foreground/40 shrink-0" />
          : <ChevronRight size={12} className="text-muted-foreground/40 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-sm font-semibold', isToday ? 'text-foreground' : 'text-foreground/75')}>{label}</span>
            <span className="text-xs text-muted-foreground font-mono">{short}</span>
          </div>
        </div>
        {/* Quick summary pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {snapshot && (
            <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-px">
              {snapshot.dP.toFixed(0)}%
            </span>
          )}
          {pomoCount > 0 && (
            <span className="text-xs text-pomo-focus bg-muted rounded px-1.5 py-px flex items-center gap-0.5">
              <Flame size={8} aria-hidden="true" />{pomoCount}
            </span>
          )}
          {totalHabits > 0 && (
            <span className={cn('text-xs rounded px-1.5 py-px',
              habitsDone.length === totalHabits
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground/50 bg-muted'
            )}>
              {habitsDone.length}/{totalHabits}
            </span>
          )}
          {localNote.trim() && (
            <span className="text-xs text-muted-foreground/50 bg-muted rounded px-1.5 py-px">
              <BookOpen size={8} aria-hidden="true" />
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="flex flex-col gap-4 px-4 pb-4 ml-6">

          {/* Progress bars */}
          {snapshot ? (
            <div className="flex flex-col gap-2 pt-1">
              <ProgressBar label="Day" value={snapshot.dP} color="var(--color-ring-day)" />
              <ProgressBar label="Week" value={snapshot.wP} color="var(--color-ring-week)" />
              <ProgressBar label="Month" value={snapshot.mP} color="var(--color-ring-month)" />
              <ProgressBar label="Year" value={snapshot.yP} color="var(--color-ring-year)" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/40 italic">No time data for this day</p>
          )}

          {/* Pomodoro */}
          {pomoCount > 0 && (
            <div className="flex items-center gap-2">
              <Flame size={11} className="text-pomo-focus shrink-0" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {pomoCount} pomodoro session{pomoCount !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-1 ml-1">
                {Array.from({ length: Math.min(pomoCount, 12) }, (_, i) => (
                  <div key={i} className="size-1.5 rounded-sm bg-pomo-focus opacity-80" />
                ))}
                {pomoCount > 12 && <span className="text-xs text-muted-foreground/50">+{pomoCount - 12}</span>}
              </div>
            </div>
          )}

          {/* Habits */}
          {totalHabits > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Habits</p>
              <div className="flex flex-col gap-1.5">
                {habits.map(h => {
                  const done = !!h.h[date]
                  return (
                    <div key={h.id} className="flex items-center gap-2">
                      <div className={cn('size-3.5 rounded shrink-0 flex items-center justify-center',
                        done ? 'bg-primary' : 'bg-muted border border-border'
                      )}>
                        {done && <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary-foreground" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <span className={cn('text-xs', done ? 'text-foreground/70' : 'text-muted-foreground/40')}>{h.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestonesOnDay.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Milestones</p>
              <div className="flex flex-col gap-1.5">
                {milestonesOnDay.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target size={10} className={cn('shrink-0', m.past ? 'text-muted-foreground/30' : 'text-muted-foreground')} aria-hidden="true" />
                      <span className={cn('text-xs', m.past ? 'text-muted-foreground/50' : 'text-foreground/70')}>{m.name}</span>
                    </div>
                    <span className={cn('text-xs font-mono', m.past ? 'text-muted-foreground/30' : 'text-muted-foreground')}>
                      {m.past ? `${m.diffDays}d ago` : `in ${m.diffDays}d`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Note</p>
            <Textarea
              value={localNote}
              onChange={e => handleNote(e.target.value)}
              placeholder={isToday ? "What happened today..." : "No note for this day"}
              readOnly={!isToday && !localNote}
              rows={isToday ? 3 : Math.max(1, localNote.split('\n').length)}
              className="text-xs min-h-0 bg-muted/30 border-border/50"
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

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-[min(420px,92vw)] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen size={14} className="text-muted-foreground" />
            <div>
              <SheetTitle className="text-xs font-bold tracking-wide">Logbook</SheetTitle>
              <SheetDescription className="text-[10px] mt-0.5">{days.length} days tracked</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Days list */}
        <div className="flex-1 overflow-y-auto">
          {days.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground/40 text-[13px]">
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
      </SheetContent>
    </Sheet>
  )
}
