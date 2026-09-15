import { db } from '@/lib/db'
import { aiChatJson, buildSourceContext, AiError } from '@/lib/ai'

// ─────────────────────────────────────────────────────────────────────────────
// Grading pipeline shared by lesson quizzes and course final exams.
//
//   MCQ questions   → graded deterministically (text comparison, shuffle-safe)
//   ESSAY questions → marked by the AI against the question's marking guide,
//                     then reviewed/adjusted by a lecturer in the gradebook
//
// An attempt that contains at least one essay is held in reviewStatus PENDING:
// the score is recorded but not released to the student until a lecturer has
// approved it (reviewStatus REVIEWED).
// ─────────────────────────────────────────────────────────────────────────────

export type AttemptKind = 'quiz' | 'exam'

export interface QuestionLike {
  id: string
  type?: string | null
  text: string
  options: string
  answer: string
  rubric?: string | null
  marks: number
  position?: number
}

export interface GradedItem {
  questionId: string
  type: 'MCQ' | 'ESSAY'
  question: string
  /** what the student wrote / selected */
  answer: string
  /** MCQ only: the correct option text */
  correct?: string
  /** MCQ only */
  isCorrect?: boolean
  maxMarks: number
  /** the mark currently recorded (AI's, or the lecturer's override) */
  marksAwarded: number
  /** the mark the AI originally gave, kept for the audit trail */
  aiMarks?: number | null
  feedback?: string
  /** true once a lecturer has changed this question's mark */
  lecturerAdjusted?: boolean
}

export interface GradingTotals {
  score: number
  totalMarks: number
  percent: number
}

export const ESSAY = 'ESSAY'

export function questionType(q: { type?: string | null }): 'MCQ' | 'ESSAY' {
  return (q.type || 'MCQ').toUpperCase() === ESSAY ? 'ESSAY' : 'MCQ'
}

export function parseOptions(q: QuestionLike): string[] {
  try {
    const parsed = JSON.parse(q.options)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/** Correct option TEXT for an MCQ (handles both an index and a literal answer). */
export function correctOptionText(q: QuestionLike): string {
  const options = parseOptions(q)
  const idx = parseInt(q.answer, 10)
  if (Number.isNaN(idx)) return q.answer
  return options[idx] ?? q.answer
}

/**
 * Deterministic marking of the objective (MCQ) questions. Essay questions come
 * back with 0 marks and an empty feedback — they are filled in by the AI pass.
 */
export function gradeObjective(
  questions: QuestionLike[],
  answers: Record<string, string>
): { items: GradedItem[]; totals: GradingTotals } {
  const items: GradedItem[] = []
  let score = 0
  let totalMarks = 0

  for (const q of questions) {
    const maxMarks = Number(q.marks) || 0
    totalMarks += maxMarks
    const given = typeof answers?.[q.id] === 'string' ? answers[q.id] : ''

    if (questionType(q) === ESSAY) {
      items.push({
        questionId: q.id,
        type: 'ESSAY',
        question: q.text,
        answer: given,
        maxMarks,
        marksAwarded: 0,
        aiMarks: null,
        feedback: '',
      })
      continue
    }

    const correct = correctOptionText(q)
    const isCorrect = given.trim().toLowerCase() === String(correct).trim().toLowerCase()
    if (isCorrect) score += maxMarks

    items.push({
      questionId: q.id,
      type: 'MCQ',
      question: q.text,
      answer: given,
      correct: String(correct),
      isCorrect,
      maxMarks,
      marksAwarded: isCorrect ? maxMarks : 0,
      aiMarks: isCorrect ? maxMarks : 0,
      feedback: isCorrect ? 'Correct.' : `Not correct — the right answer is: ${correct}`,
    })
  }

  return { items, totals: totalsOf(items, totalMarks) }
}

function totalsOf(items: GradedItem[], totalMarks: number): GradingTotals {
  const score = items.reduce((sum, i) => sum + (Number(i.marksAwarded) || 0), 0)
  return {
    score,
    totalMarks,
    percent: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
  }
}

// ── Attempt loading ──────────────────────────────────────────────────────────

export interface LoadedAttempt {
  attempt: {
    id: string
    userId: string
    answers: Record<string, string>
    score: number
    totalMarks: number
    passed: boolean
    reviewStatus: string
    gradingMode: string
    aiScore: number | null
    aiFeedback: string | null
    aiMarkedAt: Date | null
    reviewNote: string | null
    reviewedAt: Date | null
    startedAt: Date
    completedAt: Date | null
    graded?: string | null
  }
  questions: QuestionLike[]
  assessment: { id: string; title: string; passMark: number }
  course: { id: string; code: string; title: string }
  lessonTitle: string | null
  student: { id: string; name: string; email: string; matricNumber: string | null }
}

/** Loads a quiz or final-exam attempt with everything the review UI needs. */
export async function loadAttempt(kind: AttemptKind, attemptId: string): Promise<LoadedAttempt | null> {
  if (kind === 'quiz') {
    const row = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { id: true, name: true, email: true, matricNumber: true } },
        quiz: {
          include: {
            questions: { orderBy: { position: 'asc' } },
            lesson: { include: { module: { include: { course: { select: { id: true, code: true, title: true } } } } } },
          },
        },
      },
    })
    if (!row) return null
    return {
      attempt: normalizeAttempt(row),
      questions: row.quiz.questions as QuestionLike[],
      assessment: { id: row.quiz.id, title: row.quiz.title, passMark: row.quiz.passMark },
      course: row.quiz.lesson.module.course,
      lessonTitle: row.quiz.lesson.title,
      student: row.user,
    }
  }

  const row = await db.finalExamAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, name: true, email: true, matricNumber: true } },
      exam: {
        include: {
          questions: { orderBy: { position: 'asc' } },
          course: { select: { id: true, code: true, title: true } },
        },
      },
    },
  })
  if (!row) return null
  return {
    attempt: normalizeAttempt(row),
    questions: row.exam.questions as QuestionLike[],
    assessment: { id: row.exam.id, title: row.exam.title, passMark: row.exam.passMark },
    course: row.exam.course,
    lessonTitle: null,
    student: row.user,
  }
}

