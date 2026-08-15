interface Props {
  labels: string[]
  current: number
}

/** The 4-circle progress rail shown atop both the add-court and verify-court wizards. */
export default function CourtStepper({ labels, current }: Props) {
  return (
    <div className="flex items-center mb-8">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                i < current
                  ? 'bg-success text-white'
                  : i === current
                  ? 'bg-primary text-white shadow-md scale-110'
                  : 'bg-white border-2 border-border text-muted',
              ].join(' ')}
            >
              {i < current ? (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={[
                'mt-1 text-xs font-medium whitespace-nowrap',
                i === current ? 'text-primary' : i < current ? 'text-success' : 'text-muted',
              ].join(' ')}
            >
              {label}
            </span>
          </div>

          {/* Connector line */}
          {i < labels.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-4 transition-colors duration-300"
              style={{ background: i < current ? 'var(--color-success)' : 'var(--color-border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
