'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApi, apiPost } from '@/lib/api'
import { Loader2, ShieldCheck, CreditCard, CheckCircle2, Award, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PaystackLogo, FlutterwaveLogo } from '@/components/lms/payment-logos'

interface CourseData {
  course: { id: string; code: string; title: string; certificateFee: number; lecturer: { name: string } }
  enrollments: Array<{ id: string; finalScore: number | null; lecturerApproved: boolean }>
}

type Provider = 'paystack' | 'flutterwave'

export function StudentCheckout({ enrollmentId, courseId, onNavigate }: { enrollmentId: string; courseId: string; onNavigate: (v: string, p?: any) => void }) {
  const { data, loading } = useApi<CourseData>(`/api/courses/${courseId}`)
  const [provider, setProvider] = useState<Provider>('paystack')
  const [initiating, setInitiating] = useState(false)
  const [payRef, setPayRef] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [success, setSuccess] = useState(false)

  const course = data?.course
  const enrollment = data?.enrollments?.[0]

  const initiate = async () => {
    setInitiating(true)
    try {
      const res = await apiPost('/api/payments/initiate', { enrollmentId, courseId, provider })
      // Real gateway mode: backend returned a real Paystack/Flutterwave checkout URL.
      // Set redirecting state (NOT payRef) so the UI shows a "Redirecting..." spinner
      // instead of the demo card, then redirect.
      if (res.authorization_url && res.authorization_url.startsWith('http')) {
        setRedirecting(true)
        // Small delay so the spinner is visible before the browser navigates away
        setTimeout(() => {
          window.location.href = res.authorization_url
        }, 400)
        return
      }
      // Demo mode: backend returned demo: true and a relative URL. Show the
      // demo card with the "I've Completed Payment" button.
      if (res.demo || (res.authorization_url && !res.authorization_url.startsWith('http'))) {
        setPayRef(res.reference)
        setDemoMode(true)
        toast.info(`Demo mode (${provider}): clicking "I've Completed Payment" will mark the payment as successful.`)
        return
      }
      // Fallback (shouldn't happen)
      setPayRef(res.reference)
      setDemoMode(true)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setInitiating(false)
    }
  }

  const verifyDemo = async () => {
    if (!payRef) return
    setVerifying(true)
    try {
      const res = await apiPost('/api/payments/verify', { reference: payRef, status: 'success' })
      if (res.status === 'success') {
        setSuccess(true)
        toast.success(`Payment successful via ${res.provider}! Certificate issued.`)
      } else {
        toast.error('Payment verification failed.')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setVerifying(false)
    }
  }

  if (loading || !course) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="border-green-500">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your certificate has been issued and is ready to view.</p>
            <Button className="w-full bg-gold hover:bg-gold/90 text-black" onClick={() => onNavigate('certificates')}>
              <Award className="h-4 w-4 mr-2" /> View My Certificates
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => onNavigate('certificates')} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
        <ChevronLeft className="h-3 w-3" /> Back to certificates
      </button>

      <div className="text-center">
        <div className="h-14 w-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-3">
          <Award className="h-7 w-7 text-gold" />
        </div>
        <h2 className="text-2xl font-bold">Certificate Checkout</h2>
        <p className="text-sm text-muted-foreground mt-1">Complete your payment to receive your verified certificate.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{course.title}</p>
              <p className="text-xs text-muted-foreground">{course.code} · {course.lecturer.name}</p>
            </div>
            <Badge variant="outline">{course.certificateFee > 7500 ? 'Premium' : 'Standard'}</Badge>
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Certificate Fee</span>
              <span>₦{course.certificateFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Fee</span>
              <span>₦0</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span className="text-gold">₦{course.certificateFee.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${provider === 'paystack' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
          >
            <input
              type="radio"
              name="provider"
              checked={provider === 'paystack'}
              onChange={() => setProvider('paystack')}
              className="h-4 w-4"
            />
            <div className="flex-shrink-0">
              <PaystackLogo height={28} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Cards · Bank transfer · USSD</p>
            </div>
            {provider === 'paystack' && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
          </label>

          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${provider === 'flutterwave' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
          >
            <input
              type="radio"
              name="provider"
              checked={provider === 'flutterwave'}
              onChange={() => setProvider('flutterwave')}
              className="h-4 w-4"
            />
            <div className="flex-shrink-0">
              <FlutterwaveLogo height={28} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Cards · Bank transfer · Mobile money · USSD</p>
            </div>
            {provider === 'flutterwave' && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
          </label>

          {!payRef ? (
            redirecting ? (
              <div className="w-full p-6 rounded-lg bg-secondary/50 flex flex-col items-center gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="font-medium">Redirecting to {provider === 'paystack' ? 'Paystack' : 'Flutterwave'}...</p>
                <p className="text-xs text-muted-foreground">Please don't close this window.</p>
              </div>
            ) : (
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={initiate} disabled={initiating}>
                {initiating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Pay ₦{course.certificateFee.toLocaleString()} with {provider === 'paystack' ? 'Paystack' : 'Flutterwave'}
              </Button>
            )
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-secondary/50 p-3 text-xs">
                <p className="font-medium mb-1">Payment Reference: <span className="font-mono">{payRef}</span></p>
                <p className="text-muted-foreground">In demo mode, click below to simulate a successful {provider} payment.</p>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={verifyDemo} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                I've Completed Payment
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>Secured by {provider === 'paystack' ? 'Paystack' : 'Flutterwave'} · 256-bit SSL encryption</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
