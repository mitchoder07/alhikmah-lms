import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET — full academic transcript for a student (admin/lecturer only)
//
// Returns:
//   { student: { id, name, email, matricNumber, department },
//     enrollments: [{
//       id, courseCode, courseTitle, creditUnit, level, semester,
//       quizAverage,        // average % across all quiz attempts for this course
//       finalExamScore,     // best final-exam attempt % (or null)
//       finalScore,         // lecturer-assigned final score (enrollment.finalScore)
//       grade,              // A/B/C/D/F computed from finalScore (or null if not finalized)
//       gradePoint,         // 5/4/3/2/0 (or null)
//       certificateStatus,  // 'Issued' | 'Eligible' | 'Pending'
//       certificateNumber,  // if issued
//       enrolledAt,
//       completedAt,
//     }],
//     gpa,                  // weighted GPA (0.00 - 5.00) across finalized enrollments
//     totals }
//
// Grading scale:
//   A >= 70 (5 points), B >= 60 (4), C >= 50 (3), D >= 40 (2), F < 40 (0)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const student = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      matricNumber: true,
      department: true,
    },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  // Pull every enrollment with its course + certificate
  const enrollments = await db.enrollment.findMany({
    where: { userId: id },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          creditUnit: true,
          level: true,
          semester: true,
        },
      },
      certificate: { select: { certificateNumber: true, issuedAt: true } },
    },
    orderBy: { enrolledAt: 'asc' },
  })

  // Pull all quiz attempts for the student (with course linkage through quiz→lesson→module)
  const quizAttempts = await db.quizAttempt.findMany({
    where: { userId: id },
    select: {
      score: true,
      totalMarks: true,
      quiz: {
        select: {
          lesson: {
            select: {
              module: { select: { courseId: true } },
            },
          },
        },
      },
    },
  })

  // Pull all final-exam attempts for the student (with course linkage through exam→course)
  const finalExamAttempts = await db.finalExamAttempt.findMany({
    where: { userId: id },
    select: {
      score: true,
      totalMarks: true,
      exam: { select: { courseId: true } },
    },
  })

  // Helper: compute letter grade from a percentage score
  const gradeFor = (score: number | null | undefined): { grade: string | null; gradePoint: number | null } => {
    if (score === null || score === undefined || Number.isNaN(score)) return { grade: null, gradePoint: null }
    if (score >= 70) return { grade: 'A', gradePoint: 5 }
    if (score >= 60) return { grade: 'B', gradePoint: 4 }
    if (score >= 50) return { grade: 'C', gradePoint: 3 }
    if (score >= 40) return { grade: 'D', gradePoint: 2 }
    return { grade: 'F', gradePoint: 0 }
  }

  // Group quiz attempts by courseId → average percentage
  const quizSumByCourse = new Map<string, number>()
  const quizCountByCourse = new Map<string, number>()
  for (const a of quizAttempts) {
    const courseId = a.quiz?.lesson?.module?.courseId
    if (!courseId) continue
    const pct = a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0
    quizSumByCourse.set(courseId, (quizSumByCourse.get(courseId) ?? 0) + pct)
    quizCountByCourse.set(courseId, (quizCountByCourse.get(courseId) ?? 0) + 1)
  }
  const quizAvgMap = new Map<string, number>()
  for (const [courseId, sum] of quizSumByCourse.entries()) {
    const count = quizCountByCourse.get(courseId) ?? 0
    quizAvgMap.set(courseId, count > 0 ? Math.round(sum / count) : 0)
  }

  // Group final-exam attempts by courseId → best percentage
  const finalExamBestByCourse = new Map<string, number>()
  for (const a of finalExamAttempts) {
    const courseId = a.exam?.courseId
    if (!courseId) continue
    const pct = a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0
    const prev = finalExamBestByCourse.get(courseId)
    if (prev === undefined || pct > prev) finalExamBestByCourse.set(courseId, Math.round(pct))
  }

  // Build the enrollments payload + compute GPA
  let totalQualityPoints = 0
  let totalCreditUnits = 0

  const enrollmentRows = enrollments.map((en) => {
    const quizAverage = quizAvgMap.get(en.course.id) ?? null
    const finalExamScore = finalExamBestByCourse.get(en.course.id) ?? null
    const finalScore = en.finalScore
    const { grade, gradePoint } = gradeFor(finalScore)

    // Certificate status
    let certificateStatus: 'Issued' | 'Eligible' | 'Pending' = 'Pending'
    if (en.certificate) {
      certificateStatus = 'Issued'
    } else if (en.completedAt && en.lecturerApproved) {
      certificateStatus = 'Eligible'
    }

    // Accumulate GPA — only count finalized (completed) enrollments with a numeric finalScore
    if (gradePoint !== null && en.completedAt) {
      totalQualityPoints += gradePoint * en.course.creditUnit
      totalCreditUnits += en.course.creditUnit
    }

    return {
      id: en.id,
      courseCode: en.course.code,
      courseTitle: en.course.title,
      creditUnit: en.course.creditUnit,
      level: en.course.level,
      semester: en.course.semester,
      quizAverage,
      finalExamScore,
      finalScore,
      grade,
      gradePoint,
      certificateStatus,
      certificateNumber: en.certificate?.certificateNumber ?? null,
      enrolledAt: en.enrolledAt.toISOString(),
      completedAt: en.completedAt ? en.completedAt.toISOString() : null,
    }
  })

  const gpa = totalCreditUnits > 0 ? Number((totalQualityPoints / totalCreditUnits).toFixed(2)) : null

  return NextResponse.json({
    student,
    enrollments: enrollmentRows,
    gpa,
    totals: {
      coursesEnrolled: enrollmentRows.length,
      coursesCompleted: enrollmentRows.filter((r) => r.completedAt).length,
      certificatesIssued: enrollmentRows.filter((r) => r.certificateStatus === 'Issued').length,
      totalCreditUnits,
    },
  })
}
