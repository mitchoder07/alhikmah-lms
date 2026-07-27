'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, ShieldCheck, Award, AlertCircle, CheckCircle2, Eye } from 'lucide-react'
import { CertificatePreview } from '@/components/lms/certificate-preview'

interface CertData {
  certificateNumber: string
  issuedAt: string
  score: number
  verified: boolean
  studentName: string
  matricNumber: string | null
  department: string
  courseCode: string
  courseTitle: string
  creditUnit: number
  lecturerName: string
}

export function CertificateVerifyPage() {
  const router = useRouter()
  const [certNumber, setCertNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CertData | null>(null)
  const [error, setError] = useState('')

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certNumber.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/certificates/verify?cert=${encodeURIComponent(certNumber.trim().toUpperCase())}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Certificate not found')
      } else {
        setResult(data.certificate)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icon-192.png?v=2" alt="Al-Bashir Academy" className="h-9 w-9 rounded-full flex-shrink-0" />
            <p className="font-semibold text-xs sm:text-sm truncate">Al-Bashir Academy · Certificate Verification</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="flex-shrink-0"><ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Home</span></Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 sm:py-12 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-gold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Certificate Verification</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Enter a certificate number to verify its authenticity.</p>
          </div>

          <Card>
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Verify a Certificate</CardTitle>
              <CardDescription className="text-xs sm:text-sm">The certificate number is printed on the bottom of every issued certificate.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0">
              <form onSubmit={verify} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="cert" className="sr-only">Certificate Number</Label>
                  <Input
                    id="cert"
                    placeholder="e.g. ABA-CERT-2025-AB12CD"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Verifying…' : <><Search className="h-4 w-4 mr-1" /> Verify</>}
                </Button>
              </form>
              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Not Verified</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              {result && (
                <div className="mt-6 border-2 border-gold rounded-lg overflow-hidden">
                  <div className="albashir-gradient p-4 text-white text-center">
                    <Award className="h-10 w-10 mx-auto mb-2 text-gold" />
                    <p className="text-xs uppercase tracking-widest text-gold/90">Certificate of Completion</p>
                    <p className="text-lg font-bold mt-1">Verified Authentic</p>
                  </div>
                  <div className="p-5 space-y-3 bg-card">
                    <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">This certificate is valid and verified.</span>
                    </div>
                    <Row label="Certificate No." value={result.certificateNumber} mono />
                    <Row label="Student Name" value={result.studentName} />
                    <Row label="Matric Number" value={result.matricNumber || 'N/A'} mono />
                    <Row label="Department" value={result.department} />
                    <Row label="Course" value={`${result.courseCode}: ${result.courseTitle}`} />
                    <Row label="Credit Units" value={String(result.creditUnit)} />
                    <Row label="Final Score" value={`${result.score}%`} />
                    <Row label="Lecturer" value={result.lecturerName} />
                    <Row label="Issued On" value={new Date(result.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                    <div className="pt-3 border-t mt-3">
                      <PreviewButton cert={result} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Try: <button className="font-mono text-primary hover:underline" onClick={() => setCertNumber('ABA-CERT-2025-DEMO01')}>ABA-CERT-2025-DEMO01</button> (after issuing a demo cert)
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Al-Bashir Academy · Department of Economics
      </footer>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function PreviewButton({ cert }: { cert: CertData }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Eye className="h-3 w-3 mr-1" /> Preview Full Certificate
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <CertificatePreview cert={cert} />
        </DialogContent>
      </Dialog>
    </>
  )
}
