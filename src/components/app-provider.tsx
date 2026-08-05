'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'ADMIN' | 'LECTURER' | 'STUDENT'

interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  matricNumber?: string | null
  department?: string
  avatarUrl?: string | null
  signatureUrl?: string | null
}

interface SessionState {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: SessionUser }>
  register: (data: { name: string; email: string; password: string; matricNumber?: string; phone?: string }) => Promise<{ ok: boolean; error?: string; user?: SessionUser }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within AppProvider')
  return ctx
}

function AppProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user ?? null)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // NOTE: Auth redirects are handled per-route (in each page's own logic), not here.
  // This avoids issues where the AppProvider's useEffect fires before child components mount.
  // Public routes (/, /login, /register, /staff-login, /verify-certificate, /sitemap) don't need auth.
  // The home page (page.tsx) handles redirects for the main app routes.

  useEffect(() => {
    // No global redirect — each page handles its own auth
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? 'Login failed' }
    // Don't set user here — let the calling page decide based on role check
    return { ok: true, user: data.user }
  }

  const register = async (data: { name: string; email: string; password: string; matricNumber?: string; phone?: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { ok: false, error: json.error ?? 'Registration failed' }
    // Don't set user here — let the calling page decide
    return { ok: true, user: json.user }
  }

  const logout = async () => {
    const wasStaff = user?.role === 'ADMIN' || user?.role === 'LECTURER'
    setUser(null)
    // Use server-side redirect to guarantee cookie deletion
    if (typeof window !== 'undefined') {
      window.location.href = `/logout?to=${wasStaff ? '/staff-login' : '/login'}`
    }
  }

  return (
    <SessionContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  )
}

export function AppProvider({ children }: { children: ReactNode }) {
  return <AppProviderInner>{children}</AppProviderInner>
}
