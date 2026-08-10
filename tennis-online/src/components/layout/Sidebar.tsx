import { useState } from 'react'
import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLayout } from '../../contexts/LayoutContext'
import TennisBallLogo from '../ui/TennisBallLogo'
import BrandLogo from '../ui/BrandLogo'
import type { IconProps } from '../ui/icons'
import {
  IconHome, IconCourt, IconPlusCircle, IconSearch, IconGrid,
  IconCalendar, IconCalendarCheck, IconList, IconUsers, IconUser,
  IconMapPin, IconFileText, IconEdit, IconImage, IconUserCircle,
  IconInfo, IconMail, IconChevronDown, IconClose,
} from '../ui/icons'

type Icon = ComponentType<IconProps>

type NavItem = {
  label: string
  icon: Icon
  /** Omit while the page does not exist yet — the row renders inert. */
  to?: string
}
type NavGroup = { label: string; icon: Icon; items: NavItem[] }

const AMBASSADOR_ROOT: NavItem = { to: '/ambassador/dashboard', label: 'หน้าหลัก', icon: IconHome }

const AMBASSADOR_GROUPS: NavGroup[] = [
  {
    label: 'ข้อมูลสนาม',
    icon: IconCourt,
    items: [
      { to: '/ambassador/courts/add', label: 'เพิ่มสนามใหม่', icon: IconPlusCircle },
      { label: 'ตรวจสอบ / อัปเดตข้อมูล', icon: IconSearch },
      { label: 'สนามของฉัน', icon: IconGrid },
    ],
  },
  {
    label: 'การแข่งขัน & กิจกรรม',
    icon: IconCalendar,
    items: [
      { to: '/ambassador/events/submit', label: 'ส่งการแข่งขัน / กิจกรรม', icon: IconCalendarCheck },
      { label: 'รายการของฉัน', icon: IconList },
    ],
  },
  {
    label: 'เครือข่าย & ชุมชน',
    icon: IconUsers,
    items: [
      { to: '/ambassador/recommend', label: 'แนะนำบุคคล / คลับ', icon: IconUser },
      { label: 'พื้นที่รับผิดชอบ', icon: IconMapPin },
    ],
  },
  {
    label: 'เนื้อหา & เรื่องราว',
    icon: IconFileText,
    items: [
      { to: '/ambassador/stories/submit', label: 'ส่งเรื่องราว / ภาพ', icon: IconEdit },
      { label: 'ผลงานของฉัน', icon: IconImage },
    ],
  },
]

const ADMIN_ROOT: NavItem = { to: '/admin/dashboard', label: 'หน้าหลัก', icon: IconHome }

const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'การตรวจสอบ',
    icon: IconSearch,
    items: [{ to: '/admin/submissions', label: 'รายการส่งตรวจสอบ', icon: IconList }],
  },
]

const FOOTER_ITEMS: NavItem[] = [
  { to: '/profile', label: 'ข้อมูลส่วนตัว', icon: IconUserCircle },
  { label: 'คู่มือการใช้งาน', icon: IconInfo },
  { label: 'ติดต่อทีมงาน', icon: IconMail },
]

// ===== Rows =====

function NavRow({ item, nested = false }: { item: NavItem; nested?: boolean }) {
  const Glyph = item.icon
  const base = [
    'flex items-center gap-2.5 rounded-xl text-sm transition-colors',
    nested ? 'pl-4 pr-3 py-1.5' : 'px-3 py-2',
  ].join(' ')

  // Pages that are not built yet stay visible but inert, so the sidebar shows
  // the full map of the portal without routing anyone into a broken screen.
  if (!item.to) {
    return (
      <span title="อยู่ระหว่างพัฒนา" className={`${base} text-muted/60 cursor-not-allowed select-none`}>
        <Glyph className="w-[18px] h-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          base,
          isActive ? 'bg-primary-light text-primary font-semibold' : 'text-ink hover:bg-bg',
        ].join(' ')
      }
    >
      <Glyph className="w-[18px] h-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function NavGroupBlock({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(true)
  const Glyph = group.icon

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-ink hover:bg-bg transition-colors"
      >
        <Glyph className="w-[18px] h-[18px] shrink-0 text-muted" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <IconChevronDown
          className={`w-4 h-4 shrink-0 text-muted transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavRow key={item.label} item={item} nested />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useLayout()
  const isAdmin = user?.role === 'admin'

  const root = isAdmin ? ADMIN_ROOT : AMBASSADOR_ROOT
  const groups = isAdmin ? ADMIN_GROUPS : AMBASSADOR_GROUPS

  return (
    <aside
      className={[
        'fixed left-0 top-0 h-screen w-[var(--sidebar-w)] flex flex-col z-40',
        'overflow-y-auto bg-surface border-r border-border',
        'transition-transform duration-200 ease-out lg:translate-x-0',
        // `invisible` keeps the off-canvas drawer out of the tab order and the
        // a11y tree; `lg:visible` restores it once the sidebar is static.
        sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full invisible lg:visible',
      ].join(' ')}
    >
      {/* ===== Logo ===== */}
      <div className="px-5 py-4 shrink-0 flex items-start justify-between gap-2">
        <BrandLogo size={26} subtitle={isAdmin ? 'ADMIN PANEL' : 'FOUNDING AMBASSADOR'} />
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="ปิดเมนู"
          className="lg:hidden -mr-1 p-1.5 rounded-lg text-muted hover:text-ink hover:bg-bg transition-colors"
        >
          <IconClose className="w-5 h-5" />
        </button>
      </div>

      {/* ===== Nav ===== */}
      <nav className="flex-1 px-3 pb-4">
        <NavRow item={root} />

        {groups.map((group) => (
          <NavGroupBlock key={group.label} group={group} />
        ))}

        <div className="mt-5 pt-4 border-t border-border space-y-0.5">
          {FOOTER_ITEMS.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
        </div>
      </nav>

      {/* ===== Decorative watermark ===== */}
      <div className="shrink-0 pointer-events-none select-none px-5 pb-4 opacity-[0.06]">
        <TennisBallLogo size={150} />
      </div>
    </aside>
  )
}
