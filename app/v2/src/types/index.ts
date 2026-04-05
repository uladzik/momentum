export interface TimeProgress {
  yP: number
  mP: number
  wP: number
  dP: number
  wdP: number
  wdR: number
  now: Date
}

export interface AccentColor {
  c: string
  c2: string
  g: string
}

export interface Habit {
  id: number
  name: string
  h: Record<string, boolean>
}

export interface Milestone {
  id: number
  name: string
  date: string
  td: number
}

export interface DaySnapshot {
  yP: number
  mP: number
  wP: number
  dP: number
  pomodoroSessions?: number
  note?: string
}

export interface HistoryData {
  [date: string]: DaySnapshot
}

export interface RingConfig {
  l: string
  k: keyof TimeProgress
  c: [string, string]
  s: number
}
