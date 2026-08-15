import { useEffect } from 'react'

interface LightboxImage {
  url: string
  alt?: string
}

interface LightboxProps {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

/** Fullscreen photo viewer with prev/next navigation — click, arrow buttons, or keyboard. */
export default function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const hasMultiple = images.length > 1

  function goPrev() {
    onIndexChange((index - 1 + images.length) % images.length)
  }
  function goNext() {
    onIndexChange((index + 1) % images.length)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasMultiple) goPrev()
      else if (e.key === 'ArrowRight' && hasMultiple) goNext()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length])

  const current = images[index]
  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {hasMultiple && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
          {index + 1} / {images.length}
        </span>
      )}

      {/* Prev */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          aria-label="รูปก่อนหน้า"
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={current.url}
        alt={current.alt ?? ''}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg select-none"
      />

      {/* Next */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          aria-label="รูปถัดไป"
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
