'use client'

import { useState } from 'react'
import { useSession } from '@/components/app-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Loader2, Shield, Mail, Save, AlertTriangle } from 'lucide-react'
import { apiPost } from '@/lib/api'

export function AdminSettings() {
  const { user } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  // Password strength check
  const hasMinLength = newPassword.length >= 8
  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasNumber = /\d/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
  const strengthScore = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length
  const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore <= 3 ? 'Fair' : strengthScore <= 4 ? 'Good' : 'Strong'
  const strengthColor = strengthScore <= 1 ? 'text-red-500' : strengthScore <= 3 ? 'text-amber-500' : strengthScore <= 4 ? 'text-blue-500' : 'text-green-500'

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, and a number')
      return
    }
    setLoading(true)
    try {
      await apiPost('/api/auth/change-password', { currentPassword, newPassword })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account security. Change your password regularly to keep the portal safe.</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Account Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{user.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize bg-primary/10 text-primary">{user.role.toLowerCase()}</Badge>
                <Badge variant="outline">{user.department}</Badge>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Last Password Change</p>
                <p className="text-sm font-medium">Change regularly</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription className="text-xs">Use a strong password with at least 8 characters, uppercase, lowercase, and a number</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current" className="text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new" className="text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    id="new"
                    type={showNew ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-11 pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={strengthColor + ' font-medium'}>{strengthLabel}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1 w-6 rounded-full ${i <= strengthScore ? (strengthScore <= 1 ? 'bg-red-500' : strengthScore <= 3 ? 'bg-amber-500' : strengthScore <= 4 ? 'bg-blue-500' : 'bg-green-500') : 'bg-secondary'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm">Confirm New Password</Label>
                <Input
                  id="confirm"
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-11"
                />
              </div>
            </div>

            {/* Password requirements */}
            {newPassword && (
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <span className={hasMinLength ? 'text-green-600' : 'text-muted-foreground'}>{hasMinLength ? '✓' : '○'} At least 8 characters</span>
                  <span className={hasUpper ? 'text-green-600' : 'text-muted-foreground'}>{hasUpper ? '✓' : '○'} Uppercase letter</span>
                  <span className={hasLower ? 'text-green-600' : 'text-muted-foreground'}>{hasLower ? '✓' : '○'} Lowercase letter</span>
                  <span className={hasNumber ? 'text-green-600' : 'text-muted-foreground'}>{hasNumber ? '✓' : '○'} Number</span>
                  <span className={hasSpecial ? 'text-green-600' : 'text-muted-foreground'}>{hasSpecial ? '✓' : '○'} Special character (recommended)</span>
                </div>
              </div>
            )}

            <Button type="submit" className="bg-primary hover:bg-primary/90 h-11" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Updating...</> : <><Save className="h-4 w-4 mr-1" /> Update Password</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-amber-900">Security Best Practices</p>
              <ul className="text-xs text-amber-800 mt-2 space-y-1">
                <li>Change your password every 30 days</li>
                <li>Never share your password with anyone, including other staff</li>
                <li>Use a unique password that you don't use on other websites</li>
                <li>Always sign out after using the portal on a shared computer</li>
                <li>Only the admin can revoke certificates and manage lecturers</li>
                <li>The staff portal URL is private and should only be shared with authorized staff</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
