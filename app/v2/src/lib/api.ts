import type { HistoryData, DaySnapshot } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || 'https://momentum-notion.wadikin.workers.dev'

export async function apiSaveSnapshot(date: string, snapshot: DaySnapshot): Promise<void> {
  await fetch(`${API_BASE}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, ...snapshot }),
  })
}

export async function apiGetHistory(days = 90): Promise<HistoryData> {
  const res = await fetch(`${API_BASE}/history?days=${days}`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json() as Promise<HistoryData>
}

export async function apiGetDaySnapshot(date: string): Promise<DaySnapshot | null> {
  const res = await fetch(`${API_BASE}/history/${date}`)
  if (!res.ok) return null
  return res.json() as Promise<DaySnapshot>
}
