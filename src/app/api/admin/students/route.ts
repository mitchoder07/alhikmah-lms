import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const students = await db.user.findMany({
    where: {
      role: 'STUDENT',
      ...(q ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { matricNumber: { contains: q } },
        ]
      } : {})
    },
    include: {
      enrollments: { include: { course: { select: { code: true, title: true } } } },
      _count: { select: { payments: true, certificates: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ students })
}
