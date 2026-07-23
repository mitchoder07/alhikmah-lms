import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  const where = user?.role === 'STUDENT' ? { isPublished: true } : {}
  const courses = await db.course.findMany({
    where,
    include: {
      lecturer: { select: { id: true, name: true, email: true } },
      modules: { include: { lessons: true }, orderBy: { position: 'asc' } },
      _count: { select: { enrollments: true } },
    },
    // Note: paid course fields (isPaid, courseFee, accessDurationMonths,
    // allowDownload, watermarkMaterials) are scalar columns on Course and are
    // returned automatically by findMany — no need to select them explicitly.
    orderBy: { code: 'asc' },
  })
  return NextResponse.json({ courses })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const {
    code, title, description, level, semester, creditUnit,
    certificateFee, passMark, thumbnailUrl,
    isPaid, courseFee, accessDurationMonths, allowDownload, watermarkMaterials,
  } = body
  if (!code || !title) return NextResponse.json({ error: 'Code and title required' }, { status: 400 })

  const exists = await db.course.findUnique({ where: { code } })
  if (exists) return NextResponse.json({ error: 'Course code already exists' }, { status: 400 })

  const course = await db.course.create({
    data: {
      code,
      title,
      description: description || '',
      level: level || '200',
      semester: semester || 'First',
      creditUnit: Number(creditUnit) || 2,
      certificateFee: Number(certificateFee) || 5000,
      passMark: Number(passMark) || 50,
      thumbnailUrl,
      lecturerId: user.id,
      isPublished: true,
      // Paid course fields
      isPaid: Boolean(isPaid),
      courseFee: Number(courseFee) || 0,
      accessDurationMonths: Number(accessDurationMonths) || 6,
      allowDownload: Boolean(allowDownload),
      watermarkMaterials: watermarkMaterials === undefined ? true : Boolean(watermarkMaterials),
    }
  })
  return NextResponse.json({ course })
}
