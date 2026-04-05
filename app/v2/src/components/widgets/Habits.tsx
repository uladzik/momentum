import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Flame, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Habit } from '@/types'

const DEFAULT_HABITS: Habit[] = [
  { id: 1, name: 'Exercise', h: {} },
  { id: 2, name: 'Read', h: {} },
  { id: 3, name: 'No doomscroll', h: {} },
]

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem('mh') || 'null')
      return s && s.length ? s : DEFAULT_HABITS
    } catch { return DEFAULT_HABITS }
  })
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [cel, setCel] = useState<{ name: string; streak: number } | null>(null)
  const [pop, setPop] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return { k: d.toISOString().slice(0, 10), l: d.toLocaleDateString('en', { weekday: 'narrow' }) }
    })
  }, [today])

  useEffect(() => { localStorage.setItem('mh', JSON.stringify(habits)) }, [habits])
  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus() }, [adding])
  useEffect(() => {
    if (!cel) return
    const t = setTimeout(() => setCel(null), 3500)
    return () => clearTimeout(t)
  }, [cel])

  function streak(hab: Habit) {
    let s = 0; const d = new Date()
    while (hab.h[d.toISOString().slice(0, 10)]) { s++; d.setDate(d.getDate() - 1) }
    return s
  }

  function wkCount(hab: Habit) {
    return last7.filter(d => hab.h[d.k]).length
  }

  function toggle(id: number, dk: string) {
    setHabits(prev => prev.map(x => {
      if (x.id !== id) return x
      const hh = { ...x.h, [dk]: !x.h[dk] }
      if (hh[dk]) {
        setPop(`${id}-${dk}`); setTimeout(() => setPop(null), 400)
        let st = 0; const dd = new Date()
        while (hh[dd.toISOString().slice(0, 10)]) { st++; dd.setDate(dd.getDate() - 1) }
        if ([7, 14, 30, 100].includes(st)) setCel({ name: x.name, streak: st })
      }
      return { ...x, h: hh }
    }))
  }

  function addHabit(e: React.FormEvent) {
    e.preventDefault()
    if (newName.trim()) {
      setHabits(p => [...p, { id: Date.now(), name: newName.trim(), h: {} }])
      setNewName(''); setAdding(false)
    }
  }

  function deleteHabit(id: number) {
    setHabits(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-0.5">
      {cel && (
        <div className="si mb-3 px-3 py-2.5 rounded-xl text-center text-xs font-bold"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(251,191,36,.12),transparent)', color: '#fbbf24', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-out' }}>
          ✨ {cel.name} — {cel.streak} day streak!
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center mb-2">
        <div className="flex-1" />
        <div className="flex gap-[3px] mr-6">
          {last7.map(d => (
            <div key={d.k} className="w-[22px] text-center text-[8px] font-mono font-medium text-gray-400 dark:text-gray-600 uppercase">{d.l}</div>
          ))}
        </div>
      </div>

      {habits.map(hab => {
        const st = streak(hab), done = hab.h[today], wc = wkCount(hab)
        const isMilestone = [7, 14, 30, 100].includes(st)
        return (
          <div key={hab.id} className="flex items-center py-1.5 group">
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span style={{ fontSize: 13, color: done ? 'var(--text-4)' : 'var(--text-2)', textDecoration: done ? 'line-through' : 'none' }} className="truncate">
                {hab.name}
              </span>
              {st >= 2 && (
                <span className={`flex items-center gap-0.5 text-[9px] font-bold flex-shrink-0 ${isMilestone ? 'text-yellow-400' : 'text-orange-400'}`}
                  style={isMilestone ? { background: 'linear-gradient(90deg,#fbbf24,#f59e0b,#fbbf24)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 2s ease-in-out infinite' } : {}}>
                  <Flame size={9} />{st}
                </span>
              )}
              <span style={{ fontSize: 9, fontFamily: 'monospace', marginLeft: 'auto', marginRight: 8, color: wc >= 5 ? '#34d399' : 'var(--text-4)' }}>
                {wc}/7
              </span>
            </div>
            <div className="flex gap-[3px]">
              {last7.map(d => {
                const isDone = hab.h[d.k], isToday = d.k === today, isPop = pop === `${hab.id}-${d.k}`
                return (
                  <button key={d.k} onClick={() => toggle(hab.id, d.k)}
                    className={`hcell w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-white transition ${isDone ? 'bg-emerald-500/80' : isToday ? 'bg-black/[0.04] dark:bg-white/[0.06] ring-1 ring-gray-300/30 dark:ring-gray-600/30' : 'bg-black/[0.02] dark:bg-white/[0.03]'}`}>
                    {isDone && <span className={isPop ? 'check-pop' : ''}><Check size={9} /></span>}
                  </button>
                )
              })}
            </div>
            <button onClick={() => deleteHabit(hab.id)} className="ml-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition">
              <Trash2 size={11} />
            </button>
          </div>
        )
      })}

      {adding ? (
        <form onSubmit={addHabit} className="flex gap-1.5 pt-2.5">
          <Input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)} placeholder="New habit" className="text-xs" />
          <Button type="submit" size="sm">Add</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition pt-2">
          <Plus size={10} /> Add habit
        </button>
      )}
    </div>
  )
}
