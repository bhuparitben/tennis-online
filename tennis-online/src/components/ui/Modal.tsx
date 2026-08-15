import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Centered overlay dialog. Closes on backdrop click; content controls its own layout. */
export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
