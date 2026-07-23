import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST: Verify payment for course access. If successful, create a CourseAccess record.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { reference, status } = body as { reference: string; status?: 'success' | 'failed' }

  if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 })

  const payment = await db.payment.findUnique({
    where: { reference },
    include: { user: true },
  })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  if (payment.userId !== user.id && user.role === 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!payment.courseId || payment.courseId !== id) {
    return NextResponse.json({ error: 'Payment does not match this course' }, { status: 400 })
  }

  let finalStatus: 'success' | 'failed' = status || 'success'

  // Verify with the actual provider if a secret key is configured
  if (payment.provider === 'paystack') {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (paystackSecret) {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      })
      const data = await res.json()
      if (data.status && data.data.status === 'success') finalStatus = 'success'
      else finalStatus = 'failed'
    }
  } else if (payment.provider === 'flutterwave') {
    const flwSecret = process.env.FLW_SECRET_KEY
    if (flwSecret) {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        { headers: { Authorization: `Bearer ${flwSecret}` } },
      )
      const data = await res.json()
      if (data.status === 'success' && data.data.status === 'successful') finalStatus = 'success'
      else finalStatus = 'failed'
    }
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { status: finalStatus, paidAt: finalStatus === 'success' ? new Date() : null },
  })

  if (finalStatus !== 'success') {
    return NextResponse.json({ status: 'failed', provider: payment.provider })
  }

  // Fetch course to get access duration
  const course = await db.course.findUnique({
    where: { id },
    select: { accessDurationMonths: true, courseFee: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Compute expiration: now + accessDurationMonths
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + course.accessDurationMonths)

  // Upsert CourseAccess record (unique on userId + courseId)
  const courseAccess = await db.courseAccess.upsert({
    where: { userId_courseId: { userId: user.id, courseId: id } },
    update: {
      paidAt: new Date(),
      expiresAt,
      amountPaid: payment.amount,
      isActive: true,
    },
    create: {
      userId: user.id,
      courseId: id,
      paidAt: new Date(),
      expiresAt,
      amountPaid: payment.amount,
      isActive: true,
    },
  })

  return NextResponse.json({ status: 'success', courseAccess, provider: payment.provider })
}
