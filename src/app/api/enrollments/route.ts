import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ enrollments: [] })
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          lecturer: { select: { id: true, name: true, signatureUrl: true } },
          modules: { include: { lessons: { include: { progress: { where: { userId: user.id } } } } } },
        },
      },
      certificate: true,
    },
    orderBy: { enrolledAt: 'desc' },
  })
  // The administrator's uploaded signature belongs to the Director block on certificates.
  const director = await db.user.findFirst({
    where: { role: 'ADMIN', signatureUrl: { not: null } },
    select: { name: true, signatureUrl: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json({ enrollments, director })
}
