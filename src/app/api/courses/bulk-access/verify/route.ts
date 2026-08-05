import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/courses/bulk-access/verify
//
// Verify a bulk course-cart payment and grant CourseAccess to every course it
// covered. This is the counterpart to POST /api/courses/bulk-access (which
// creates ONE payment for the discounted total across multiple courses).
//
// Body: { reference: string, status?: 'success' | 'failed' }
// Returns: { status: 'success' | 'failed', grantedCount?, provider? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { reference, status } = body as { reference?: string; status?: 'success' | 'failed' }

  if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 })

  const payment = await db.payment.findUnique({
    where: { reference },
    include: { user: true },
  })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  if (payment.userId !== user.id && user.role === 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // This endpoint is only for bulk course-cart payments.
  if (!payment.bulkCourseIds) {
    return NextResponse.json({ error: 'Payment is not a bulk payment' }, { status: 400 })
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

  // Grant access to every course covered by the bulk payment
  const courseIds = payment.bulkCourseIds.split(',').map((c) => c.trim()).filter(Boolean)
  const courses = await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, accessDurationMonths: true },
  })

  let grantedCount = 0
  for (const course of courses) {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + (course.accessDurationMonths || 6))
    await db.courseAccess.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      update: {
        paidAt: new Date(),
        expiresAt,
        amountPaid: payment.amount,
        isActive: true,
      },
      create: {
        userId: user.id,
        courseId: course.id,
        paidAt: new Date(),
        expiresAt,
        amountPaid: payment.amount,
        isActive: true,
      },
    })
    grantedCount++
  }

  return NextResponse.json({ status: 'success', grantedCount, provider: payment.provider })
}
