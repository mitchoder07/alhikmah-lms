import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStaffUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Attempts a lecturer/admin can review: every lesson quiz attempt and final exam
// attempt in the courses they teach (all courses for an admin). Filters:
//   ?status=PENDING|REVIEWED|AUTO  ?courseId=  ?studentId=  ?kind=quiz|exam  ?limit=

export async function GET(req: NextRequest) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const courseId = searchParams.get('courseId')
  const studentId = searchParams.get('studentId')
  const kind = searchParams.get('kind')
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 300)

  const courseWhere =
    user.role === 'ADMIN'
      ? courseId
        ? { id: courseId }
        : {}
      : courseId
        ? { id: courseId, lecturerId: user.id }
        : { lecturerId: user.id }

  const [quizzes, exams] = await Promise.all([
    kind === 'exam'
      ? Promise.resolve([])
      : db.quiz.findMany({
          where: { lesson: { module: { course: courseWhere } } },
          select: { id: true },
        }),
    kind === 'quiz'
      ? Promise.resolve([])
      : db.finalExam.findMany({
          where: { course: courseWhere },
          select: { id: true },
        }),
  ])

  const quizIds = quizzes.map((q) => q.id)
  const examIds = exams.map((e) => e.id)
  const reviewWhere = {
    ...(status ? { reviewStatus: status } : {}),
    ...(studentId ? { userId: studentId } : {}),
  }

  const [quizAttempts, examAttempts] = await Promise.all([
    quizIds.length
      ? db.quizAttempt.findMany({
          where: { quizId: { in: quizIds }, ...reviewWhere },
          include: {
            user: { select: { id: true, name: true, email: true, matricNumber: true } },
            quiz: {
              select: {
                id: true,
                title: true,
                passMark: true,
                lesson: { select: { title: true, module: { select: { course: { select: { id: true, code: true, title: true } } } } } },
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: limit,
        })
      : Promise.resolve([]),
    examIds.length
      ? db.finalExamAttempt.findMany({
          where: { examId: { in: examIds }, ...reviewWhere },
          include: {
            user: { select: { id: true, name: true, email: true, matricNumber: true } },
            exam: { select: { id: true, title: true, passMark: true, course: { select: { id: true, code: true, title: true } } } },
          },
          orderBy: { startedAt: 'desc' },
          take: limit,
        })
      : Promise.resolve([]),
  ])

  const attempts = [
    ...quizAttempts.map((a) => ({
      id: a.id,
      kind: 'quiz' as const,
      title: a.quiz.title,
      lessonTitle: a.quiz.lesson.title,
      passMark: a.quiz.passMark,
      course: a.quiz.lesson.module.course,
      student: a.user,
      score: a.score,
      totalMarks: a.totalMarks,
      percent: a.totalMarks ? Math.round((a.score / a.totalMarks) * 100) : 0,
      passed: a.passed,
      reviewStatus: a.reviewStatus,
      gradingMode: a.gradingMode,
      aiScore: a.aiScore,
      aiMarkedAt: a.aiMarkedAt,
      reviewedAt: a.reviewedAt,
      reviewNote: a.reviewNote,
      submittedAt: a.completedAt ?? a.startedAt,
    })),
    ...examAttempts.map((a) => ({
      id: a.id,
      kind: 'exam' as const,
      title: a.exam.title,
      lessonTitle: null,
      passMark: a.exam.passMark,
      course: a.exam.course,
      student: a.user,
      score: a.score,
      totalMarks: a.totalMarks,
      percent: a.totalMarks ? Math.round((a.score / a.totalMarks) * 100) : 0,
      passed: a.passed,
      reviewStatus: a.reviewStatus,
      gradingMode: a.gradingMode,
      aiScore: a.aiScore,
      aiMarkedAt: a.aiMarkedAt,
      reviewedAt: a.reviewedAt,
      reviewNote: a.reviewNote,
      submittedAt: a.completedAt ?? a.startedAt,
    })),
  ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const pending = attempts.filter((a) => a.reviewStatus === 'PENDING').length

  return NextResponse.json({ attempts, pending, total: attempts.length })
}
