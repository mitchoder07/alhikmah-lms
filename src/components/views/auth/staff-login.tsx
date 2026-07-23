'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Lock, Eye, EyeOff, Shield } from 'lucide-react'

export function StaffLoginPage() {
  const router = useRouter()
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await login(email, password)
      if (!r.ok || !r.user) {
        toast.error(r.error || 'Login failed', { duration: 5000 })
        setLoading(false)
        return
      }
      // Check if the user is a student — block them from staff login
      if (r.user.role === 'STUDENT') {
        await fetch('/api/auth/logout', { method: 'POST' })
        toast.error('This portal is for lecturers and administrators only. Please use the student sign-in.', { duration: 6000 })
        setLoading(false)
        return
      }
      // Staff login successful — hard redirect
      toast.success('Welcome back!')
      window.location.href = '/'
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.', { duration: 5000 })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 alhikmah-gradient" />
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.4) 0%, transparent 60%)' }} />

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Back link */}
          <button onClick={() => router.push('/')} className="text-xs text-white/60 hover:text-gold flex items-center gap-1 mb-6 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </button>

          {/* Lock icon + title */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 rounded-full bg-gold/20 border border-gold/50 items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-gold" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Staff Portal</h1>
            <p className="text-sm text-white/70">For lecturers and administrators only</p>
          </div>

          {/* Form card */}
          <div className="bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-xl p-5 sm:p-6 shadow-2xl">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/90 text-xs">Staff Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@alhikmah.edu.ng"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-gold/50 h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/90 text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-gold/50 h-11 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-black font-semibold h-11 text-sm" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Signing in...</> : <><Shield className="h-4 w-4 mr-1" /> Sign in</>}
              </Button>
            </form>
          </div>

          <p className="text-xs text-center text-white/50 mt-6">
            Not a staff member?{' '}
            <button type="button" className="text-gold hover:underline font-medium" onClick={() => router.push('/register')}>Create a student account</button>
          </p>
        </div>
      </div>
    </div>
  )
}
