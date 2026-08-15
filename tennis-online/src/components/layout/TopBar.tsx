import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import {
  IconBell, IconMail, IconChevronDown, IconCheckCircle, IconUserCircle,
  IconLogout, IconMenu,
} from '../ui/icons'

interface Crumb { label: string; to?: string }

interface TopBarProps {
  title: string
  /** Pill rendered inline after the title, e.g. approval state. */
  badge?: { label: string; tone?: 'success' | 'warning' | 'primary' }
  subtitle?: string
  breadcrumbs?: Crumb[]
  actions?: ReactNode
  /** Unread counters on the bell / mail buttons. */
  notifications?: number
  messages?: number
}

const BADGE_TONES = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  primary: 'bg-primary-light text-primary',
} as const

function IconButton({
  label,
  count,
  children,
}: {
  label: string
  count?: number
  children: ReactNode
}) {
  return (
    <button
      aria-label={count ? `${label} (${count})` : label}
      className="relative p-2 rounded-xl text-ink/70 hover:text-ink hover:bg-bg transition-colors"
    >
      {children}
      {!!count && (
        <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

export default function TopBar({
  title,
  badge,
  subtitle,
  breadcrumbs = [],
  actions,
  notifications,
  messages,
}: TopBarProps) {
  const { user, logout } = useAuth()
  const { setSidebarOpen } = useLayout()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header
      className={[
        'fixed top-0 right-0 left-0 lg:left-[var(--sidebar-w)] z-30',
        'h-[var(--topbar-h)] flex items-center justify-between gap-2 sm:gap-4',
        'px-3 sm:px-5 lg:px-6 bg-surface border-b border-border',
      ].join(' ')}
    >
      {/* Drawer trigger — static sidebar takes over from lg */}
      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="เปิดเมนู"
        className="lg:hidden -ml-1 p-2 rounded-xl text-ink hover:bg-bg transition-colors shrink-0"
      >
        <IconMenu className="w-[22px] h-[22px]" />
      </button>

      <div className="min-w-0 flex-1">
        {breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1 text-xs text-muted mb-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <h1
            className="text-base lg:text-lg font-bold text-ink leading-tight truncate"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h1>
          {badge && (
            <span
              className={`hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                BADGE_TONES[badge.tone ?? 'success']
              }`}
            >
              <IconCheckCircle className="w-3.5 h-3.5" strokeWidth={2.2} />
              {badge.label}
            </span>
          )}
        </div>

        {subtitle && <p className="hidden lg:block text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {actions}

        <IconButton label="การแจ้งเตือน" count={notifications}>
          <IconBell className="w-5 h-5" />
        </IconButton>
        <IconButton label="ข้อความ" count={messages}>
          <IconMail className="w-5 h-5" />
        </IconButton>

        {/* User menu */}
        <div className="relative sm:pl-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-bg transition-colors"
          >
            <ImagePlaceholder
              className="w-9 h-9 rounded-full shrink-0"
              iconClassName="w-4 h-4"
            />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-semibold text-ink truncate" style={{ maxWidth: 140 }}>
                {user?.name ?? 'ผู้ใช้งาน'}
              </p>
              <p className="text-xs text-muted truncate" style={{ maxWidth: 140 }}>
                {user?.province_name ?? (user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'TOT Ambassador')}
              </p>
            </div>
            <IconChevronDown
              className={`hidden sm:block w-4 h-4 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-surface shadow-lg py-1.5 z-50"
            >
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-bg transition-colors"
              >
                <IconUserCircle className="w-[18px] h-[18px]" />
                ข้อมูลส่วนตัว
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger-light transition-colors"
              >
                <IconLogout className="w-[18px] h-[18px]" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
