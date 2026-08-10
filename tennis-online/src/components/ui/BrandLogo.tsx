import TennisBallLogo from './TennisBallLogo'

interface BrandLogoProps {
  /** Line under the wordmark, e.g. "FOUNDING AMBASSADOR". */
  subtitle?: string
  /** Font size of the "TOT" wordmark in px; the ball scales with it. */
  size?: number
}

/**
 * "TOT" wordmark where the middle O is the tennis ball.
 * The ball is sized off the cap height so it reads as a letter, not a bullet.
 */
export default function BrandLogo({ subtitle, size = 30 }: BrandLogoProps) {
  const ball = Math.round(size * 0.86)

  return (
    <div>
      {/*
        justify-center centres the layout boxes, but the italic overhang puts
        the visible ink ~0.16em to the right of that — pull it back so the mark
        is optically centred rather than mathematically centred.
      */}
      <div
        className="flex items-center justify-center text-primary leading-none -translate-x-[0.16em]"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: size,
          fontWeight: 700,
          fontStyle: 'italic',
          letterSpacing: '0.005em',
        }}
      >
        <span>T</span>
        {/*
          The italic T's ink overhangs its advance box by ~0.19em on the right
          and sits ~0.13em in from the left, so symmetric margins make the ball
          collide with the first T and drift off the second. These offsets
          cancel that out; em units keep it correct at any `size`.
        */}
        <TennisBallLogo
          size={ball}
          className="ml-[0.23em] -mr-[0.08em] -translate-y-[3%]"
        />
        <span>T</span>
      </div>

      {subtitle && (
        <p
          className="text-primary/75 mt-1.5 text-center"
          style={{
            fontSize: Math.max(9, size * 0.32),
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '0.17em',
            // letter-spacing also trails the final glyph, which drags centred
            // text left — indent by one step to put it back on the axis.
            textIndent: '0.17em',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
