import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public verification — no auth required.
// Certificate model has no direct `course` relation (only `enrollment` + `user`),
// so we resolve course data through the enrollment relation.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const certNumber = searchParams.get('cert')
    if (!certNumber) {
      return NextResponse.json({ error: 'Certificate number required' }, { status: 400 })
    }

    const cert = await db.certificate.findUnique({
      where: { certificateNumber: certNumber.toUpperCase() },
      include: {
        user: { select: { name: true, email: true, matricNumber: true, department: true } },
        enrollment: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                creditUnit: true,
                lecturer: { select: { name: true, signatureUrl: true } },
              },
            },
          },
        },
      },
    })

    if (!cert || !cert.enrollment?.course) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const course = cert.enrollment.course
    const director = await db.user.findFirst({
      where: { role: 'ADMIN', signatureUrl: { not: null } },
      select: { name: true, signatureUrl: true },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      certificate: {
        certificateNumber: cert.certificateNumber,
        issuedAt: cert.issuedAt,
        score: cert.score,
        verified: cert.verified,
        studentName: cert.user.name,
        matricNumber: cert.user.matricNumber,
        department: cert.user.department,
        courseCode: course.code,
        courseTitle: course.title,
        creditUnit: course.creditUnit,
        lecturerName: course.lecturer.name,
        lecturerSignatureUrl: course.lecturer.signatureUrl ?? null,
        directorName: director?.name ?? 'Director',
        directorSignatureUrl: director?.signatureUrl ?? null,
      },
    })
  } catch (err) {
    console.error('[certificates/verify] error:', err)
    return NextResponse.json({ error: 'Failed to verify certificate' }, { status: 500 })
  }
}
