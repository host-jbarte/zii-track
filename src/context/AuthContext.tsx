import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: 'manager' | 'member'
  created_at: number
}

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
  isManager: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const u = localStorage.getItem('tempo_user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tempo_token'))

  const login = (user: AuthUser, token: string) => {
    setUser(user)
    setToken(token)
    localStorage.setItem('tempo_user', JSON.stringify(user))
    localStorage.setItem('tempo_token', token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('tempo_user')
    localStorage.removeItem('tempo_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isManager: user?.role === 'manager' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
