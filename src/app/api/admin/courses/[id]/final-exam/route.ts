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

// GET — fetch final exam for admin editing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const exam = await db.finalExam.findUnique({
      where: { courseId: id },
      include: { questions: { orderBy: { position: 'asc' } } },
    })

    if (!exam) return NextResponse.json({ exam: null })

    return NextResponse.json({
      exam: {
        ...exam,
        questions: exam.questions.map(q => ({
          ...q,
          type: questionType(q),
          options: JSON.parse(q.options || '[]'),
        })),
      }
    })
  } catch (e) {
    console.error('Final exam GET error:', e)
    return NextResponse.json({ error: 'Failed to load exam' }, { status: 500 })
  }
}

// POST — create or update final exam
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const course = await db.course.findUnique({ where: { id }, select: { id: true } })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const body = await req.json()
    const { title, description, passMark, timeLimit, maxAttempts, questions } = body

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

    // Delete existing exam + questions (cascade)
    const existing = await db.finalExam.findUnique({ where: { courseId: id } })
    if (existing) {
      await db.finalExam.delete({ where: { id: existing.id } })
    }

    const buildQuestions = (withImageUrl: boolean) =>
      questionsRaw.map((q, i) => {
        const isEssay = questionType(q) === 'ESSAY'
        const options = isEssay ? [] : (q.options || []).map(o => String(o ?? '').trim()).filter(Boolean)
        const base = {
          type: isEssay ? 'ESSAY' : 'MCQ',
          text: q.text.trim(),
          options: JSON.stringify(options),
          answer: isEssay ? '' : String(q.answer ?? 0),
          rubric: isEssay ? (q.rubric || '').trim() : null,
          marks: Number(q.marks) || 1,
          position: i,
        }
        return withImageUrl ? { ...base, imageUrl: q.imageUrl || null } : base
      })

    let exam
    try {
      exam = await db.finalExam.create({
        data: {
          courseId: id,
          title: title || 'Final Exam',
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
          maxAttempts: Number(maxAttempts) || 3,
          questions: { create: buildQuestions(true) }
        },
        include: { questions: true }
      })
    } catch (imgErr: any) {
      // imageUrl column doesn't exist — retry WITHOUT it
      console.log('Retrying exam save without imageUrl:', imgErr.message)
      exam = await db.finalExam.create({
        data: {
          courseId: id,
          title: title || 'Final Exam',
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
          maxAttempts: Number(maxAttempts) || 3,
          questions: { create: buildQuestions(false) }
        },
        include: { questions: true }
      })
    }

    return NextResponse.json({
      exam: {
        ...exam,
        questions: exam.questions.map(q => ({ ...q, type: questionType(q), options: JSON.parse(q.options || '[]') })),
      }
    })
  } catch (e: any) {
    console.error('Final exam POST error:', e)
    const missingColumn = /column .* does not exist|Unknown argument/i.test(e?.message || '')
    return NextResponse.json(
      {
        error: missingColumn
          ? 'The database is missing the new exam columns. Run "npm run db:push" (or "bun run db:push") on the server, then try again.'
          : 'Failed to save exam: ' + (e.message || 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

// DELETE — remove final exam
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  await db.finalExam.deleteMany({ where: { courseId: id } })
  return NextResponse.json({ ok: true })
}
