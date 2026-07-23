import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Issue certificate manually (admin)
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

  const enrollment = await db.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  const certNumber = `AHK-CERT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
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
