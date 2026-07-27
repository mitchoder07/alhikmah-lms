'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from '@/components/app-provider'
import { LandingPage } from '@/components/views/public/landing'
import { LoginPage } from '@/components/views/auth/login'
import { RegisterPage } from '@/components/views/auth/register'
import { StaffLoginPage } from '@/components/views/auth/staff-login'
import { CertificateVerifyPage } from '@/components/views/public/verify-certificate'
import { StudentApp } from '@/components/views/student/app'
import { AdminApp } from '@/components/views/admin/app'
import { Loader2 } from 'lucide-react'

function HomeInner() {
  const { user, loading } = useSession()
  const sp = useSearchParams()
  const router = useRouter()
  const view = sp.get('view') || ''

  // Legacy ?view= redirects — preserve old bookmarks by sending users to the clean URL
  // (Only for public/auth routes. App routes like dashboard stay on `/`.)
  if (!loading && !user) {
    if (view === 'login') { router.replace('/login'); return null }
    if (view === 'register') { router.replace('/register'); return null }
    if (view === 'staff-login') { router.replace('/staff-login'); return null }
    if (view === 'verify-certificate') { router.replace('/verify-certificate'); return null }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Al-Bashir Academy LMS</p>
        </div>
      </div>
    )
  }

  if (view === 'verify-certificate') return <CertificateVerifyPage />

  if (!user) {
    if (view === 'login') return <LoginPage />
    if (view === 'register') return <RegisterPage />
    if (view === 'staff-login') return <StaffLoginPage />
    return <LandingPage />
  }

  if (user.role === 'ADMIN' || user.role === 'LECTURER') {
    return <AdminApp />
  }
  return <StudentApp />
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <HomeInner />
    </Suspense>
  )
}
