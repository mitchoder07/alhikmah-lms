'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
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
            <div className="h-11 w-11 rounded-full albashir-gradient flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">BEC</div>
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
          <CardFooter className="flex flex-col gap-3 p-5 sm:p-6 pt-0">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Signing in...</> : 'Sign in'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              New here? <button type="button" className="text-primary hover:underline font-medium" onClick={() => router.push('/register')}>Create an account</button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
