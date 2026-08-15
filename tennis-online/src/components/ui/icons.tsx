import type { ReactNode } from 'react'

export interface IconProps {
  className?: string
  strokeWidth?: number
}

/** Builds a stroke-based 24×24 icon that inherits `currentColor`. */
function make(path: ReactNode) {
  return function Icon({ className = 'w-5 h-5', strokeWidth = 1.7 }: IconProps) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {path}
      </svg>
    )
  }
}

// ===== Navigation =====
export const IconHome = make(
  <>
    <path d="M3 10.6 12 3.2l9 7.4" />
    <path d="M5.6 9.4V19a1.6 1.6 0 0 0 1.6 1.6H10v-5.2h4v5.2h2.8A1.6 1.6 0 0 0 18.4 19V9.4" />
  </>,
)
export const IconCourt = make(
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M3 12h18M12 4.5v15" />
  </>,
)
export const IconPlusCircle = make(
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 8.2v7.6M8.2 12h7.6" />
  </>,
)
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </>,
)
export const IconGrid = make(
  <>
    <rect x="3.2" y="3.2" width="7.2" height="7.2" rx="1.6" />
    <rect x="13.6" y="3.2" width="7.2" height="7.2" rx="1.6" />
    <rect x="3.2" y="13.6" width="7.2" height="7.2" rx="1.6" />
    <rect x="13.6" y="13.6" width="7.2" height="7.2" rx="1.6" />
  </>,
)
export const IconCalendar = make(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
)
export const IconCalendarCheck = make(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="m9.2 15.2 2 2 3.6-3.6" />
  </>,
)
export const IconList = make(
  <>
    <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" />
    <path d="M4 6.5h.01M4 12h.01M4 17.5h.01" />
  </>,
)
export const IconUsers = make(
  <>
    <circle cx="9.2" cy="8.2" r="3.3" />
    <path d="M2.8 19.8c0-3.5 2.9-5.7 6.4-5.7s6.4 2.2 6.4 5.7" />
    <circle cx="17.8" cy="9.4" r="2.4" />
    <path d="M17.4 14.4c2.4.3 3.9 2 3.9 4.3" />
  </>,
)
export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.7 3.1-6.1 7-6.1s7 2.4 7 6.1" />
  </>,
)
export const IconMapPin = make(
  <>
    <path d="M12 21.2s6.8-5.6 6.8-10.9a6.8 6.8 0 1 0-13.6 0c0 5.3 6.8 10.9 6.8 10.9z" />
    <circle cx="12" cy="10.1" r="2.5" />
  </>,
)
export const IconFileText = make(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13.5h6M9 17h4" />
  </>,
)
export const IconEdit = make(
  <>
    <path d="M12.5 20.5H21" />
    <path d="M16.6 3.6a2.2 2.2 0 0 1 3.1 3.1L7.4 19H3.9v-3.5z" />
  </>,
)
export const IconImage = make(
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="8.6" cy="9.8" r="1.7" />
    <path d="m21 15.6-4.8-4.8L7 19.5" />
  </>,
)
export const IconUserCircle = make(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <circle cx="12" cy="10" r="2.9" />
    <path d="M6.4 18.6a6.6 6.6 0 0 1 11.2 0" />
  </>,
)
export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 11.2v5.2M12 7.8h.01" />
  </>,
)
export const IconMail = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.6 6.6 8.4 5.9 8.4-5.9" />
  </>,
)
export const IconBell = make(
  <>
    <path d="M18 8.8a6 6 0 1 0-12 0c0 4.9-2 6.4-2 6.4h16s-2-1.5-2-6.4z" />
    <path d="M10.3 18.8a2 2 0 0 0 3.4 0" />
  </>,
)
export const IconLogout = make(
  <>
    <path d="M15 4.5h3.4A1.6 1.6 0 0 1 20 6.1v11.8a1.6 1.6 0 0 1-1.6 1.6H15" />
    <path d="M10.5 8 14.5 12l-4 4M14 12H4" />
  </>,
)

// ===== Chevrons / controls =====
export const IconChevronDown = make(<path d="m6 9.5 6 6 6-6" />)
export const IconChevronRight = make(<path d="m9.5 6 6 6-6 6" />)
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />)
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />)
export const IconEye = make(
  <>
    <path d="M2 12s3.8-7.2 10-7.2S22 12 22 12s-3.8 7.2-10 7.2S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.9" />
  </>,
)
export const IconEyeOff = make(
  <>
    <path d="M17.6 17.7A10.4 10.4 0 0 1 12 19.2C5.8 19.2 2 12 2 12a18.7 18.7 0 0 1 4.7-5.4" />
    <path d="M9.8 4.9A9.5 9.5 0 0 1 12 4.8c6.2 0 10 7.2 10 7.2a18.8 18.8 0 0 1-2.1 3" />
    <path d="M3 3l18 18" />
  </>,
)

// ===== Status / stats =====
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 6.9v5.4l3.4 2" />
  </>,
)
export const IconCheckCircle = make(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <path d="m8 12.4 2.8 2.8L16.2 9.8" />
  </>,
)
export const IconAlert = make(
  <>
    <path d="M12 4.3 2.7 20.2h18.6z" />
    <path d="M12 10v4.2M12 17.2h.01" />
  </>,
)
export const IconMegaphone = make(
  <>
    <path d="M4 10v4a1.2 1.2 0 0 0 1.2 1.2H7L14 19V5L7 8.8H5.2A1.2 1.2 0 0 0 4 10z" />
    <path d="M17.4 9.4a3.6 3.6 0 0 1 0 5.2" />
    <path d="M7 15.2V19.5" />
  </>,
)
export const IconSend = make(
  <>
    <path d="M21.2 3.4 10.4 14.2" />
    <path d="M21.2 3.4 14.4 21.2l-3.9-6.9-6.9-3.9z" />
  </>,
)
export const IconTrash = make(
  <>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3V7" />
    <path d="M6.3 7l.9 12.2A1.6 1.6 0 0 0 8.8 20.6h6.4a1.6 1.6 0 0 0 1.6-1.4L17.7 7" />
    <path d="M10.2 11v6M13.8 11v6" />
  </>,
)
