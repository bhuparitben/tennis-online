/**
 * Tennis ball mark drawn inline as SVG — no external asset, no licensing
 * concerns, and stays crisp at any size.
 */
export default function TennisBallLogo({
  size = 36,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Tennis Online"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <radialGradient id="tb-face" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#e8fb6e" />
          <stop offset="55%" stopColor="#c3e63c" />
          <stop offset="100%" stopColor="#8ab41c" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="30" fill="url(#tb-face)" />

      {/* Felt seams */}
      <g fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round">
        <path d="M7.2 13.4C15.6 19.9 20.4 25.6 20.4 32s-4.8 12.1-13.2 18.6" />
        <path d="M56.8 13.4C48.4 19.9 43.6 25.6 43.6 32s4.8 12.1 13.2 18.6" />
      </g>

      {/* Soft inner shading for depth */}
      <circle cx="32" cy="32" r="30" fill="none" stroke="#000000" strokeOpacity="0.08" strokeWidth="2" />
    </svg>
  )
}
