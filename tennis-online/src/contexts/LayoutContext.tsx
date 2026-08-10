import { createContext, useContext } from 'react'

interface LayoutContextValue {
  /** Mobile drawer state. Ignored from `lg` up, where the sidebar is static. */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
})

export function useLayout() {
  return useContext(LayoutContext)
}
