import { useEffect, useState } from 'react'
import { ExternalLink, LayoutGrid, FileText } from 'lucide-react'

const NOTION_API = import.meta.env.VITE_API_URL || 'https://momentum-notion.wadikin.workers.dev'

interface NotionItem {
  id: string
  title: string
  url: string
  edited: string
  icon?: { type: string; emoji?: string } | null
  type: 'page' | 'db'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotionPanel() {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [items, setItems] = useState<NotionItem[]>([])

  useEffect(() => {
    fetch(`${NOTION_API}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 30 }),
    })
      .then(r => r.json())
      .then((data: { results?: Array<{ object: string; id: string; title?: Array<{ plain_text: string }>; properties?: Record<string, { title?: Array<{ plain_text: string }> }>; url: string; last_edited_time: string; icon?: { type: string; emoji?: string } | null }> }) => {
        if (!data.results) { setState('error'); return }
        const all: NotionItem[] = data.results.map(item => {
          let title = 'Untitled'
          if (item.object === 'database') {
            if (item.title?.length) title = item.title.map(t => t.plain_text).join('')
          } else {
            const props = item.properties || {}
            const titleProp = props['title'] ?? props['Name']
            if (titleProp?.title?.length) title = titleProp.title.map(t => t.plain_text).join('')
          }
          return { id: item.id, title, url: item.url, edited: item.last_edited_time, icon: item.icon, type: item.object === 'database' ? 'db' : 'page' }
        })
        all.sort((a, b) => new Date(b.edited).getTime() - new Date(a.edited).getTime())
        setItems(all)
        setState('ok')
      })
      .catch(() => setState('error'))
  }, [])

  if (state === 'loading') return <p className="text-xs text-gray-400 dark:text-gray-600 py-4 text-center">Connecting to Notion…</p>
  if (state === 'error') return <p className="text-xs text-red-400 py-4 text-center">Could not connect to Notion</p>
  if (!items.length) return (
    <div className="text-center py-4 space-y-1">
      <p className="text-xs text-gray-400 dark:text-gray-600">No pages shared with integration</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-700">Share pages in Notion → ... → Connections</p>
    </div>
  )

  return (
    <div className="space-y-1">
      {items.slice(0, 8).map(item => (
        <a key={item.id} href={item.url} target="_blank" rel="noopener"
          className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition group">
          <span className="flex-shrink-0 w-5 text-center">
            {item.icon?.type === 'emoji' ? (
              <span className="text-sm">{item.icon.emoji}</span>
            ) : item.type === 'db' ? (
              <LayoutGrid size={13} className="text-gray-400" />
            ) : (
              <FileText size={13} className="text-gray-400" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-gray-700 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-white transition">{item.title}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-700 font-mono">
              {item.type === 'db' ? 'Database' : 'Page'} · {timeAgo(item.edited)}
            </p>
          </div>
          <ExternalLink size={11} className="flex-shrink-0 text-gray-300 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition" />
        </a>
      ))}
      {items.length > 8 && <p className="text-[10px] text-gray-400 dark:text-gray-700 text-center pt-1">+{items.length - 8} more</p>}
    </div>
  )
}