function normalizeAttempt(row: any) {
  let answers: Record<string, string> = {}
  try {
    answers = JSON.parse(row.answers) || {}
  } catch {
    answers = {}
  }
  return { ...row, answers }
}

export function parseGraded(raw: string | null | undefined): GradedItem[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as GradedItem[]) : null
  } catch {
    return null
  }
}

// ── AI marking ───────────────────────────────────────────────────────────────

interface AiMarkResult {
  questionId: string
  marks: number
  feedback: string
}

/**
 * Marks every essay question of an attempt against its marking guide and writes
 * the result back. Called when a student submits, and again from the "Re-mark
 * with AI" button in the gradebook.
 *
 * Never throws: if the AI is unreachable the submission is still saved, the
 * essays are left unmarked and the attempt goes to the lecturer's queue.
 */
export async function markAttemptWithAi(
  kind: AttemptKind,
  attemptId: string,
  opts: { items?: GradedItem[]; totals?: GradingTotals } = {}
): Promise<{ reviewStatus: string; aiMarked: boolean; error?: string }> {
  const loaded = await loadAttempt(kind, attemptId)
  if (!loaded) return { reviewStatus: 'AUTO', aiMarked: false, error: 'Attempt not found' }

  const questions = loaded.questions
  const essays = questions.filter((q) => questionType(q) === 'ESSAY')

  // Objective questions are already graded deterministically
  const base = opts.items && opts.totals
    ? { items: opts.items, totals: opts.totals }
    : gradeObjective(questions, loaded.attempt.answers)

  if (!essays.length) {
    await persist(kind, attemptId, {
      items: base.items,
      totals: base.totals,
      passMark: loaded.assessment.passMark,
      gradingMode: 'AUTO',
      reviewStatus: 'AUTO',
      ai: null,
    })
    return { reviewStatus: 'AUTO', aiMarked: false }
  }

  // Source material the marking should be grounded in: documents attached to
  // this course plus the department-wide ones.
  const docs = await db.aiDocument.findMany({
    where: { OR: [{ courseId: loaded.course.id }, { courseId: null }] },
    select: { title: true, content: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  let aiResults: AiMarkResult[] = []
  let summary = ''
  let failure: string | undefined

  try {
    const ai = await aiMarkEssays({
      courseTitle: `${loaded.course.title} (${loaded.course.code})`,
      assessmentTitle: loaded.assessment.title,
      sourceContext: buildSourceContext(docs, 20000),
      essays: essays.map((q) => ({
        id: q.id,
        text: q.text,
        marks: Number(q.marks) || 0,
        rubric: q.rubric || '',
        answer: (loaded.attempt.answers[q.id] || '').trim(),
      })),
    })
    aiResults = ai.results
    summary = ai.summary
  } catch (e) {
    failure = e instanceof AiError ? e.message : 'The AI marker did not respond.'
    console.error('[grading] AI marking failed:', failure)
  }

  const byId = new Map(aiResults.map((r) => [String(r.questionId), r]))
  const items = base.items.map((item) => {
    if (item.type !== 'ESSAY') return item
    const q = essays.find((e) => e.id === item.questionId)!
    const maxMarks = item.maxMarks
    const marked = byId.get(item.questionId)
    if (!marked) {
      return {
        ...item,
        marksAwarded: 0,
        aiMarks: null,
        feedback: failure
          ? `Not marked yet — ${failure} Your lecturer will mark this answer.`
          : 'Not marked yet. Your lecturer will mark this answer.',
      }
    }
    const clamped = clampMarks(marked.marks, maxMarks)
    void q
    return {
      ...item,
      marksAwarded: clamped,
      aiMarks: clamped,
      feedback: String(marked.feedback || '').slice(0, 1200),
    }
  })

  const totals = totalsOf(items, base.totals.totalMarks)
  const aiMarked = aiResults.length > 0

  await persist(kind, attemptId, {
    items,
    totals,
    passMark: loaded.assessment.passMark,
    gradingMode: aiMarked ? 'AI' : 'MANUAL',
    // Always held for a lecturer while an essay is involved
    reviewStatus: 'PENDING',
    ai: {
      aiScore: aiMarked ? totals.score : null,
      aiFeedback: aiMarked
        ? [summary, failure ? `Warning: ${failure}` : ''].filter(Boolean).join('\n').slice(0, 2000)
        : `AI marking unavailable (${failure || 'no response'}). Left for the lecturer to mark.`,
      aiMarkedAt: new Date(),
    },
  })

  return { reviewStatus: 'PENDING', aiMarked, error: failure }
}

function clampMarks(value: unknown, maxMarks: number): number {
  const n = Math.round(Number(value))
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(maxMarks, n))
}

async function aiMarkEssays(input: {
  courseTitle: string
  assessmentTitle: string
  sourceContext: string
  essays: Array<{ id: string; text: string; marks: number; rubric: string; answer: string }>
}): Promise<{ results: AiMarkResult[]; summary: string }> {
  const questionsBlock = input.essays
    .map((e, i) => {
      return [
        `QUESTION ${i + 1} (id: ${e.id}) — worth ${e.marks} mark(s)`,
        `Text: ${e.text}`,
        e.rubric ? `Marking guide / model answer:\n${e.rubric}` : 'Marking guide: none supplied — mark on subject knowledge, accuracy and relevance.',
        `STUDENT ANSWER:\n${e.answer || '(the student left this blank)'}`,
      ].join('\n')
    })
    .join('\n\n────────\n\n')

  const system = [
    'You are a meticulous university examiner marking written answers for the Department of Economics at Al-Bashir Academy (Al-Hikmah University, Ilorin).',
    `You are marking the assessment "${input.assessmentTitle}" for the course ${input.courseTitle}.`,
    'Mark professionally and consistently:',
    '- Award marks in proportion to what the answer actually demonstrates. Do not award marks for length, effort or confidence.',
    '- Follow the marking guide closely. Where one is supplied, the points it lists are what the marks are for.',
    '- Be fair on wording: reward correct economics even if phrased differently. Penalise factual errors, contradictions and irrelevant material.',
    '- A blank or off-topic answer scores 0.',
    '- Marks must be a whole number between 0 and the marks the question is worth.',
    '- Write 1 to 3 sentences of feedback per question, addressed to the student, saying what was good and what was missing or wrong. Plain text, no markdown.',
    'Reply with JSON only, in exactly this shape:',
    '{"results":[{"questionId":"...","marks":0,"feedback":"..."}],"summary":"one or two sentences on the answer overall"}',
  ].join('\n')

  const user = [
    input.sourceContext ? `Reference material from the lecturer's own documents — mark in line with it:\n\n${input.sourceContext}` : '',
    'Mark each question below. Use the question id exactly as given.',
    questionsBlock,
  ]
    .filter(Boolean)
    .join('\n\n')

  const data = await aiChatJson<{ results?: AiMarkResult[]; summary?: string }>(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.1, maxTokens: 2500 }
  )

  const results = Array.isArray(data?.results) ? data.results.filter((r) => r && r.questionId) : []
  return { results, summary: typeof data?.summary === 'string' ? data.summary : '' }
}

// ── Persistence ──────────────────────────────────────────────────────────────

interface PersistInput {
  items: GradedItem[]
  totals: GradingTotals
  passMark: number
  gradingMode: string
  reviewStatus: string
  ai: { aiScore: number | null; aiFeedback: string | null; aiMarkedAt: Date } | null
  review?: { reviewedById: string; reviewNote: string | null }
}

async function persist(kind: AttemptKind, attemptId: string, input: PersistInput) {
  const passed = input.totals.percent >= input.passMark
  const data: Record<string, unknown> = {
    score: input.totals.score,
    totalMarks: input.totals.totalMarks,
    passed,
    gradingMode: input.gradingMode,
    reviewStatus: input.reviewStatus,
    graded: JSON.stringify(input.items),
  }
  if (input.ai) {
    data.aiScore = input.ai.aiScore
    data.aiFeedback = input.ai.aiFeedback
    data.aiMarkedAt = input.ai.aiMarkedAt
  }
  if (input.review) {
    data.reviewedById = input.review.reviewedById
    data.reviewedAt = new Date()
    data.reviewNote = input.review.reviewNote
  }

  if (kind === 'quiz') await db.quizAttempt.update({ where: { id: attemptId }, data })
  else {
    await db.finalExamAttempt.update({ where: { id: attemptId }, data })
    // The exam result only counts towards the certificate once a lecturer has
    // signed off on the AI's marks.
    if (input.reviewStatus === 'REVIEWED') await syncExamEnrollment(attemptId, input.totals.percent)
  }
}

/** Writes the reviewed exam percentage onto the student's enrollment. */
async function syncExamEnrollment(attemptId: string, percent: number) {
  const attempt = await db.finalExamAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { courseId: true, passMark: true } } },
  })
  if (!attempt) return

  const enrollment = await db.enrollment.findFirst({
    where: { courseId: attempt.exam.courseId, userId: attempt.userId },
  })
  if (!enrollment) return

  if (percent >= attempt.exam.passMark) {
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { finalScore: percent, completedAt: enrollment.completedAt ?? new Date(), lecturerApproved: true },
    })
  } else if (enrollment.finalScore !== null) {
    // A review took the student below the pass mark — clear the released result
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { finalScore: null, completedAt: null, lecturerApproved: false },
    })
  }
}

