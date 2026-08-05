import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

// POST /api/courses/bulk-access
//
// Initiate a SINGLE Paystack/Flutterwave payment for multiple paid courses at
// once (with the bulk discount applied). This creates ONE Payment record with
// bulkCourseIds set to the comma-separated list of courseIds, and returns one
// Paystack/Flutterwave checkout URL for the discounted total.
//
// Body: { courseIds: string[], provider: 'paystack' | 'flutterwave' }
// Returns: { reference, amount, provider, authorization_url, demo? }
//
// Discount tiers (same as /api/courses/bulk-discount):
//   1-2 courses = 0% off
//   3-4 courses = 10% off
//   5+ courses  = 15% off
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { courseIds, provider } = body as { courseIds: string[]; provider?: 'paystack' | 'flutterwave' }

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return NextResponse.json({ error: 'courseIds must be a non-empty array' }, { status: 400 })
  }

  const providerNorm: 'paystack' | 'flutterwave' = provider === 'flutterwave' ? 'flutterwave' : 'paystack'

  // Deduplicate
  const uniqueIds = Array.from(new Set(courseIds))

  // Fetch the courses (only paid ones are eligible)
  const courses = await db.course.findMany({
    where: { id: { in: uniqueIds }, isPaid: true },
    select: { id: true, code: true, title: true, courseFee: true, accessDurationMonths: true },
  })

  if (courses.length === 0) {
    return NextResponse.json({ error: 'No paid courses found for the given IDs' }, { status: 404 })
  }

  // Filter out courses the user already has active access to — no need to pay twice
  const activeAccess = await db.courseAccess.findMany({
    where: {
      userId: user.id,
      courseId: { in: courses.map((c) => c.id) },
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    select: { courseId: true },
  })
  const activeCourseIds = new Set(activeAccess.map((a) => a.courseId))
  const toPayFor = courses.filter((c) => !activeCourseIds.has(c.id))

  if (toPayFor.length === 0) {
    return NextResponse.json({ error: 'You already have active access to all these courses.' }, { status: 400 })
  }

  // Compute discount
  const count = toPayFor.length
  let discountRate = 0
  if (count >= 5) discountRate = 0.15
  else if (count >= 3) discountRate = 0.1
  else discountRate = 0

  const total = toPayFor.reduce((sum, c) => sum + c.courseFee, 0)
  const discount = Math.round(total * discountRate * 100) / 100
  const finalAmount = Math.round((total - discount) * 100) / 100

  // Create a single Payment record with bulkCourseIds
  const reference = `ABA-BULK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const bulkCourseIds = toPayFor.map((c) => c.id).join(',')

  await db.payment.create({
    data: {
      userId: user.id,
      courseId: null, // null for bulk — individual courseIds are in bulkCourseIds
      amount: finalAmount,
      provider: providerNorm,
      reference,
      status: 'pending',
      bulkCourseIds,
    },
  })

  // Demo mode: if secret key not configured, return a simulated checkout URL
  if (providerNorm === 'paystack') {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return NextResponse.json({
        reference,
        amount: finalAmount,
        provider: 'paystack',
        authorization_url: `/course-cart?ref=${reference}`,
        demo: true,
        courseIds: toPayFor.map((c) => c.id),
      })
    }
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(finalAmount * 100), // Paystack expects kobo
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?view=course-cart&ref=${reference}`,
        metadata: {
          userId: user.id,
          provider: 'paystack',
          type: 'bulk_course_access',
          courseIds: toPayFor.map((c) => c.id),
          finalAmount,
        },
      }),
    })
    const data = await res.json()
    if (!data.status) return NextResponse.json({ error: data.message || 'Paystack init failed' }, { status: 500 })
    return NextResponse.json({
      reference,
      amount: finalAmount,
      provider: 'paystack',
      authorization_url: data.data.authorization_url,
      courseIds: toPayFor.map((c) => c.id),
    })
  }

  // Flutterwave
  const flwSecret = process.env.FLW_SECRET_KEY
  if (!flwSecret) {
    return NextResponse.json({
      reference,
      amount: finalAmount,
      provider: 'flutterwave',
      authorization_url: `/course-cart?ref=${reference}`,
      demo: true,
      courseIds: toPayFor.map((c) => c.id),
    })
  }
  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${flwSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount: finalAmount,
      currency: 'NGN',
      customer: { email: user.email, name: user.name },
      payment_options: 'card,banktransfer,ussd,account',
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?view=course-cart&ref=${reference}`,
      meta: {
        userId: user.id,
        provider: 'flutterwave',
        type: 'bulk_course_access',
        courseIds: toPayFor.map((c) => c.id),
        finalAmount,
      },
      customizations: {
        title: 'Al-Bashir Academy — Bulk Course Access',
        description: `Access to ${toPayFor.length} course(s)`,
        logo: '/icon-192.png?v=2',
      },
    }),
  })
  const data = await res.json()
  if (data.status !== 'success') return NextResponse.json({ error: data.message || 'Flutterwave init failed' }, { status: 500 })
  return NextResponse.json({
    reference,
    amount: finalAmount,
    provider: 'flutterwave',
    authorization_url: data.data.link,
    courseIds: toPayFor.map((c) => c.id),
  })
}
