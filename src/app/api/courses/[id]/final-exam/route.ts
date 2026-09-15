import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { gradeObjective, markAttemptWithAi, questionType } from '@/lib/grading'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET — fetch the final exam for a course (student view)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exam = await db.finalExam.findUnique({
    where: { courseId: id },
    include: {
      questions: { orderBy: { position: 'asc' } },
      attempts: { where: { userId: user.id }, orderBy: { startedAt: 'desc' } },
    },
  })

  if (!exam) return NextResponse.json({ exam: null })

  // Correct answers and marking guides are never sent to the client
  const safeExam = {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    passMark: exam.passMark,
    timeLimit: exam.timeLimit,
    maxAttempts: exam.maxAttempts,
    questions: exam.questions.map(q => ({
      id: q.id,
      text: q.text,
      type: questionType(q),
      options: JSON.parse(q.options || '[]'),
      marks: q.marks,
      imageUrl: q.imageUrl,
    })),
    attempts: exam.attempts.map(a => ({
      id: a.id,
      score: a.score,
      totalMarks: a.totalMarks,
      passed: a.passed,
      reviewStatus: a.reviewStatus,
      completedAt: a.completedAt,
    })),
  }

  return NextResponse.json({ exam: safeExam })
}

// POST — submit final exam answers
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { answers } = body as { answers: Record<string, string> }

  const exam = await db.finalExam.findUnique({
    where: { courseId: id },
    include: { questions: { orderBy: { position: 'asc' } } },
  })
  if (!exam) return NextResponse.json({ error: 'No final exam for this course' }, { status: 404 })

  // Check attempt limit
  const attemptCount = await db.finalExamAttempt.count({
    where: { examId: exam.id, userId: user.id }
  })
  if (attemptCount >= exam.maxAttempts) {
    return NextResponse.json({ error: `You have used all ${exam.maxAttempts} attempts.` }, { status: 403 })
  }

  const { items, totals } = gradeObjective(exam.questions, answers)
  const essayCount = exam.questions.filter((q) => questionType(q) === 'ESSAY').length
  const passed = totals.percent >= exam.passMark

  const attempt = await db.finalExamAttempt.create({
    data: {
      examId: exam.id,
      userId: user.id,
      score: totals.score,
      totalMarks: totals.totalMarks,
      passed,
      completedAt: new Date(),
      answers: JSON.stringify(answers),
      gradingMode: essayCount ? 'AI' : 'AUTO',
      reviewStatus: essayCount ? 'PENDING' : 'AUTO',
      graded: JSON.stringify(items),
    }
  })

  let reviewStatus = attempt.reviewStatus
  let markingError: string | undefined

  if (essayCount) {
    const marked = await markAttemptWithAi('exam', attempt.id, { items, totals })
    reviewStatus = marked.reviewStatus
    markingError = marked.error
  }

  const finalAttempt = await db.finalExamAttempt.findUnique({ where: { id: attempt.id } })
  const finalScore = finalAttempt?.score ?? totals.score
  const finalTotal = finalAttempt?.totalMarks ?? totals.totalMarks
  const finalPercent = finalTotal ? Math.round((finalScore / finalTotal) * 100) : 0
  const released = reviewStatus !== 'PENDING'

  // Only a released result counts towards the certificate. Attempts with essay
  // questions wait for the lecturer's review (which syncs the enrollment).
  if (released && finalPercent >= exam.passMark) {
    const enrollment = await db.enrollment.findFirst({ where: { courseId: id, userId: user.id } })
    if (enrollment) {
      await db.enrollment.update({
        where: { id: enrollment.id },
        data: { finalScore: finalPercent, completedAt: new Date() },
      })
    }
  }

  return NextResponse.json({
    attempt: finalAttempt ?? attempt,
    score: finalScore,
    totalMarks: finalTotal,
    percent: finalPercent,
    passed: released ? finalPercent >= exam.passMark : false,
    reviewStatus,
    awaitingReview: !released,
    ...(markingError ? { markingNote: markingError } : {}),
  })
}
