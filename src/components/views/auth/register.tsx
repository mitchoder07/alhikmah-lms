'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, GraduationCap, Eye, EyeOff } from 'lucide-react'

export function RegisterPage() {
  const router = useRouter()
  const { register } = useSession()
  const [form, setForm] = useState({ name: '', email: '', password: '', matricNumber: '', phone: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await register(form)
      if (!r.ok || !r.user) {
        toast.error(r.error || 'Registration failed')
        setLoading(false)
        return
      }
      toast.success('Welcome to Al-Bashir Academy LMS!')
      // Hard redirect so the session is fresh
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
            <div className="h-11 w-11 rounded-full albashir-gradient flex items-center justify-center text-white flex-shrink-0"><GraduationCap className="h-5 w-5" /></div>
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">Create Account</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Open to all learners: Al-Hikmah students and guests</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 p-5 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">Full Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Aisha Mohammed" className="h-11 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@gmail.com" className="h-11 text-base" />
              <p className="text-[11px] text-muted-foreground">Any email is welcome: Gmail, Yahoo, Outlook, etc.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matric" className="text-sm">Matric Number <span className="text-muted-foreground font-normal">(Al-Hikmah students only)</span></Label>
              <Input id="matric" value={form.matricNumber} onChange={(e) => update('matricNumber', e.target.value)} placeholder="20/03ECO002" className="h-11 text-base" />
              <p className="text-[11px] text-muted-foreground">Leave blank if you are not an Al-Hikmah student. Format: 20/03ECO002 (year/faculty/dept/number)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+234..." className="h-11 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Minimum 6 characters"
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
            <div className="rounded-md bg-secondary/50 border p-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">Open to everyone. Al-Hikmah students and external learners alike. You get the same access to all Economics courses and certificates.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-5 sm:p-6 pt-0">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Creating account...</> : 'Create Account'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already have an account? <button type="button" className="text-primary hover:underline font-medium" onClick={() => router.push('/login')}>Sign in</button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
