import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStaffUser } from '@/lib/auth'
import { aiChatJson, buildSourceContext, AiError, normalizeText } from '@/lib/ai'
import { visibleDocsWhere } from '@/lib/ai-docs'

export const runtime = 'nodejs'
export const maxDuration = 60

// Generates a draft quiz or final exam from a lecturer's own documents (and the
// course's lesson content). Nothing is published here. The draft goes back to
// the quiz / final-exam builder so the lecturer can edit it before saving.

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
type Difficulty = (typeof DIFFICULTIES)[number]

export interface GeneratedQuestion {
  type: 'MCQ' | 'ESSAY'
  text: string
  options: string[]
  answerIndex: number
  marks: number
  rubric: string
}

export interface GeneratedDraft {
  title: string
  description: string
  passMark: number
  questions: GeneratedQuestion[]
}

interface GenerateBody {
  target?: 'quiz' | 'exam'
  courseId?: string
  lessonId?: string
  count?: number
  essayCount?: number
  difficulty?: string
  topic?: string
  instructions?: string
  documentIds?: string[]
  marksPerMcq?: number
  marksPerEssay?: number
  timeLimit?: number
  maxAttempts?: number
}

export async function POST(req: NextRequest) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as GenerateBody
  const target = body.target === 'exam' ? 'exam' : 'quiz'
  const count = clampInt(body.count, 1, 40, 5)
  const essayCount = clampInt(body.essayCount, 0, count, 0)
  const mcqCount = count - essayCount
  const difficulty: Difficulty = DIFFICULTIES.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : 'medium'
  const marksPerMcq = clampInt(body.marksPerMcq, 1, 10, 1)
  const marksPerEssay = clampInt(body.marksPerEssay, 1, 50, 10)

  if (!body.courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 })

  const course = await db.course.findUnique({
    where: { id: body.courseId },
    select: { id: true, code: true, title: true, description: true, level: true, semester: true, passMark: true, lecturerId: true },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (user.role !== 'ADMIN' && course.lecturerId !== user.id) {
    return NextResponse.json({ error: 'You can only generate questions for your own courses' }, { status: 403 })
  }

  // Lesson context (required for a lesson quiz, optional extra context for an exam)
  type LessonContext = {
    id: string
    title: string
    description: string | null
    content: string | null
    module: { title: string; course: { id: string } }
  }
  let lesson: LessonContext | null = null
  if (body.lessonId) {
    lesson = await db.lesson.findUnique({
      where: { id: body.lessonId },
      select: { id: true, title: true, description: true, content: true, module: { select: { title: true, course: { select: { id: true } } } } },
    })
    if (!lesson || lesson.module.course.id !== course.id) {
      return NextResponse.json({ error: 'Lesson not found in this course' }, { status: 404 })
    }
  } else if (target === 'quiz') {
    return NextResponse.json({ error: 'lessonId is required to generate a quiz' }, { status: 400 })
  }

  // Source documents the questions must be grounded in
  const where = await visibleDocsWhere(user)
  const docs = body.documentIds?.length
    ? await db.aiDocument.findMany({
        where: { id: { in: body.documentIds }, AND: [where] },
        select: { id: true, title: true, content: true },
      })
    : []

  // If no documents were picked, fall back to the course's own lesson content so
  // generation is still grounded in what was actually taught.
  let lessonContext = ''
  if (!docs.length) {
    const lessons = await db.lesson.findMany({
      where: { module: { courseId: course.id } },
      select: { title: true, content: true, module: { select: { title: true } } },
      orderBy: { position: 'asc' },
      take: 12,
    })
    lessonContext = buildSourceContext(
      lessons.map((l) => ({
        title: `${l.module.title}: ${l.title}`,
        content: `${l.title}\n${l.content || ''}`,
      })),
      20000
    )
  }
  const sourceContext = docs.length ? buildSourceContext(docs, 24000) : lessonContext

  const promptContext = [
    sourceContext,
    lesson
      ? `THE LESSON THIS QUIZ COVERS:\nModule: ${lesson.module.title}\nLesson: ${lesson.title}\n${normalizeText(lesson.content || lesson.description || '').slice(0, 6000)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const shape = [
    `{`,
    `  "title": "short assessment title",`,
    `  "description": "one or two sentences of instructions for students",`,
    `  "questions": [`,
    `    { "type": "MCQ", "text": "question", "options": ["A","B","C","D"], "answerIndex": 0 },`,
    `    { "type": "ESSAY", "text": "question", "rubric": "point-by-point marking guide listing what earns the marks" }`,
    `  ]`,
    `}`,
  ].join('\n')

  const system = [
    'You design university-level assessment questions for the Department of Economics at Al-Bashir Academy (Al-Hikmah University, Ilorin).',
    'Write questions a lecturer would be proud to set: precise, unambiguous, and answerable from the source material supplied.',
    `Difficulty: ${difficulty}. Use Nigerian and African examples where they help.`,
    `Produce EXACTLY ${count} question(s): ${mcqCount} multiple-choice (type "MCQ") and ${essayCount} written/essay (type "ESSAY"), in that order.`,
    'Rules for MCQ: exactly 4 plausible options of similar length, only one defensibly correct, no "all of the above", no trick wording. answerIndex is the zero-based position of the correct option.',
    'Rules for ESSAY: ask for explanation, application or evaluation, something that needs written reasoning. Always supply "rubric": a concise point-by-point marking guide naming the concepts, figures or steps that earn the marks, and roughly how the marks split.',
    'Never include the answer inside an essay question. Do not reuse the same fact for two questions.',
    'Reply with JSON only, matching this shape exactly:',
    shape,
  ].join('\n')

  const userPrompt = [
    `Course: ${course.title} (${course.code}), level ${course.level}, ${course.semester} semester.`,
    `Course description: ${course.description}`,
    body.topic ? `Focus the questions on: ${body.topic}` : '',
    body.instructions ? `Additional instructions from the lecturer: ${body.instructions}` : '',
    promptContext ? `SOURCE MATERIAL. Every question must be answerable from this:\n\n${promptContext}` : 'No source material was supplied; draw on standard Economics at this level.',
  ]
    .filter(Boolean)
    .join('\n\n')

  let raw
  try {
    raw = await aiChatJson<any>(
      [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 3800 }
    )
  } catch (e) {
    const message = e instanceof AiError ? e.message : 'Question generation failed. Please try again.'
    return NextResponse.json({ error: message }, { status: e instanceof AiError ? e.status : 502 })
  }

  const draft = normalizeDraft(raw, {
    count,
    mcqCount,
    essayCount,
    marksPerMcq,
    marksPerEssay,
    passMark: course.passMark,
    fallbackTitle: target === 'exam' ? `${course.code} Final Exam` : `Quiz: ${lesson?.title || course.title}`,
  })

  if (!draft.questions.length) {
    return NextResponse.json(
      { error: 'The AI returned questions that could not be used. Try again, or ask for fewer questions.' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    draft,
    meta: {
      target,
      courseId: course.id,
      lessonId: lesson?.id ?? null,
      requested: count,
      generated: draft.questions.length,
      mcq: draft.questions.filter((q) => q.type === 'MCQ').length,
      essay: draft.questions.filter((q) => q.type === 'ESSAY').length,
      sources: docs.map((d) => d.title),
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value))
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

/** Coerces the model's JSON into a clean draft, dropping anything unusable. */
function normalizeDraft(
  raw: any,
  opts: {
    count: number
    mcqCount: number
    essayCount: number
    marksPerMcq: number
    marksPerEssay: number
    passMark: number
    fallbackTitle: string
  }
): GeneratedDraft {
  const rawQuestions: any[] = Array.isArray(raw?.questions) ? raw.questions : []
  const questions: GeneratedQuestion[] = []

  for (const q of rawQuestions) {
    if (!q || typeof q.text !== 'string' || !q.text.trim()) continue
    const type = String(q.type || 'MCQ').toUpperCase() === 'ESSAY' ? 'ESSAY' : 'MCQ'

    if (type === 'ESSAY') {
      questions.push({
        type: 'ESSAY',
        text: q.text.trim(),
        options: [],
        answerIndex: 0,
        marks: opts.marksPerEssay,
        rubric: typeof q.rubric === 'string' ? q.rubric.trim() : '',
      })
      continue
    }

    const options = (Array.isArray(q.options) ? q.options : [])
      .map((o: unknown) => String(o ?? '').trim())
      .filter(Boolean)
    if (options.length < 2) continue
    let answerIndex = Math.round(Number(q.answerIndex ?? q.answer ?? 0))
    if (Number.isNaN(answerIndex) || answerIndex < 0 || answerIndex >= options.length) answerIndex = 0

    questions.push({
      type: 'MCQ',
      text: q.text.trim(),
      options: options.slice(0, 6),
      answerIndex,
      marks: opts.marksPerMcq,
      rubric: '',
    })
  }

  return {
    title: typeof raw?.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 140) : opts.fallbackTitle,
    description: typeof raw?.description === 'string' ? raw.description.trim().slice(0, 1000) : '',
    passMark: clampInt(raw?.passMark, 0, 100, opts.passMark),
    questions,
  }
}
