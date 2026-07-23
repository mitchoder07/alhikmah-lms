import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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

  // Don't send the correct answers to the client
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
      options: JSON.parse(q.options),
      marks: q.marks,
    })),
    attempts: exam.attempts.map(a => ({
      id: a.id,
      score: a.score,
      totalMarks: a.totalMarks,
      passed: a.passed,
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

  // Grade by comparing selected option TEXT (not index) — supports shuffled options
  let score = 0
  let totalMarks = 0
  for (const q of exam.questions) {
    totalMarks += q.marks
    const userAnswerText = answers[q.id]
    if (userAnswerText !== undefined) {
      const options: string[] = JSON.parse(q.options)
      const correctAnswerText = options[Number(q.answer)]
      if (userAnswerText.trim().toLowerCase() === correctAnswerText.trim().toLowerCase()) {
        score += q.marks
      }
    }
  }
  const percent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0
  const passed = percent >= exam.passMark

  const attempt = await db.finalExamAttempt.create({
    data: {
      examId: exam.id,
      userId: user.id,
      score,
      totalMarks,
      passed,
      completedAt: new Date(),
      answers: JSON.stringify(answers),
    }
  })

  // If passed, update the enrollment finalScore
  if (passed) {
    const enrollment = await db.enrollment.findFirst({ where: { courseId: id, userId: user.id } })
    if (enrollment) {
      await db.enrollment.update({
        where: { id: enrollment.id },
        data: { finalScore: percent, completedAt: new Date() },
      })
    }
  }

  return NextResponse.json({ attempt, score, totalMarks, percent, passed })
}
