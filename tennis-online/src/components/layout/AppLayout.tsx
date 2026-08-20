import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { LayoutContext } from '../../contexts/LayoutContext'
import { useAuth } from '../../contexts/AuthContext'

interface AppLayoutProps {
  children: ReactNode
}

/**
 * A rejected/blocked ambassador can still log in and browse (every write
 * route re-checks status server-side regardless of what this banner shows),
 * but has no way to tell *why* they can't add/edit/delete anything unless
 * something on-screen says so. Shown globally rather than per-page so it
 * follows them no matter where they land.
 */
function ReadOnlyBanner() {
  const { user } = useAuth()
  if (user?.role !== 'ambassador') return null
  if (user.status !== 'rejected' && user.status !== 'blocked') return null

  const rejected = user.status === 'rejected'
  return (
    <div className={`px-4 sm:px-5 py-2.5 text-sm text-white ${rejected ? 'bg-danger' : 'bg-warning'}`}>
      <p className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-semibold">
          {rejected ? '⚠️ ใบสมัคร Ambassador ของคุณถูกปฏิเสธ' : '⚠️ บัญชีของคุณถูกระงับการใช้งานชั่วคราว'}
        </span>
        <span className="opacity-95">
          {rejected
            ? user.reject_reason
              ? `เหตุผล: ${user.reject_reason}`
              : 'กรุณาติดต่อทีมงานเพื่อสอบถามรายละเอียด'
            : 'กรุณาติดต่อทีมงานเพื่อแก้ไขปัญหา'}
          {' — คุณดูข้อมูลได้ตามปกติ แต่เพิ่ม/แก้ไข/ลบ ไม่ได้จนกว่าจะได้รับการอนุมัติอีกครั้ง'}
        </span>
      </p>
    </div>
  )
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  // Navigating from the drawer should dismiss it.
  useEffect(() => setSidebarOpen(false), [pathname])

  // Stop the page behind the drawer from scrolling on touch devices.
  useEffect(() => {
    document.body.classList.toggle('drawer-open', sidebarOpen)
    return () => document.body.classList.remove('drawer-open')
  }, [sidebarOpen])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSidebarOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  return (
    <LayoutContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="min-h-screen">
        <Sidebar />

        {/* Scrim — only reachable while the drawer is open below lg */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="min-h-screen pt-[var(--topbar-h)] lg:ml-[var(--sidebar-w)]">
          <ReadOnlyBanner />
          <div className="p-4 sm:p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </LayoutContext.Provider>
  )
}
