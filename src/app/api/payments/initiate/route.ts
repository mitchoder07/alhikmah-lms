import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import crypto from 'crypto'

// Initialize payment — supports 'paystack' or 'flutterwave' provider
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { enrollmentId, courseId, provider } = body as { enrollmentId: string; courseId: string; provider: 'paystack' | 'flutterwave' }
  if (!enrollmentId || !courseId) return NextResponse.json({ error: 'enrollmentId and courseId required' }, { status: 400 })

  const providerNorm: 'paystack' | 'flutterwave' = provider === 'flutterwave' ? 'flutterwave' : 'paystack'

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true }
  })
  if (!enrollment || enrollment.userId !== user.id) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  // Certification eligibility check
  if (!enrollment.lecturerApproved) {
    return NextResponse.json({ error: 'Lecturer has not approved you for certification yet. Complete all lessons and pass the final exam.' }, { status: 403 })
  }
  if (enrollment.finalScore !== null && enrollment.course.passMark && enrollment.finalScore < enrollment.course.passMark) {
    return NextResponse.json({ error: `You must score at least ${enrollment.course.passMark}% on the final exam. Your score: ${enrollment.finalScore}%` }, { status: 403 })
  }
  // Check if course has a final exam and student has passed it
  const finalExam = await db.finalExam.findUnique({ where: { courseId: enrollment.courseId } })
  if (finalExam) {
    const passedAttempt = await db.finalExamAttempt.findFirst({
      where: { examId: finalExam.id, userId: user.id, passed: true },
      orderBy: { startedAt: 'desc' },
    })
    if (!passedAttempt) {
      return NextResponse.json({ error: 'You must pass the final exam before paying for your certificate.' }, { status: 403 })
    }
  }

  const amount = enrollment.course.certificateFee
  const reference = providerNorm === 'paystack'
    ? `AHK-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    : `AHK-FLW-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

  await db.payment.create({
    data: {
      userId: user.id,
      enrollmentId,
      courseId,
      amount,
      provider: providerNorm,
      reference,
      status: 'pending',
    }
  })

  // Demo mode: if secret key not configured, return a simulated checkout URL
  if (providerNorm === 'paystack') {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return NextResponse.json({
        reference,
        amount,
        provider: 'paystack',
        authorization_url: `/checkout?ref=${reference}`,
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
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?view=checkout&ref=${reference}`,
        metadata: { enrollmentId, courseId, userId: user.id, provider: 'paystack' },
      })
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
      authorization_url: `/checkout?ref=${reference}`,
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
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/?view=checkout&ref=${reference}`,
      meta: { enrollmentId, courseId, userId: user.id, provider: 'flutterwave' },
      customizations: {
        title: 'Al-Hikmah LMS Certificate',
        description: `Certificate fee for ${enrollment.course.code}`,
        logo: '/icon-192.png',
      },
    })
  })
  const data = await res.json()
  if (data.status !== 'success') return NextResponse.json({ error: data.message || 'Flutterwave init failed' }, { status: 500 })
  return NextResponse.json({ reference, amount, provider: 'flutterwave', authorization_url: data.data.link })
}
