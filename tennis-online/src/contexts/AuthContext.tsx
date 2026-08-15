import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../types'
import api from '../lib/apiClient'

interface AuthContextValue {
  user: AuthUser | null
  /** True while the initial /auth/me check on page load is in flight. */
  checking: boolean
  login: (email: string, password: string, role: 'admin' | 'ambassador') => Promise<void>
  logout: () => Promise<void>
  /** Merge fresh fields into the cached user (e.g. after editing a profile). */
  updateUser: (patch: Partial<AuthUser>) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * `/auth/me` returns the ambassador/admin profile shape, not AuthUser
 * directly — this narrows it to the fields the rest of the app reads off
 * `user`, without pulling in every profile field.
 */
function toAuthUser(me: {
  id: number
  role: 'admin' | 'ambassador'
  full_name: string
  email: string | null
  province_id?: number
  province_name?: string | null
}): AuthUser {
  return {
    id: me.id,
    role: me.role,
    name: me.full_name,
    email: me.email ?? '',
    province_id: me.province_id,
    province_name: me.province_name ?? undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  // The session lives in an HttpOnly cookie the server sets — JS can't read
  // it, so "am I logged in?" can only be answered by asking the server.
  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(toAuthUser(data))
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, role: 'admin' | 'ambassador') => {
      const { data } = await api.post<{ user: AuthUser }>('/auth/login', { email, password, role })
      setUser(data.user)
    },
    [],
  )

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      // Clear client state regardless of whether the request reached the
      // server — an offline logout should still feel like a logout.
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, checking, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
