import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Submit a quiz attempt.
//
// IMPORTANT (randomization support): Quiz questions and their options may be
// shuffled on the client side when displayed to students. To make grading
// robust regardless of shuffle order, the client now sends the SELECTED OPTION
// TEXT (not the index) for each question.
//
// Request body:
//   { quizId: string, answers: Record<string, string> }
// where `answers` maps questionId -> selected option text.
//
// Grading compares the selected text to the correct option text (parsed from
// the JSON options array). This way, no matter how the options were shuffled
// on the client, the grading is correct.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { lessonId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { quizId, answers } = body as { quizId: string; answers: Record<string, string> }

  if (!quizId) return NextResponse.json({ error: 'quizId required' }, { status: 400 })
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'answers must be an object mapping questionId to selected option text' }, { status: 400 })
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

  let score = 0
  let totalMarks = 0
  const gradedAnswers: Record<string, { selected: string; correct: string; isCorrect: boolean }> = {}

  for (const q of quiz.questions) {
    totalMarks += q.marks

    // Parse options JSON array
    let options: string[] = []
    try {
      options = JSON.parse(q.options)
    } catch {
      options = []
    }

    // Determine the correct option TEXT
    const correctIndex = parseInt(q.answer, 10)
    const correctText = Number.isNaN(correctIndex) ? q.answer : (options[correctIndex] ?? q.answer)

    const selectedText = answers[q.id]

    // Compare by text (trimmed, case-insensitive) so shuffle order doesn't matter
    const isCorrect =
      typeof selectedText === 'string' &&
      selectedText.trim().toLowerCase() === String(correctText).trim().toLowerCase()

    if (isCorrect) {
      score += q.marks
    }

    gradedAnswers[q.id] = {
      selected: typeof selectedText === 'string' ? selectedText : '',
      correct: String(correctText),
      isCorrect,
    }
  }

  const percent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0
  const passed = percent >= quiz.passMark

  const attempt = await db.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      score,
      totalMarks,
      passed,
      completedAt: new Date(),
      answers: JSON.stringify(answers),
    },
  })

  return NextResponse.json({ attempt, score, totalMarks, percent, passed, graded: gradedAnswers })
}
