import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { LayoutContext } from '../../contexts/LayoutContext'

interface AppLayoutProps {
  children: ReactNode
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
          <div className="p-4 sm:p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </LayoutContext.Provider>
  )
}
