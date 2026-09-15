'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApi, apiPost } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Loader2, FileCheck, Clock, AlertCircle, CheckCircle2, XCircle, Award, ChevronLeft, RotateCcw, Lock, Hourglass } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// Seeded shuffle for question/option randomization
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array]
  let s = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

interface ExamQuestion {
  id: string
  text: string
  type: 'MCQ' | 'ESSAY'
  options: string[]
  marks: number
  imageUrl?: string | null
}
interface ExamAttempt {
  id: string
  score: number
  totalMarks: number
  passed: boolean
  reviewStatus: 'AUTO' | 'PENDING' | 'REVIEWED'
  completedAt: string
}
interface Exam {
  id: string
  title: string
  description?: string | null
  passMark: number
  timeLimit: number
  maxAttempts: number
  questions: ExamQuestion[]
  attempts: ExamAttempt[]
}

interface CourseProgressData {
  course: {
    modules: Array<{
      id: string
      lessons: Array<{
        id: string
        progress?: Array<{ completed: boolean }>
      }>
    }>
  }
}

export function StudentFinalExam({ courseId, courseTitle, onNavigate }: { courseId: string; courseTitle: string; onNavigate: (v: string, p?: any) => void }) {
  const { data, loading, refetch } = useApi<{ exam: Exam | null }>(`/api/courses/${courseId}/final-exam`)
  // Fetch course data to check lesson completion progress (locks exam until all lessons are done)
  const { data: courseData } = useApi<CourseProgressData>(`/api/courses/${courseId}`)
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; totalMarks: number; percent: number; passed: boolean; awaitingReview?: boolean } | null>(null)

  const exam = data?.exam

  // All lessons in the course, flattened from modules — used to gate the exam
  const courseLessons = courseData?.course?.modules?.flatMap(m => m.lessons) ?? []
  const completedLessons = courseLessons.filter(l => l.progress?.[0]?.completed).length
  const totalLessons = courseLessons.length
  const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons

  // Generate shuffle seed (must be before any early returns to satisfy hooks rules)
  const examSeed = useMemo(() => {
    if (!exam) return 'no-exam'
    const sid = sessionStorage.getItem(`exam-session-${exam.id}`) || Math.random().toString(36).slice(2)
    sessionStorage.setItem(`exam-session-${exam.id}`, sid)
    return `${exam.id}-${sid}`
  }, [exam?.id])

  // Shuffle questions and options (must be before any early returns)
  const shuffledQuestions = useMemo(() => {
    if (!exam) return []
    const shuffled = seededShuffle(exam.questions, examSeed)
    return shuffled.map(q => {
      const optsWithIdx = (q.options || []).map((text: string, originalIdx: number) => ({ text, originalIdx }))
      return { ...q, shuffledOptions: seededShuffle(optsWithIdx, `${examSeed}-${q.id}`) }
    })
  }, [exam, examSeed])

  // answers maps questionId to selected option TEXT (MCQ) or the typed answer (essay)
  const allAnswered = shuffledQuestions.length > 0 && shuffledQuestions.every(q => (answers[q.id] ?? '').trim().length > 0)
  const answeredCount = shuffledQuestions.filter(q => (answers[q.id] ?? '').trim().length > 0).length
  const essayCount = shuffledQuestions.filter(q => q.type === 'ESSAY').length

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!exam) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => onNavigate('course-player', { courseId })} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" /> Back to course
        </button>
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-lg mb-1">No Final Exam Available</h3>
            <p className="text-sm text-muted-foreground">Your lecturer has not created a final exam for this course yet. Check back later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const attemptsUsed = exam.attempts.length
  const attemptsLeft = exam.maxAttempts - attemptsUsed
  const releasedAttempts = exam.attempts.filter(a => a.reviewStatus !== 'PENDING')
  const bestAttempt = releasedAttempts.find(a => a.passed) || (releasedAttempts.length > 0 ? releasedAttempts[0] : null)
  const hasPassed = releasedAttempts.some(a => a.passed)
  const awaitingCount = exam.attempts.length - releasedAttempts.length

  const restart = () => {
    setStarted(false)
    setAnswers({})
    setResult(null)
  }

  // Result screen
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {result.awaitingReview ? (
          <Card className="border-amber-300">
            <CardContent className="py-10 text-center">
              <div className="h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-amber-100">
                <Hourglass className="h-10 w-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Exam Submitted</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Your written answers are being marked against your lecturer's marking guide. You will see your score
                here, and it will count towards your certificate, once your lecturer has checked and released it.
              </p>
              <Button onClick={() => onNavigate('course-player', { courseId })} className="bg-primary hover:bg-primary/90">
                Back to Course
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card className={result.passed ? 'border-green-500' : 'border-destructive'}>
          <CardContent className="py-10 text-center">
            <div className={`h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center ${result.passed ? 'bg-green-100' : 'bg-destructive/10'}`}>
              {result.passed ? <CheckCircle2 className="h-12 w-12 text-green-600" /> : <XCircle className="h-12 w-12 text-destructive" />}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {result.passed ? 'Exam Passed!' : 'Exam Not Passed'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              You scored <span className="font-bold text-foreground">{result.percent}%</span> ({result.score} out of {result.totalMarks} marks)
            </p>
            <p className="text-xs text-muted-foreground mb-6">Pass mark: {exam.passMark}%</p>

            {result.passed ? (
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-6">
                <Award className="h-8 w-8 text-gold mx-auto mb-2" />
                <p className="font-medium text-sm">You are now eligible for certification!</p>
                <p className="text-xs text-muted-foreground mt-1">Visit your certificates page to pay and get your certificate.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">
                {attemptsLeft > 0 ? `You have ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.` : 'You have used all your attempts. Contact your lecturer.'}
              </p>
            )}

            <div className="flex gap-2 justify-center">
              {!result.passed && attemptsLeft > 0 && (
                <Button variant="outline" onClick={restart}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Try Again
                </Button>
              )}
              <Button onClick={() => onNavigate('course-player', { courseId })} className="bg-primary hover:bg-primary/90">
                Back to Course
              </Button>
              {result.passed && (
                <Button onClick={() => onNavigate('certificates')} className="bg-gold hover:bg-gold/90 text-black">
                  <Award className="h-4 w-4 mr-1" /> View Certificates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    )
  }

  // Exam intro screen
  if (!started) {
    // Lock the exam until all lessons in the course are completed (skip the lock if the student
    // already has attempts on record — they were permitted to take it previously)
    const hasExistingAttempts = exam.attempts.length > 0
    if (!allLessonsCompleted && !hasExistingAttempts) {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
          <button onClick={() => onNavigate('course-player', { courseId })} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Back to course
          </button>
          <Card className="border-amber-200">
            <CardContent className="py-10 text-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Exam Locked</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This exam is locked. Complete all lessons in this course first.
              </p>
              <p className="text-sm font-medium mb-6">
                You have completed <span className="text-primary">{completedLessons}</span> of <span className="text-primary">{totalLessons}</span> lessons.
              </p>
              <div className="max-w-xs mx-auto mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <Button onClick={() => onNavigate('course-player', { courseId })} className="bg-primary hover:bg-primary/90">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Course
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => onNavigate('course-player', { courseId })} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" /> Back to course
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="h-5 w-5 text-primary" />
              <Badge variant="secondary">Final Exam</Badge>
            </div>
            <CardTitle className="text-xl">{exam.title}</CardTitle>
            <CardDescription>{courseTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {exam.description && (
              <p className="text-sm text-muted-foreground">{exam.description}</p>
            )}

            {/* Exam info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-primary">{exam.questions.length}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-primary">{exam.passMark}%</p>
                <p className="text-xs text-muted-foreground">Pass Mark</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-primary">{attemptsLeft}</p>
                <p className="text-xs text-muted-foreground">Attempts Left</p>
              </div>
            </div>

            {/* Previous attempts */}
            {exam.attempts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Previous Attempts</p>
                {exam.attempts.map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Attempt {exam.attempts.length - i}</span>
                      {a.reviewStatus === 'PENDING' ? (
                        <Badge className="bg-amber-100 text-amber-800"><Hourglass className="h-2.5 w-2.5 mr-1" />Being marked</Badge>
                      ) : a.passed ? <Badge className="bg-green-100 text-green-700">Passed</Badge> : <Badge variant="secondary" className="text-destructive">Failed</Badge>}
                    </div>
                    <span className="text-sm font-medium">
                      {a.reviewStatus === 'PENDING' ? '—' : `${Math.round((a.score / a.totalMarks) * 100)}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {essayCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Hourglass className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  This exam includes {essayCount} written question{essayCount === 1 ? '' : 's'}. Those answers are marked
                  against your lecturer's marking guide, so your result is released after it has been checked.
                </p>
              </div>
            )}

            {awaitingCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/60 border">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {awaitingCount} attempt{awaitingCount === 1 ? '' : 's'} still being marked.
                </p>
              </div>
            )}

            {/* Warning */}
            {hasPassed && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">You have already passed this exam. You can take it again to improve your score, or proceed to get your certificate.</p>
              </div>
            )}

            {attemptsLeft <= 0 && !hasPassed ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">You have used all {exam.maxAttempts} attempts. Please contact your lecturer.</p>
              </div>
            ) : (
              <Button onClick={() => setStarted(true)} className="w-full bg-primary hover:bg-primary/90 h-12" disabled={attemptsLeft <= 0}>
                <FileCheck className="h-4 w-4 mr-2" /> Start Final Exam
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Exam taking screen — uses shuffledQuestions and examSeed from top of component
  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await apiPost(`/api/courses/${courseId}/final-exam`, { answers })
      setResult(res)
      if (res.awaitingReview) {
        toast.success('Exam submitted — your written answers are being marked')
      } else if (res.passed) {
        toast.success(`Congratulations! You passed with ${res.percent}%`)
      } else {
        toast.error(`You scored ${res.percent}%. Pass mark is ${exam.passMark}%.`)
      }
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit exam')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { if (confirm('Leave the exam? Your progress will be lost.')) { setStarted(false); setAnswers({}) } }} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" /> Exit exam
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{answeredCount} of {shuffledQuestions.length} answered</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{exam.title}</CardTitle>
          <CardDescription>Answer all questions, then click Submit. Pass mark: {exam.passMark}%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {shuffledQuestions.map((q, i) => (
            <div key={q.id} className="space-y-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Q{i + 1}</Badge>
                <div className="flex-1">
                  <p className="font-medium text-sm">{q.text}</p>
                  {q.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border bg-secondary/20">
                      <img src={q.imageUrl} alt="Question diagram" className="max-w-full max-h-64 mx-auto" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              </div>
              {q.type === 'ESSAY' ? (
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  rows={6}
                  className="text-sm"
                  placeholder="Write your answer here. Set out your reasoning clearly — the marks follow the points you make."
                />
              ) : (
              <RadioGroup
                value={answers[q.id] ?? ''}
                onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
              >
                {q.shuffledOptions.map((opt: { text: string; originalIdx: number }, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-md hover:bg-secondary/50 border">
                    <RadioGroupItem value={opt.text} id={`${q.id}-${idx}`} />
                    <Label htmlFor={`${q.id}-${idx}`} className="text-sm font-normal cursor-pointer flex-1">{opt.text}</Label>
                  </div>
                ))}
              </RadioGroup>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {allAnswered ? 'All questions answered.' : `${shuffledQuestions.length - answeredCount} question(s) remaining.`}
        </p>
        <Button onClick={submit} disabled={!allAnswered || submitting} className="bg-primary hover:bg-primary/90 h-11">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting...</> : <><FileCheck className="h-4 w-4 mr-1" /> Submit Exam</>}
        </Button>
      </div>
    </div>
  )
}
