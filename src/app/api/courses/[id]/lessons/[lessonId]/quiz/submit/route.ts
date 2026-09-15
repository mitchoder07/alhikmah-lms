import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { gradeObjective, markAttemptWithAi, questionType } from '@/lib/grading'

export const runtime = 'nodejs'
export const maxDuration = 60

// Submit a quiz attempt.
//
// MCQ answers are graded deterministically here. The client sends the SELECTED
// OPTION TEXT (not the index) so grading is unaffected by client-side shuffling.
//
// Request body:
//   { quizId: string, answers: Record<string, string> }
// where `answers` maps questionId -> selected option text (MCQ) or the typed
// answer (ESSAY).
//
// If the quiz contains essay questions the AI marks them against each question's
// marking guide and the attempt is held as PENDING until a lecturer reviews it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { lessonId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { quizId, answers } = body as { quizId: string; answers: Record<string, string> }

  if (!quizId) return NextResponse.json({ error: 'quizId required' }, { status: 400 })
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'answers must be an object mapping questionId to the answer given' }, { status: 400 })
  }

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { position: 'asc' } } },
  })
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  // Sanity check: quiz belongs to the lesson in the route
  if (quiz.lessonId !== lessonId) {
    return NextResponse.json({ error: 'Quiz does not belong to this lesson' }, { status: 400 })
  }

  const { items, totals } = gradeObjective(quiz.questions, answers)
  const essayCount = quiz.questions.filter((q) => questionType(q) === 'ESSAY').length
  const percent = totals.percent
  const passed = percent >= quiz.passMark

  const attempt = await db.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      score: totals.score,
      totalMarks: totals.totalMarks,
      passed,
      completedAt: new Date(),
      answers: JSON.stringify(answers),
      gradingMode: essayCount ? 'AI' : 'AUTO',
      reviewStatus: essayCount ? 'PENDING' : 'AUTO',
      graded: JSON.stringify(items),
    },
  })

  let reviewStatus = attempt.reviewStatus
  let markingError: string | undefined

  if (essayCount) {
    const marked = await markAttemptWithAi('quiz', attempt.id, { items, totals })
    reviewStatus = marked.reviewStatus
    markingError = marked.error
  }

  const finalAttempt = await db.quizAttempt.findUnique({ where: { id: attempt.id } })
  const finalScore = finalAttempt?.score ?? totals.score
  const finalTotal = finalAttempt?.totalMarks ?? totals.totalMarks
  const finalPercent = finalTotal ? Math.round((finalScore / finalTotal) * 100) : 0

  return NextResponse.json({
    attempt: finalAttempt ?? attempt,
    score: finalScore,
    totalMarks: finalTotal,
    percent: finalPercent,
    // A pending essay mark is not released to the student until a lecturer approves it
    passed: reviewStatus === 'PENDING' ? false : finalPercent >= quiz.passMark,
    reviewStatus,
    awaitingReview: reviewStatus === 'PENDING',
    ...(markingError ? { markingNote: markingError } : {}),
    graded: items,
  })
}
