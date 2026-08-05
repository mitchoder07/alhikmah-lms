import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Issue certificate manually (admin/lecturer).
//
// BLOCKS issuance if the course has a certificateFee > 0 AND the student
// has no successful Payment record for this enrollment. This prevents
// lecturers from accidentally issuing certificates to students who haven't
// paid the certificate fee.
//
// The auto-issue flow (via /api/payments/verify after successful payment)
// is NOT affected — it creates the certificate directly, bypassing this check.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const { enrollmentId, score } = body
  if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 })

  const existing = await db.certificate.findUnique({ where: { enrollmentId } })
  if (existing) return NextResponse.json({ certificate: existing })

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true },
  })
  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  // === Payment gate ===
  // If the course charges a certificate fee, the student MUST have a successful
  // payment record before a certificate can be manually issued.
  if (enrollment.course.certificateFee > 0) {
    const successfulPayment = await db.payment.findFirst({
      where: {
        userId: enrollment.userId,
        enrollmentId: enrollment.id,
        status: 'success',
      },
    })
    if (!successfulPayment) {
      return NextResponse.json(
        {
          error: `Student has not paid the certificate fee (₦${enrollment.course.certificateFee.toLocaleString()}). The student must pay via their "My Certificates" page before a certificate can be issued.`,
        },
        { status: 402 },
      )
    }
  }

  const certNumber = `ABA-CERT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const cert = await db.certificate.create({
    data: {
      enrollmentId,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      certificateNumber: certNumber,
      score: Number(score) || enrollment.finalScore || 0,
      verified: true,
    }
  })
  return NextResponse.json({ certificate: cert })
}
