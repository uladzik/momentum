import { supabase } from './supabase'
import { getNotes, saveNote } from './notes'
import { getPomoLog } from '@/components/widgets/Pomodoro'
import type { Habit, Milestone, HistoryData } from '@/types'

// ─── Types matching Supabase schema ──────────────────────────────────────────

interface SnapshotRow {
  date: string
  yp: number
  mp: number
  wp: number
  dp: number
  pomo_count: number
  note: string
}

interface HabitRow {
  id: number
  name: string
  position: number
}

interface HabitLogRow {
  habit_id: number
  date: string
}

interface MilestoneRow {
  id: number
  name: string
  target_date: string
  td_days: number
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

export async function pushSnapshot(date: string, data: { yP: number; mP: number; wP: number; dP: number }) {
  if (!supabase) return
  const notes = getNotes()
  const pomoLog = getPomoLog()
  await supabase.from('snapshots').upsert({
    date,
    yp: +data.yP.toFixed(2),
    mp: +data.mP.toFixed(2),
    wp: +data.wP.toFixed(2),
    dp: +data.dP.toFixed(2),
    pomo_count: pomoLog[date] ?? 0,
    note: notes[date] ?? '',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'date' })
}

export async function pullSnapshots(days = 90): Promise<HistoryData> {
  if (!supabase) return {}
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('snapshots')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: false })
  if (error || !data) return {}

  const history: HistoryData = {}
  const notes: Record<string, string> = {}
  const pomoLog: Record<string, number> = {}

  ;(data as SnapshotRow[]).forEach(row => {
    history[row.date] = { yP: row.yp, mP: row.mp, wP: row.wp, dP: row.dp }
    if (row.note) notes[row.date] = row.note
    if (row.pomo_count > 0) pomoLog[row.date] = row.pomo_count
  })

  // Merge notes into localStorage (remote wins)
  const localNotes = getNotes()
  const mergedNotes = { ...localNotes, ...notes }
  localStorage.setItem('m_notes', JSON.stringify(mergedNotes))

  // Merge pomo log
  const localPomo: Record<string, number> = JSON.parse(localStorage.getItem('m_pomo_log') || '{}')
  const mergedPomo = { ...localPomo }
  Object.entries(pomoLog).forEach(([d, c]) => {
    mergedPomo[d] = Math.max(mergedPomo[d] ?? 0, c)
  })
  localStorage.setItem('m_pomo_log', JSON.stringify(mergedPomo))

  return history
}

// ─── Note ────────────────────────────────────────────────────────────────────

export async function pushNote(date: string, note: string) {
  if (!supabase) return
  saveNote(date, note)
  await supabase.from('snapshots').upsert({
    date,
    note,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'date', ignoreDuplicates: false })
}

// ─── Habits ──────────────────────────────────────────────────────────────────

export async function pushHabits(habits: Habit[]) {
  if (!supabase) return

  // Upsert habit definitions
  if (habits.length > 0) {
    await supabase.from('habits').upsert(
      habits.map((h, i) => ({ id: h.id, name: h.name, position: i })),
      { onConflict: 'id' }
    )
  }

  // Sync all habit logs (collect all completed dates)
  const logs: HabitLogRow[] = []
  habits.forEach(h => {
    Object.entries(h.h).forEach(([date, done]) => {
      if (done) logs.push({ habit_id: h.id, date })
    })
  })

  if (logs.length > 0) {
    await supabase.from('habit_logs').upsert(logs, { onConflict: 'habit_id,date' })
  }
}

export async function pullHabits(): Promise<Habit[] | null> {
  if (!supabase) return null

  const [{ data: habitRows }, { data: logRows }] = await Promise.all([
    supabase.from('habits').select('*').order('position'),
    supabase.from('habit_logs').select('*'),
  ])

  if (!habitRows) return null

  const logMap: Record<number, Record<string, boolean>> = {}
  ;(logRows as HabitLogRow[] ?? []).forEach(row => {
    if (!logMap[row.habit_id]) logMap[row.habit_id] = {}
    logMap[row.habit_id][row.date] = true
  })

  const remote: Habit[] = (habitRows as HabitRow[]).map(row => ({
    id: row.id,
    name: row.name,
    h: logMap[row.id] ?? {},
  }))

  // Merge with localStorage — union of habits and completion logs
  try {
    const local: Habit[] = JSON.parse(localStorage.getItem('mh') || '[]')
    if (!local.length) return remote

    const merged = new Map<number, Habit>()

    // Start with remote
    remote.forEach(h => merged.set(h.id, h))

    // Merge local: add habits not in remote, union completion logs
    local.forEach(localHabit => {
      const existing = merged.get(localHabit.id)
      if (existing) {
        // Union of completion logs (local OR remote = done)
        merged.set(localHabit.id, {
          ...existing,
          h: { ...localHabit.h, ...existing.h },
        })
      } else {
        // Habit only exists locally — keep it and push to Supabase later
        merged.set(localHabit.id, localHabit)
      }
    })

    return Array.from(merged.values())
  } catch {
    return remote
  }
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export async function pushMilestones(milestones: Milestone[]) {
  if (!supabase) return
  if (milestones.length === 0) return
  await supabase.from('milestones').upsert(
    milestones.map(m => ({ id: m.id, name: m.name, target_date: m.date, td_days: m.td })),
    { onConflict: 'id' }
  )
}

export async function pullMilestones(): Promise<Milestone[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('milestones').select('*').order('target_date')
  if (error || !data) return null
  return (data as MilestoneRow[]).map(row => ({
    id: row.id,
    name: row.name,
    date: row.target_date,
    td: row.td_days,
  }))
}

export async function deleteMilestoneRemote(id: number) {
  if (!supabase) return
  await supabase.from('milestones').delete().eq('id', id)
}

export async function deleteHabitRemote(id: number) {
  if (!supabase) return
  await supabase.from('habits').delete().eq('id', id)
}

// ─── Full initial sync ────────────────────────────────────────────────────────

export async function initialSync(): Promise<{
  history: HistoryData
  habits: Habit[] | null
  milestones: Milestone[] | null
}> {
  const [history, habits, milestones] = await Promise.all([
    pullSnapshots(90),
    pullHabits(),
    pullMilestones(),
  ])
  return { history, habits, milestones }
}
