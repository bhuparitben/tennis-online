import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../types'
import api from '../lib/apiClient'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string, role: 'admin' | 'ambassador') => Promise<void>
  logout: () => void
  /** Merge fresh fields into the cached user, optionally swapping the token. */
  updateUser: (patch: Partial<AuthUser>, nextToken?: string) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = useCallback(
    async (email: string, password: string, role: 'admin' | 'ambassador') => {
      const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email,
        password,
        role,
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
    },
    [],
  )

  const updateUser = useCallback((patch: Partial<AuthUser>, nextToken?: string) => {
    setUser((prev) => {
      if (!prev) return prev
      const merged = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(merged))
      return merged
    })
    if (nextToken) {
      localStorage.setItem('token', nextToken)
      setToken(nextToken)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
