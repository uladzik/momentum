import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function Dialog({ open, onClose, children, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fi fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div
        className={cn(
          'si relative z-10 w-full max-w-md rounded-2xl',
          'dark:bg-[rgba(20,20,25,0.95)] dark:border dark:border-white/[0.08]',
          'bg-white/95 border border-black/[0.06]',
          'shadow-2xl',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition"
    >
      <X size={14} />
    </button>
  )
}

export { Dialog, DialogClose }
