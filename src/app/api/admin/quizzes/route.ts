import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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
          options: JSON.parse(q.options),
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

    // Delete existing quiz for this lesson (if any)
    const existing = await db.quiz.findFirst({ where: { lessonId } })
    if (existing) {
      await db.quiz.delete({ where: { id: existing.id } })
    }

    // Build question data — only include imageUrl if the column exists in the database
    // We try with imageUrl first, if it fails we retry without
    const questionsRaw = questions as Array<{ text: string; options: string[]; answer: number; marks?: number; imageUrl?: string | null }>

    let quiz
    try {
      // Try WITH imageUrl
      quiz = await db.quiz.create({
        data: {
          lessonId,
          title,
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
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
      console.log('Retrying quiz save without imageUrl:', imgErr.message)
      quiz = await db.quiz.create({
        data: {
          lessonId,
          title,
          description: description || '',
          passMark: Number(passMark) || 50,
          timeLimit: Number(timeLimit) || 0,
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

    return NextResponse.json({ quiz })
  } catch (e: any) {
    console.error('Quiz POST error:', e)
    return NextResponse.json({ error: 'Failed to save quiz: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
