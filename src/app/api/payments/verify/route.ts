import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Verify payment & auto-issue certificate on success
// Supports both Paystack and Flutterwave
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { reference, status } = body as { reference: string; status?: 'success' | 'failed' }

  const payment = await db.payment.findUnique({
    where: { reference },
    include: { user: true }
  })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.userId !== user.id && user.role === 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let finalStatus: 'success' | 'failed' = status || 'success'

  // Verify with the actual provider if a secret key is configured
  if (payment.provider === 'paystack') {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (paystackSecret) {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` }
      })
      const data = await res.json()
      if (data.status && data.data.status === 'success') finalStatus = 'success'
      else finalStatus = 'failed'
    }
  } else if (payment.provider === 'flutterwave') {
    const flwSecret = process.env.FLW_SECRET_KEY
    if (flwSecret) {
      // Flutterwave verify endpoint uses transaction id, but we stored our tx_ref in `reference`.
      // We need to fetch by tx_ref first.
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
        headers: { Authorization: `Bearer ${flwSecret}` }
      })
      const data = await res.json()
      if (data.status === 'success' && data.data.status === 'successful') finalStatus = 'success'
      else finalStatus = 'failed'
    }
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { status: finalStatus, paidAt: finalStatus === 'success' ? new Date() : null }
  })

  if (finalStatus === 'success' && payment.enrollmentId) {
    // Auto-issue certificate
    const existing = await db.certificate.findUnique({ where: { enrollmentId: payment.enrollmentId } })
    if (!existing) {
      const enrollment = await db.enrollment.findUnique({
        where: { id: payment.enrollmentId },
        include: { course: true, user: true }
      })
      if (enrollment) {
        const certNumber = `AHK-CERT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const cert = await db.certificate.create({
          data: {
            enrollmentId: payment.enrollmentId,
            userId: payment.userId,
            courseId: payment.courseId!,
            certificateNumber: certNumber,
            score: enrollment.finalScore ?? 0,
            verified: true,
          }
        })
        return NextResponse.json({ status: 'success', certificate: cert, provider: payment.provider })
      }
    }
    return NextResponse.json({ status: 'success', message: 'Payment verified, certificate already issued.', provider: payment.provider })
  }
  return NextResponse.json({ status: finalStatus, provider: payment.provider })
}
