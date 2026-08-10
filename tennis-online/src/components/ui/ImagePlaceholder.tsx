import { IconImage } from './icons'

interface ImagePlaceholderProps {
  /** Sizing / shape classes, e.g. "w-16 h-10 rounded-lg". */
  className?: string
  /** Optional caption shown under the glyph when there is room. */
  label?: string
  /** Glyph size class. */
  iconClassName?: string
}

/**
 * Explicit "an image belongs here" frame. Used instead of coloured blocks so a
 * reviewer can tell placeholder art apart from real uploaded photos.
 */
export default function ImagePlaceholder({
  className = '',
  label,
  iconClassName = 'w-4 h-4',
}: ImagePlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 border border-dashed border-border bg-bg text-muted/70 overflow-hidden ${className}`}
    >
      <IconImage className={iconClassName} />
      {label && <span className="text-[10px] leading-none px-1 truncate max-w-full">{label}</span>}
    </div>
  )
}
