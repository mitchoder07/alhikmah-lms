'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Eye, EyeOff, Mail, Info } from 'lucide-react'

export function LoginPage() {
  const router = useRouter()
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitted, setForgotSubmitted] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await login(email, password)
      if (!r.ok || !r.user) {
        toast.error(r.error || 'Login failed')
        setLoading(false)
        return
      }
      // Check if the logged-in user is staff — block them from student login
      if (r.user.role === 'ADMIN' || r.user.role === 'LECTURER') {
        // Logout immediately and reject
        await fetch('/api/auth/logout', { method: 'POST' })
        toast.error('Staff accounts must sign in through the staff portal.', { duration: 5000 })
        setLoading(false)
        return
      }
      // Only set user + redirect if they are a student
      toast.success('Welcome back!')
      // Use hard redirect so the session is fresh
      window.location.href = '/'
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="p-5 sm:p-6">
          <button onClick={() => router.push('/')} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </button>
          <div className="flex items-center gap-3">
            <img src="/icon-192.png?v=3" alt="Al-Bashir Academy" className="h-11 w-11 rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">Sign in</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Access your Economics courses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 p-5 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className="h-11 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 text-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 p-5 sm:p-6 pt-0">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Signing in...</> : 'Sign in'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Forgot password?{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => { setForgotOpen(true); setForgotSubmitted(false); setForgotEmail(email) }}
              >
                Click here
              </button>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              New here?{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => router.push('/register')}
              >
                Create an account
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Forgot password dialog (no API — just shows instructions) */}
      <Dialog open={forgotOpen} onOpenChange={(o) => { setForgotOpen(o); if (!o) setForgotSubmitted(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter the email address associated with your account. We won&apos;t send an automated email — password resets are handled by the administrator.
            </DialogDescription>
          </DialogHeader>
          {forgotSubmitted ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium text-foreground">Contact the administrator</p>
                  <p className="text-muted-foreground">
                    Please contact the administrator at{' '}
                    <a href="mailto:admin@alhikmah.edu.ng" className="font-medium text-primary hover:underline break-all">
                      admin@alhikmah.edu.ng
                    </a>{' '}
                    to reset your password. For security reasons, password resets are handled manually.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mention your full name, matric number (if any), and the email you registered with so the admin can locate your account quickly.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="h-11 text-base pl-9"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                After submitting, you&apos;ll see the admin&apos;s contact details to request a manual password reset.
              </p>
            </div>
          )}
          <DialogFooter>
            {forgotSubmitted ? (
              <Button onClick={() => setForgotOpen(false)} className="bg-primary hover:bg-primary/90">
                Got it
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => setForgotSubmitted(true)}
                  disabled={!forgotEmail.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  Continue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
