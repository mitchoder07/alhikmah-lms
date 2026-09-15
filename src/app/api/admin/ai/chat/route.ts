import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStaffUser } from '@/lib/auth'
import { aiChat, buildSourceContext, AiError } from '@/lib/ai'
import { visibleDocsWhere } from '@/lib/ai-docs'

export const runtime = 'nodejs'
export const maxDuration = 60

// The staff counterpart of the student AI Study Buddy: an assistant for
// lecturers and admins that has read the documents they uploaded and knows the
// course it is being asked about.

export async function POST(req: NextRequest) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    message?: string
    courseId?: string
    documentIds?: string[]
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const message = (body.message || '').trim()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  let courseContext = ''
  if (body.courseId) {
    const course = await db.course.findUnique({
      where: { id: body.courseId },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        level: true,
        semester: true,
        modules: { select: { title: true, lessons: { select: { title: true } } } },
      },
    })
    if (course) {
      const topics = course.modules
        .map((m) => `${m.title} (${m.lessons.map((l) => l.title).join(', ')})`)
        .join('; ')
      courseContext = `Course being discussed: ${course.title} (${course.code}), level ${course.level}, ${course.semester} semester. ${course.description}\nStructure: ${topics}`
    }
  }

  const where = await visibleDocsWhere(user)
  const docs = await db.aiDocument.findMany({
    where: body.documentIds?.length
      ? { id: { in: body.documentIds }, AND: [where] }
      : (where as any),
    select: { title: true, content: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  const sourceContext = buildSourceContext(docs, 16000)

  const system = [
    `You are the teaching assistant for ${user.name}, a ${user.role === 'ADMIN' ? 'department administrator' : 'lecturer'} in the Department of Economics at Al-Bashir Academy (Al-Hikmah University, Ilorin).`,
    'You help with teaching work: explaining topics, preparing lecture material, designing quiz and exam questions with marking guides, marking policy, and interpreting student results.',
    'When source documents are supplied, ground your answers in them and say so; otherwise rely on standard Economics at undergraduate level, using Nigerian and African examples where useful.',
    'Be concrete and practical. Plain text only — no markdown, no asterisks, no hash headings. Number lists as 1. 2. 3. Keep answers under 350 words unless asked for more.',
    courseContext,
    sourceContext ? `Documents the lecturer has uploaded:\n${sourceContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const history = (body.history || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })) as Array<{ role: 'user' | 'assistant'; content: string }>

  try {
    const reply = await aiChat(
      [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: message.slice(0, 8000) },
      ],
      { temperature: 0.5, maxTokens: 900 }
    )

    await db.chatMessage.create({ data: { userId: user.id, role: 'user', content: message, courseId: body.courseId || null } })
    await db.chatMessage.create({ data: { userId: user.id, role: 'assistant', content: reply, courseId: body.courseId || null } })

    return NextResponse.json({ reply, sources: docs.map((d) => d.title) })
  } catch (e) {
    const errorMessage = e instanceof AiError ? e.message : 'The AI assistant is not responding. Please try again.'
    return NextResponse.json({ error: errorMessage }, { status: e instanceof AiError ? e.status : 502 })
  }
}
