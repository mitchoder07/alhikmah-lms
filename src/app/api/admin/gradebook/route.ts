import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET gradebook: students × courses matrix
export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const students = await db.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      enrollments: {
        include: {
          course: { select: { id: true, code: true, title: true } },
          certificate: true,
        }
      },
      quizAttempts: { include: { quiz: { include: { lesson: { include: { module: { select: { courseId: true } } } } } } } },
    },
    orderBy: { name: 'asc' },
  })
  const courses = await db.course.findMany({ select: { id: true, code: true, title: true }, orderBy: { code: 'asc' } })
  return NextResponse.json({ students, courses })
}