// ── Lecturer review ──────────────────────────────────────────────────────────

export interface ReviewInput {
  /** questionId -> mark awarded by the lecturer (form inputs arrive as strings) */
  marks: Record<string, number | string>
  note?: string | null
  reviewerId: string
}

/**
 * Saves a lecturer's marks over the AI's, recomputes the total and releases the
 * result to the student (reviewStatus REVIEWED).
 */
export async function applyLecturerReview(
  kind: AttemptKind,
  attemptId: string,
  input: ReviewInput
): Promise<{ score: number; totalMarks: number; percent: number; passed: boolean }> {
  const loaded = await loadAttempt(kind, attemptId)
  if (!loaded) throw new Error('Attempt not found')

  const existing = parseGraded(loaded.attempt.graded) || gradeObjective(loaded.questions, loaded.attempt.answers).items

  const items = existing.map((item) => {
    const provided = input.marks?.[item.questionId]
    if (provided === undefined || provided === null || String(provided).trim() === '') return item
    const clamped = clampMarks(provided, item.maxMarks)
    if (clamped === item.marksAwarded) return item
    return {
      ...item,
      marksAwarded: clamped,
      aiMarks: item.aiMarks ?? null,
      lecturerAdjusted: true,
      feedback: item.feedback || '',
    }
  })

  const totalMarks = items.reduce((sum, i) => sum + i.maxMarks, 0)
  const totals = totalsOf(items, totalMarks)

  await persist(kind, attemptId, {
    items,
    totals,
    passMark: loaded.assessment.passMark,
    gradingMode: loaded.attempt.gradingMode === 'AUTO' ? 'MANUAL' : loaded.attempt.gradingMode,
    reviewStatus: 'REVIEWED',
    ai: null,
    review: { reviewedById: input.reviewerId, reviewNote: input.note?.trim() || null },
  })

  return { ...totals, passed: totals.percent >= loaded.assessment.passMark }
}
