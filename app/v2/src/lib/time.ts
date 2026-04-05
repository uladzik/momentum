import type { TimeProgress, AccentColor } from '@/types'

export function getTP(): TimeProgress {
  const n = new Date()
  const y = n.getFullYear(), m = n.getMonth(), d = n.getDate()
  const sy = new Date(y, 0, 1), ey = new Date(y + 1, 0, 1)
  const yP = ((n.getTime() - sy.getTime()) / (ey.getTime() - sy.getTime())) * 100
  const sm = new Date(y, m, 1), em = new Date(y, m + 1, 1)
  const mP = ((n.getTime() - sm.getTime()) / (em.getTime() - sm.getTime())) * 100
  const dw = n.getDay()
  const sw = new Date(n)
  sw.setDate(d - ((dw + 6) % 7)); sw.setHours(0, 0, 0, 0)
  const ew = new Date(sw); ew.setDate(sw.getDate() + 7)
  const wP = ((n.getTime() - sw.getTime()) / (ew.getTime() - sw.getTime())) * 100
  const sd = new Date(y, m, d), ed = new Date(y, m, d + 1)
  const dP = ((n.getTime() - sd.getTime()) / (ed.getTime() - sd.getTime())) * 100
  const ws = new Date(y, m, d, 9), we = new Date(y, m, d, 18)
  const wdP = n < ws ? 0 : n > we ? 100 : ((n.getTime() - ws.getTime()) / (we.getTime() - ws.getTime())) * 100
  const wdR = n < we && n >= ws ? Math.ceil((we.getTime() - n.getTime()) / 60000) : n < ws ? 540 : 0
  return { yP, mP, wP, dP, wdP, wdR, now: n }
}

export function greet(hr: number, name?: string): string {
  const g = hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 21 ? 'Good evening' : 'Night owl'
  return name ? `${g}, ${name}` : g
}

export function emph(hr: number, tp: TimeProgress): string {
  if (hr < 5) return 'Rest well. Tomorrow is a new canvas.'
  if (hr < 9) return `${Math.round(100 - tp.dP)}% of today is ahead. Make it count.`
  if (hr < 12) return 'Deep work window. Protect it.'
  if (hr < 14) return 'Midday reset. Refuel and refocus.'
  if (hr < 17) return 'Afternoon push. Ship before sunset.'
  if (hr < 19) return 'Wrapping up. What did you ship?'
  if (hr < 21) return `${Math.round(tp.dP)}% of today is done. Review time.`
  return 'Wind down. Tomorrow starts fresh.'
}

export function acc(hr: number): AccentColor {
  if (hr < 5 || hr >= 21) return { c: '#a78bfa', c2: '#818cf8', g: 'linear-gradient(135deg,#a78bfa,#818cf8,#6366f1)' }
  if (hr < 10) return { c: '#fbbf24', c2: '#f59e0b', g: 'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)' }
  if (hr < 14) return { c: '#60a5fa', c2: '#3b82f6', g: 'linear-gradient(135deg,#60a5fa,#3b82f6,#2563eb)' }
  if (hr < 18) return { c: '#34d399', c2: '#10b981', g: 'linear-gradient(135deg,#34d399,#10b981,#059669)' }
  return { c: '#fb923c', c2: '#f97316', g: 'linear-gradient(135deg,#fb923c,#f97316,#ea580c)' }
}

export function tip(t: string, p: number): string {
  const v = Math.round(p)
  const m: Record<string, [number, string][]> = {
    Year:  [[25, 'Plant seeds now.'], [50, 'Halfway. Double down.'], [75, 'Audit: what stays?'], [101, 'Final sprint.']],
    Month: [[30, 'Pick one thing to ship.'], [60, 'Investing or spending time?'], [85, 'Ship or shelve.'], [101, 'Own the outcome.']],
    Week:  [[30, 'Guard deep work blocks.'], [60, 'Momentum > motivation.'], [80, 'One session changes it.'], [101, 'Capture what you learned.']],
    Day:   [[25, 'Hardest task first.'], [50, 'One more deep block.'], [75, 'Ship one thing.'], [101, 'Rest is productive too.']],
  }
  const a = m[t] ?? []
  for (const [threshold, text] of a) { if (v < threshold) return text }
  return ''
}

export function playChime() {
  try {
    const c = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ;[523.25, 659.25, 783.99].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.1, c.currentTime + i * 0.12)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.6)
      o.start(c.currentTime + i * 0.12)
      o.stop(c.currentTime + i * 0.12 + 0.6)
    })
  } catch (_e) {}
}
