import type { HistoryData, DaySnapshot, TimeProgress } from '@/types'
import { apiSaveSnapshot, apiGetHistory } from './api'

const LOCAL_KEY = 'm_history'

export function saveSnapshotLocal(time: TimeProgress): HistoryData {
  try {
    const data: HistoryData = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
    const today = time.now.toISOString().slice(0, 10)
    data[today] = { yP: +time.yP.toFixed(2), mP: +time.mP.toFixed(2), wP: +time.wP.toFixed(2), dP: +time.dP.toFixed(2) }
    const keys = Object.keys(data).sort()
    while (keys.length > 90) { delete data[keys.shift()!] }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
    // Also persist to backend (fire & forget)
    apiSaveSnapshot(today, data[today]).catch(() => {})
    return data
  } catch (_e) { return {} }
}

export function loadHistoryLocal(): HistoryData {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') } catch (_e) { return {} }
}

/** Merge remote history into local and return the combined result */
export async function syncHistoryFromAPI(): Promise<HistoryData> {
  const local = loadHistoryLocal()
  try {
    const remote = await apiGetHistory(90)
    const merged = { ...local, ...remote } // remote wins (server is source of truth)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(merged))
    return merged
  } catch (_e) {
    return local
  }
}

export function getSparkData(history: HistoryData, ringKey: keyof DaySnapshot, count: number): number[] | null {
  const keys = Object.keys(history).sort()
  const recent = keys.slice(-count)
  if (recent.length < 2) return null
  return recent.map(k => (history[k][ringKey] as number) || 0)
}
