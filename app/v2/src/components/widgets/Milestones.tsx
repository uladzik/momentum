import { useEffect, useState } from 'react'
import { Trash2, Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { pushMilestones, deleteMilestoneRemote } from '@/lib/sync'
import type { Milestone } from '@/types'

const DEFAULT_MILESTONES: Milestone[] = [
  { id: 1, name: 'Q2 Review', date: '2026-06-30', td: 95 },
  { id: 2, name: 'Product Launch', date: '2026-09-15', td: 172 },
]

function MilestoneCard({ m, onDelete }: { m: Milestone; onDelete: (id: number) => void }) {
  const now = new Date(), target = new Date(`${m.date}T00:00:00`)
  const diff = target.getTime() - now.getTime(), past = diff < 0
  const days = Math.floor(Math.abs(diff) / 864e5)
  const prog = past ? 100 : Math.max(0, Math.min(100, ((m.td - days) / m.td) * 100))

  return (
    <div className="si rounded-2xl p-4 group" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{m.name}</p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>
            {target.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-mono font-bold tabular-nums" style={{ color: past ? 'var(--text-4)' : 'var(--text)' }}>
            {past ? '-' : ''}{days}<span className="text-[9px] font-normal ml-0.5" style={{ color: 'var(--text-4)' }}>d</span>
          </span>
          <button onClick={() => onDelete(m.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 transition" style={{ color: 'var(--text-3)' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {!past && (
        <div className="h-[3px] rounded-full mt-3 overflow-hidden" style={{ background: 'var(--track)' }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${prog}%`, background: 'linear-gradient(90deg,#34d399,#60a5fa)' }} />
        </div>
      )}
    </div>
  )
}

function AddForm({ onAdd, onClose }: { onAdd: (m: Milestone) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() && date) {
      onAdd({ id: Date.now(), name: name.trim(), date, td: Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 864e5) })
      onClose()
    }
  }
  return (
    <form onSubmit={submit} className="p-5 space-y-3">
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>New milestone</p>
      <Input placeholder="Counting down to…" value={name} onChange={e => setName(e.target.value)} autoFocus />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">Add</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

interface Props {
  initialMilestones?: Milestone[] | null
}

export function Milestones({ initialMilestones }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    if (initialMilestones?.length) return initialMilestones
    try {
      const s = JSON.parse(localStorage.getItem('mm2') || 'null')
      return s?.length ? s : DEFAULT_MILESTONES
    } catch { return DEFAULT_MILESTONES }
  })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (initialMilestones?.length) setMilestones(initialMilestones)
  }, [initialMilestones])

  function save(updated: Milestone[]) {
    setMilestones(updated)
    localStorage.setItem('mm2', JSON.stringify(updated))
    pushMilestones(updated).catch(() => {})
  }

  function add(m: Milestone) { save([...milestones, m]) }

  function remove(id: number) {
    save(milestones.filter(m => m.id !== id))
    deleteMilestoneRemote(id).catch(() => {})
  }

  return (
    <>
      <div className="space-y-2">
        {milestones.map(m => <MilestoneCard key={m.id} m={m} onDelete={remove} />)}
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed transition text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <Plus size={12} /><Target size={12} /> Add milestone
        </button>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <AddForm onAdd={add} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
