import { useEffect, useMemo, useState, useRef } from 'react'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Action {
  id: string
  label: string
  kw: string
  icon?: LucideIcon
  shortcut?: string
  fn: () => void
}

interface Props {
  open: boolean
  query: string
  setQuery: (q: string) => void
  onClose: () => void
  actions: Action[]
}

export function CommandPalette({ open, query, setQuery, onClose, actions }: Props) {
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query) return actions
    const ql = query.toLowerCase()
    return actions.filter(x => x.label.toLowerCase().includes(ql) || x.kw.toLowerCase().includes(ql))
  }, [query, actions])

  useEffect(() => setActive(0), [query])
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  useEffect(() => {
    if (!open) return
    function fn(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(v => Math.max(v - 1, 0)) }
      if (e.key === 'Enter' && filtered.length > 0) { filtered[active].fn(); onClose() }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, filtered, active, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-start justify-center pt-[min(18vh,140px)]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[500px] mx-4 rounded-[20px] overflow-hidden si dark:bg-[rgba(20,20,25,0.92)] dark:border dark:border-white/[0.08] bg-white/92 border border-black/[0.06] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.05] dark:border-white/[0.05]">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef} type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none font-medium"
          />
          <span className="kbd border-gray-300 dark:border-gray-700 text-gray-400">esc</span>
        </div>
        <div className="py-2 max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No results</p>
          ) : filtered.map((item, i) => (
            <div key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer mx-1.5 rounded-xl transition-colors ${i === active ? 'bg-white/[0.06] dark:bg-white/[0.06]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'}`}
              onClick={() => { item.fn(); onClose() }}
              onMouseEnter={() => setActive(i)}>
              <span className="text-gray-400 flex-shrink-0 w-5 flex items-center justify-center">
                {item.icon && <item.icon size={14} />}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
              {item.shortcut && <span className="ml-auto kbd border-gray-300 dark:border-gray-700 text-gray-500">{item.shortcut}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
