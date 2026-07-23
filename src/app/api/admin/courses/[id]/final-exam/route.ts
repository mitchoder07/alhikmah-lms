import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET — fetch final exam for admin editing
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        options: JSON.parse(q.options),
      })),
    }
  })
}

// POST — create or update final exam
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, passMark, timeLimit, maxAttempts, questions } = body

    // Delete existing exam + questions (cascade), then create new
    const existing = await db.finalExam.findUnique({ where: { courseId: id } })
    if (existing) {
      await db.finalExam.delete({ where: { id: existing.id } })
    }

    const questionData = (questions as Array<{ text: string; options: string[]; answer: number; marks?: number; imageUrl?: string | null }>).map((q, i) => ({
      text: q.text,
      options: JSON.stringify(q.options),
      answer: String(q.answer),
      marks: q.marks ?? 1,
      position: i,
      ...(q.imageUrl ? { imageUrl: q.imageUrl } : {}),
    }))

    const exam = await db.finalExam.create({
      data: {
        courseId: id,
        title: title || 'Final Exam',
        description: description || '',
        passMark: Number(passMark) || 50,
        timeLimit: Number(timeLimit) || 0,
        maxAttempts: Number(maxAttempts) || 3,
        questions: {
          create: questionData,
        }
      },
      include: { questions: true }
    })

    return NextResponse.json({ exam })
  } catch (e: any) {
    console.error('Final exam POST error:', e)
    if (e.message && e.message.includes('imageUrl')) {
      // Retry without imageUrl (database might not have the column)
      try {
        const { id } = await params
        const body = await req.json()
        const { title, description, passMark, timeLimit, maxAttempts, questions } = body
        const existing = await db.finalExam.findUnique({ where: { courseId: id } })
        if (existing) await db.finalExam.delete({ where: { id: existing.id } })

        const exam = await db.finalExam.create({
          data: {
            courseId: id,
            title: title || 'Final Exam',
            description: description || '',
            passMark: Number(passMark) || 50,
            timeLimit: Number(timeLimit) || 0,
            maxAttempts: Number(maxAttempts) || 3,
            questions: {
              create: (questions as Array<{ text: string; options: string[]; answer: number; marks?: number }>).map((q, i) => ({
                text: q.text,
                options: JSON.stringify(q.options),
                answer: String(q.answer),
                marks: q.marks ?? 1,
                position: i,
              }))
            }
          },
          include: { questions: true }
        })
        return NextResponse.json({ exam })
      } catch (e2: any) {
        console.error('Final exam fallback error:', e2)
        return NextResponse.json({ error: 'Failed to save exam. Run: bun run db:push' }, { status: 500 })
      }
    }
    return NextResponse.json({ error: 'Failed to save exam' }, { status: 500 })
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
