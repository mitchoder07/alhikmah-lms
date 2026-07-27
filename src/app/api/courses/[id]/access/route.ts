import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

// GET: Check if the current user has active access to a paid course
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      isPaid: true,
      courseFee: true,
      accessDurationMonths: true,
    },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // If course is free, the user inherently has access
  if (!course.isPaid) {
    return NextResponse.json({
      hasAccess: true,
      course: {
        isPaid: course.isPaid,
        courseFee: course.courseFee,
        accessDurationMonths: course.accessDurationMonths,
      },
    })
  }

  // Check for an active (non-expired) CourseAccess record
  const access = await db.courseAccess.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: id } },
  })

  const now = new Date()
  let hasAccess = false
  let expiresAt: string | undefined

  if (access) {
    if (access.isActive && access.expiresAt > now) {
      hasAccess = true
      expiresAt = access.expiresAt.toISOString()
    } else if (access.isActive && access.expiresAt <= now) {
      // Mark as inactive since it has expired
      await db.courseAccess.update({
        where: { id: access.id },
        data: { isActive: false },
      })
    }
  }

  return NextResponse.json({
    hasAccess,
    expiresAt,
    course: {
      isPaid: course.isPaid,
      courseFee: course.courseFee,
      accessDurationMonths: course.accessDurationMonths,
    },
  })
}

// POST: Initiate payment for course access (similar to certificate payment flow)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const provider: 'paystack' | 'flutterwave' = body?.provider === 'flutterwave' ? 'flutterwave' : 'paystack'

  const course = await db.course.findUnique({ where: { id } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (!course.isPaid) {
    return NextResponse.json({ error: 'This course is free. No payment required.' }, { status: 400 })
  }

  // If user already has active access, no need to pay again
  const existing = await db.courseAccess.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: id } },
  })
  if (existing && existing.isActive && existing.expiresAt > new Date()) {
    return NextResponse.json({
      error: 'You already have active access to this course.',
      hasAccess: true,
      expiresAt: existing.expiresAt.toISOString(),
    }, { status: 400 })
  }

  const amount = course.courseFee
  const reference = `ABA-COURSE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

  await db.payment.create({
    data: {
      userId: user.id,
      courseId,
      amount,
      provider,
      reference,
      status: 'pending',
    },
  })

  // Demo mode: if Paystack/Flutterwave secret not configured, return a simulated checkout URL
  if (provider === 'paystack') {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return NextResponse.json({
        reference,
        amount,
        provider: 'paystack',
        authorization_url: `/course-checkout?ref=${reference}`,
        demo: true,
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
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?view=course-checkout&ref=${reference}`,
        metadata: { courseId, userId: user.id, provider: 'paystack', type: 'course_access' },
      }),
    })
    const data = await res.json()
    if (!data.status) return NextResponse.json({ error: data.message || 'Paystack init failed' }, { status: 500 })
    return NextResponse.json({ reference, amount, provider: 'paystack', authorization_url: data.data.authorization_url })
  }

  // Flutterwave
  const flwSecret = process.env.FLW_SECRET_KEY
  if (!flwSecret) {
    return NextResponse.json({
      reference,
      amount,
      provider: 'flutterwave',
      authorization_url: `/course-checkout?ref=${reference}`,
      demo: true,
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
      amount,
      currency: 'NGN',
      customer: { email: user.email, name: user.name },
      payment_options: 'card,banktransfer,ussd,account',
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?view=course-checkout&ref=${reference}`,
      meta: { courseId, userId: user.id, provider: 'flutterwave', type: 'course_access' },
      customizations: {
        title: 'Al-Bashir Academy LMS Course Access',
        description: `Course access fee for ${course.code}`,
        logo: '/icon-192.png',
      },
    }),
  })
  const data = await res.json()
  if (data.status !== 'success') return NextResponse.json({ error: data.message || 'Flutterwave init failed' }, { status: 500 })
  return NextResponse.json({ reference, amount, provider: 'flutterwave', authorization_url: data.data.link })
}
