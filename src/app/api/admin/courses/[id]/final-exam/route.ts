import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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
          options: JSON.parse(q.options),
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

    const body = await req.json()
    const { title, description, passMark, timeLimit, maxAttempts, questions } = body

    // Delete existing exam + questions (cascade)
    const existing = await db.finalExam.findUnique({ where: { courseId: id } })
    if (existing) {
      await db.finalExam.delete({ where: { id: existing.id } })
    }

    const questionsRaw = questions as Array<{ text: string; options: string[]; answer: number; marks?: number; imageUrl?: string | null }>

    let exam
    try {
      // Try WITH imageUrl
      exam = await db.finalExam.create({
        data: {
          courseId: id,
          title: title || 'Final Exam',
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
          maxAttempts: Number(maxAttempts) || 3,
          questions: {
            create: questionsRaw.map((q, i) => ({
              text: q.text,
              options: JSON.stringify(q.options),
              answer: String(q.answer),
              marks: q.marks ?? 1,
              position: i,
              imageUrl: q.imageUrl || null,
            }))
          }
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
          questions: {
            create: questionsRaw.map((q, i) => ({
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
    }

    return NextResponse.json({ exam })
  } catch (e: any) {
    console.error('Final exam POST error:', e)
    return NextResponse.json({ error: 'Failed to save exam: ' + (e.message || 'Unknown error') }, { status: 500 })
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
