'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from '@/components/app-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Loader2, Shield, Mail, Save, AlertTriangle, PenTool, Upload, Trash2, Loader } from 'lucide-react'
import { apiPost } from '@/lib/api'

export function AdminSettings() {
  const { user, refresh } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  // Signature upload state
  const sigInputRef = useRef<HTMLInputElement>(null)
  const [sigUploading, setSigUploading] = useState(false)
  const [sigRemoving, setSigRemoving] = useState(false)
  const [sigPreview, setSigPreview] = useState<string | null>(null)

  // Sync local signature preview with the session user's signatureUrl
  useEffect(() => {
    setSigPreview(user?.signatureUrl ?? null)
  }, [user?.signatureUrl])

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

  /**
   * Client-side background removal for scanned signatures.
   * Loads the uploaded image into a canvas, reads every pixel, and makes
   * near-white pixels (R > 230, G > 230, B > 230) fully transparent.
   * The result is exported as a PNG (which preserves alpha) and uploaded.
   *
   * This is the "pen ink only" effect the user wants — no server-side
   * image processing required, works identically on Vercel serverless.
   */
  const removeBackground = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = () => {
        img.onload = () => {
          try {
            // Cap dimensions so we don't end up with a multi-MB PNG
            const MAX_DIM = 600
            let { width, height } = img
            if (width > MAX_DIM || height > MAX_DIM) {
              const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
              width = Math.round(width * ratio)
              height = Math.round(height * ratio)
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('Canvas not supported'))
              return
            }
            ctx.drawImage(img, 0, 0, width, height)
            const imageData = ctx.getImageData(0, 0, width, height)
            const data = imageData.data
            const THRESHOLD = 230 // anything brighter than this becomes transparent
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              if (r > THRESHOLD && g > THRESHOLD && b > THRESHOLD) {
                // Make near-white pixel fully transparent (pen ink stays opaque)
                data[i + 3] = 0
              }
            }
            ctx.putImageData(imageData, 0, 0)
            canvas.toBlob((blob) => {
              if (blob) resolve(blob)
              else reject(new Error('Failed to export PNG'))
            }, 'image/png')
          } catch (err) {
            reject(err)
          }
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = reader.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleSignatureUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a PNG or JPEG image of your signature.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Maximum 5MB. Please crop to just the signature area first.')
      return
    }
    setSigUploading(true)
    try {
      // Step 1: remove white background client-side so only the pen ink remains
      const processedBlob = await removeBackground(file)

      // Step 2: re-check size after processing (PNG with alpha can be larger than the original JPG)
      if (processedBlob.size > 2 * 1024 * 1024) {
        toast.error('Processed signature is still too large. Please crop more tightly around just the signature.')
        return
      }

      // Step 3: upload to the signature endpoint
      const fd = new FormData()
      fd.append('file', processedBlob, 'signature.png')
      const res = await fetch('/api/auth/upload-signature', { method: 'POST', body: fd })
      const text = await res.text()
      if (!text) throw new Error('Upload failed. Try a smaller image.')
      let json
      try { json = JSON.parse(text) } catch { throw new Error('Server error during upload.') }
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      setSigPreview(json.signatureUrl)
      // Refresh the session so the new signatureUrl is available app-wide
      await refresh()
      toast.success('Signature uploaded — it will appear on all new certificates and transcripts.')
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload signature')
    } finally {
      setSigUploading(false)
      if (sigInputRef.current) sigInputRef.current.value = ''
    }
  }

  const handleSignatureRemove = async () => {
    if (!confirm('Remove your signature? Certificates will fall back to showing just your printed name.')) return
    setSigRemoving(true)
    try {
      const res = await fetch('/api/auth/upload-signature', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove signature')
      }
      setSigPreview(null)
      await refresh()
      toast.success('Signature removed.')
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove signature')
    } finally {
      setSigRemoving(false)
    }
  }

  if (!user) return null
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account security and signature. Change your password regularly to keep the portal safe.</p>
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

      {/* Signature Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Lecturer / Admin Signature</CardTitle>
              <CardDescription className="text-xs">
                Sign your name on a blank sheet of paper, take a clear photo or scan it,
                and upload it here. We automatically remove the white background so only
                the pen ink remains. Your signature will appear on every certificate and
                transcript you issue.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={sigInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleSignatureUpload(f)
            }}
          />

          {sigPreview ? (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-secondary/30 p-6 flex items-center justify-center min-h-[140px]">
                {/* Checkerboard background so transparent PNG is visible */}
                <div
                  className="flex items-center justify-center w-full"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                    minHeight: '100px',
                  }}
                >
                  <img
                    src={sigPreview}
                    alt="Your signature"
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={sigUploading}
                  onClick={() => sigInputRef.current?.click()}
                >
                  {sigUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Replacing...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Replace Signature</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/5"
                  disabled={sigRemoving}
                  onClick={handleSignatureRemove}
                >
                  {sigRemoving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Removing...</>
                  ) : (
                    <><Trash2 className="h-4 w-4 mr-2" /> Remove</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-green-700 bg-green-50 rounded-md p-2">
                ✓ Signature active — it will appear on the next certificate or transcript you issue.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                disabled={sigUploading}
                className="w-full min-h-[140px] rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed p-6"
              >
                {sigUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">Processing & uploading...</span>
                    <span className="text-xs">Removing background, this takes a moment.</span>
                  </>
                ) : (
                  <>
                    <PenTool className="h-8 w-8" />
                    <span className="text-sm font-medium">Upload your signature</span>
                    <span className="text-xs text-center max-w-md">
                      Sign on white paper, photograph or scan it, then click here. We&apos;ll remove the background automatically.
                    </span>
                  </>
                )}
              </button>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-medium text-amber-900 mb-1">Tips for a clean signature:</p>
                <ul className="text-xs text-amber-800 space-y-0.5 list-disc list-inside">
                  <li>Use a dark pen (black or blue) on plain white paper.</li>
                  <li>Crop the image to just the signature area before uploading.</li>
                  <li>Make sure the paper is well-lit and there are no shadows.</li>
                  <li>Maximum 5MB upload; we resize to 600px on the longest side.</li>
                </ul>
              </div>
            </div>
          )}
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
                <li>Use a unique password that you don&apos;t use on other websites</li>
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
