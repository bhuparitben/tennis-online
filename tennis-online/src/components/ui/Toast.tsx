import { useEffect } from 'react'
import { IconCheckCircle, IconClose } from './icons'

interface ToastProps {
  message: string
  onClose: () => void
  /** ms before it auto-dismisses. */
  duration?: number
}

/**
 * A floating, self-dismissing confirmation — for the moment right after a
 * save/submit succeeds, when a banner buried in the page is easy to miss.
 */
export default function Toast({ message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div className="fixed top-5 left-1/2 z-50 animate-toast-in w-[calc(100%-2.5rem)] max-w-sm">
      <div className="flex items-center gap-3 bg-ink text-white rounded-xl shadow-lg px-4 py-3">
        <span className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
          <IconCheckCircle className="w-4 h-4 text-white" strokeWidth={2.2} />
        </span>
        <p className="text-sm font-medium flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="shrink-0 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <IconClose className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
