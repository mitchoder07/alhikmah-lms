import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  const course = await db.course.findUnique({
    where: { id },
    include: {
      lecturer: { select: { id: true, name: true, email: true } },
      modules: {
        include: {
          lessons: {
            include: {
              files: true,
              quizzes: { include: { questions: true } },
              progress: user ? { where: { userId: user.id } } : false,
            },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { position: 'asc' },
      },
      enrollments: user ? { where: { userId: user.id }, include: { certificate: true } } : false,
      announcements: { include: { author: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Never ship answers or essay marking guides to the student client — grading
  // happens on the server against the stored values.
  const safeCourse = {
    ...course,
    modules: course.modules.map(m => ({
      ...m,
      lessons: m.lessons.map(l => ({
        ...l,
        quizzes: l.quizzes.map(q => ({
          ...q,
          questions: q.questions.map(({ answer, rubric, ...rest }) => ({ ...rest, type: rest.type || 'MCQ' })),
        })),
      })),
    })),
  }

  return NextResponse.json({ course: safeCourse })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const {
    code, title, description, level, semester, creditUnit,
    certificateFee, passMark, thumbnailUrl, isPublished,
    // Paid course fields
    isPaid, courseFee, accessDurationMonths, allowDownload, watermarkMaterials,
    // Live class fields (allowed to be patched too)
    liveClassUrl, liveClassTitle, liveClassScheduledAt,
    lecturerId,
  } = body

  const data: Record<string, unknown> = {}
  if (code !== undefined) data.code = code
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (level !== undefined) data.level = level
  if (semester !== undefined) data.semester = semester
  if (creditUnit !== undefined) data.creditUnit = Number(creditUnit)
  if (certificateFee !== undefined) data.certificateFee = Number(certificateFee)
  if (passMark !== undefined) data.passMark = Number(passMark)
  if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl
  if (isPublished !== undefined) data.isPublished = Boolean(isPublished)
  // Paid course fields
  if (isPaid !== undefined) data.isPaid = Boolean(isPaid)
  if (courseFee !== undefined) data.courseFee = Number(courseFee)
  if (accessDurationMonths !== undefined) data.accessDurationMonths = Number(accessDurationMonths)
  if (allowDownload !== undefined) data.allowDownload = Boolean(allowDownload)
  if (watermarkMaterials !== undefined) data.watermarkMaterials = Boolean(watermarkMaterials)
  // Live class fields
  if (liveClassUrl !== undefined) data.liveClassUrl = liveClassUrl
  if (liveClassTitle !== undefined) data.liveClassTitle = liveClassTitle
  if (liveClassScheduledAt !== undefined) data.liveClassScheduledAt = liveClassScheduledAt ? new Date(liveClassScheduledAt) : null
  if (lecturerId !== undefined) data.lecturerId = lecturerId

  const course = await db.course.update({ where: { id }, data })
  return NextResponse.json({ course })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  await db.course.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
