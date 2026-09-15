import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { questionType } from '@/lib/grading'

interface IncomingQuestion {
  text: string
  options?: string[]
  answer?: number | string
  marks?: number
  imageUrl?: string | null
  type?: string
  rubric?: string | null
}

// GET — fetch quiz by lessonId (for editing)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get('lessonId')
    if (!lessonId) return NextResponse.json({ quiz: null })

    const quiz = await db.quiz.findFirst({
      where: { lessonId },
      include: { questions: { orderBy: { position: 'asc' } } },
    })

    if (!quiz) return NextResponse.json({ quiz: null })

    return NextResponse.json({
      quiz: {
        ...quiz,
        questions: quiz.questions.map(q => ({
          ...q,
          type: questionType(q),
          options: JSON.parse(q.options || '[]'),
        })),
      }
    })
  } catch (e) {
    console.error('Quiz GET error:', e)
    return NextResponse.json({ error: 'Failed to load quiz' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { lessonId, title, description, passMark, timeLimit, questions } = body
    if (!lessonId || !title) return NextResponse.json({ error: 'lessonId and title required' }, { status: 400 })

    const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { id: true } })
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    const questionsRaw = (questions || []) as IncomingQuestion[]
    for (const [i, q] of questionsRaw.entries()) {
      if (!q.text?.trim()) return NextResponse.json({ error: `Question ${i + 1} has no text` }, { status: 400 })
      if (questionType(q) === 'MCQ') {
        const options = (q.options || []).map(o => String(o ?? '').trim())
        if (options.filter(Boolean).length < 2) {
          return NextResponse.json({ error: `Question ${i + 1} needs at least 2 options` }, { status: 400 })
        }
      }
    }

    // Delete existing quiz for this lesson (if any)
    const existing = await db.quiz.findFirst({ where: { lessonId } })
    if (existing) {
      await db.quiz.delete({ where: { id: existing.id } })
    }

    const buildQuestions = (withImageUrl: boolean) =>
      questionsRaw.map((q, i) => {
        const isEssay = questionType(q) === 'ESSAY'
        const options = isEssay ? [] : (q.options || []).map(o => String(o ?? '').trim()).filter(Boolean)
        const base = {
          type: isEssay ? 'ESSAY' : 'MCQ',
          text: q.text.trim(),
          options: JSON.stringify(options),
          // Essays have no option index; the marking guide lives in `rubric`
          answer: isEssay ? '' : String(q.answer ?? 0),
          rubric: isEssay ? (q.rubric || '').trim() : null,
          marks: Number(q.marks) || 1,
          position: i,
        }
        return withImageUrl ? { ...base, imageUrl: q.imageUrl || null } : base
      })

    let quiz
    try {
      quiz = await db.quiz.create({
        data: {
          lessonId,
          title,
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
          questions: { create: buildQuestions(true) }
        },
        include: { questions: true }
      })
    } catch (imgErr: any) {
      // imageUrl column doesn't exist — retry WITHOUT it
      console.log('Retrying quiz save without imageUrl:', imgErr.message)
      quiz = await db.quiz.create({
        data: {
          lessonId,
          title,
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
          questions: { create: buildQuestions(false) }
        },
        include: { questions: true }
      })
    }

    return NextResponse.json({
      quiz: {
        ...quiz,
        questions: quiz.questions.map(q => ({ ...q, type: questionType(q), options: JSON.parse(q.options || '[]') })),
      }
    })
  } catch (e: any) {
    console.error('Quiz POST error:', e)
    const missingColumn = /column .* does not exist|Unknown argument/i.test(e?.message || '')
    return NextResponse.json(
      {
        error: missingColumn
          ? 'The database is missing the new quiz columns. Run "npm run db:push" (or "bun run db:push") on the server, then try again.'
          : 'Failed to save quiz: ' + (e.message || 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
