'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'

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
      if (r.user.role === 'STUDENT') {
        await fetch('/api/auth/logout', { method: 'POST' })
        toast.error('This portal is for lecturers and administrators only. Please use the student sign-in.', { duration: 6000 })
        setLoading(false)
        return
      }
      toast.success('Welcome back!')
      window.location.href = '/'
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.', { duration: 5000 })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #006633, #003d1f)' }}>
      {/* Gold accent overlay */}
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.4) 0%, transparent 60%)' }} />

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Back link */}
          <button onClick={() => router.push('/')} className="text-xs text-white/60 hover:text-[#D4AF37] flex items-center gap-1 mb-6 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </button>

          {/* Logo — white card behind it so green logo is readable on green bg */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-white rounded-2xl p-3 shadow-xl mb-4">
              <img src="/logo-full.png?v=3" alt="Al-Bashir Academy" className="h-24 sm:h-28 w-auto" />
            </div>
            <h1 className="text-xl font-bold text-white">Staff Portal</h1>
            <p className="text-xs text-white/60 mt-1">For lecturers and administrators only</p>
          </div>

          {/* Form card */}
          <div className="bg-white/[0.08] backdrop-blur-md border border-[#D4AF37]/30 rounded-xl p-5 sm:p-6 shadow-2xl">
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
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[#D4AF37]/50 h-11 text-sm"
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
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-[#D4AF37]/50 h-11 text-sm pr-10"
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

              <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#c4a030] text-black font-semibold h-11 text-sm" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Signing in...</> : 'Sign in'}
              </Button>
            </form>
          </div>

          <p className="text-xs text-center text-white/50 mt-4">
            Forgot password?{' '}
            <button type="button" className="text-[#D4AF37] hover:underline font-medium" onClick={() => toast.info('Please contact the administrator at admin.albashiracademy@gmail.com to reset your password.', { duration: 8000 })}>
              Click here
            </button>
          </p>
          <p className="text-xs text-center text-white/50 mt-2">
            Not a staff member?{' '}
            <button type="button" className="text-[#D4AF37] hover:underline font-medium" onClick={() => router.push('/register')}>Create a student account</button>
          </p>
        </div>
      </div>
    </div>
  )
}
