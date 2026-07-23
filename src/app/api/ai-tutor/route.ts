import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { message, courseId, history } = body as {
    message: string
    courseId?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  // Check if AI API key is configured
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY
  const apiBase = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.AI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    const reply = "The AI Study Buddy needs an API key to function. The site administrator needs to set the OPENAI_API_KEY environment variable on the hosting platform (Vercel). Once configured, I will be able to answer your Economics questions instantly."
    return NextResponse.json({ reply })
  }

  // Build course context
  let courseContext = ''
  if (courseId) {
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: { modules: { include: { lessons: true } } }
    })
    if (course) {
      courseContext = `You are tutoring a student in the course "${course.title}" (${course.code}) at Al-Hikmah University, Department of Economics. Course description: ${course.description}. Topics covered: ${course.modules.map(m => m.title).join(', ')}.`
    }
  }

  const basePrompt = 'You are an Economics study buddy for students at Al-Hikmah University, Ilorin. Be concise, helpful, and use examples relevant to Nigerian and African economies when appropriate. IMPORTANT: Do NOT use markdown formatting. Do not use ## for headings, ** for bold, or - for bullet points. Write in plain text with normal punctuation. Use numbers like 1. 2. 3. for lists. Use capital letters for emphasis instead of bold. Keep paragraphs short and separated by blank lines. Keep answers under 300 words.'
  const systemPrompt = courseContext
    ? courseContext + ' IMPORTANT: Do NOT use markdown formatting. Do not use ## for headings, ** for bold, or - for bullet points. Write in plain text with normal punctuation. Use numbers like 1. 2. 3. for lists. Use capital letters for emphasis instead of bold. Keep paragraphs short and separated by blank lines. Keep answers under 300 words.'
    : basePrompt

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    // Use standard OpenAI-compatible API (works with OpenAI, Groq, Together AI, etc.)
    const res = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('AI API error:', res.status, errText)
      throw new Error(`AI API returned ${res.status}`)
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.'

    // Save to chat history
    await db.chatMessage.create({ data: { userId: user.id, role: 'user', content: message, courseId: courseId || null } })
    await db.chatMessage.create({ data: { userId: user.id, role: 'assistant', content: reply, courseId: courseId || null } })

    return NextResponse.json({ reply })
  } catch (e) {
    console.error('AI tutor error:', e)
    const reply = "I am having trouble connecting to my AI engine right now. Please try again in a moment. If the problem persists, the site administrator may need to check the API key configuration."
    return NextResponse.json({ reply })
  }
}
