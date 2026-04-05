const KEY = 'm_notes'

export function getNotes(): Record<string, string> {
  try {
    const notes: Record<string, string> = JSON.parse(localStorage.getItem(KEY) || '{}')
    // Migrate old single note to today if it exists
    const oldNote = localStorage.getItem('m_note')
    if (oldNote && oldNote.trim()) {
      const today = new Date().toISOString().slice(0, 10)
      if (!notes[today]) notes[today] = oldNote
      localStorage.setItem(KEY, JSON.stringify(notes))
      localStorage.removeItem('m_note')
    }
    return notes
  } catch { return {} }
}

export function getNote(date: string): string {
  return getNotes()[date] ?? ''
}

export function saveNote(date: string, text: string) {
  try {
    const notes = getNotes()
    if (text.trim()) {
      notes[date] = text
    } else {
      delete notes[date]
    }
    localStorage.setItem(KEY, JSON.stringify(notes))
  } catch {}
}
