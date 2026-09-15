'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { apiPost } from '@/lib/api'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Award, Loader2, Image as ImageIcon, Clock, FileText } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Quiz {
  id: string; title: string; passMark: number
  questions: Array<{ id: string; text: string; options: string; answer: string; marks: number; imageUrl?: string | null; type?: string }>
}

// Simple seeded shuffle — same seed produces same order. Each student gets a unique order.
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

export interface QuizResult {
  score: number
  totalMarks: number
  percent: number
  passed: boolean
  /** true when the quiz had written answers still waiting for the lecturer */
  awaitingReview?: boolean
  reviewStatus?: string
}

export function QuizModal({ quiz, lessonId, courseId, onClose, onSubmitted }: { quiz: Quiz; lessonId: string; courseId: string; onClose: () => void; onSubmitted?: (result?: QuizResult) => void }) {
  // Generate a unique seed per student per quiz (using quiz ID + a random session ID)
  // This ensures each student sees questions and options in a different order
  const shuffleSeed = useMemo(() => {
    const sessionId = sessionStorage.getItem(`quiz-session-${quiz.id}`) || Math.random().toString(36).slice(2)
    sessionStorage.setItem(`quiz-session-${quiz.id}`, sessionId)
    return `${quiz.id}-${sessionId}`
  }, [quiz.id])

  // Shuffle questions and options
  const shuffledQuestions = useMemo(() => {
    const parsed = quiz.questions.map(q => ({
      ...q,
      type: (q.type || 'MCQ').toUpperCase() === 'ESSAY' ? 'ESSAY' : 'MCQ',
      parsedOptions: JSON.parse(q.options || '[]'),
    }))
    const shuffled = seededShuffle(parsed, shuffleSeed)
    // Also shuffle the options within each question
    return shuffled.map(q => {
      const optionsWithIndex = q.parsedOptions.map((text: string, originalIdx: number) => ({ text, originalIdx }))
      const shuffledOptions = seededShuffle(optionsWithIndex, `${shuffleSeed}-${q.id}`)
      return { ...q, shuffledOptions }
    })
  }, [quiz.questions, shuffleSeed])

  // answers maps questionId to the selected option TEXT (MCQ) or the typed answer (essay)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)

  const allAnswered = shuffledQuestions.every(q => (answers[q.id] ?? '').trim().length > 0)
  const essayCount = shuffledQuestions.filter(q => (q.type || 'MCQ') === 'ESSAY').length

  const submit = async () => {
    setSubmitting(true)
    try {
      // Send answers as { questionId: selectedOptionText }
      const res = await apiPost(`/api/courses/${courseId}/lessons/${lessonId}/quiz/submit`, { quizId: quiz.id, answers })
      setResult(res)
      if (res.awaitingReview) toast.success('Answers submitted. Your lecturer will release the mark once it is checked.')
      else if (res.passed) toast.success(`Quiz passed! ${res.percent}%`)
      else toast.error(`Quiz failed: ${res.percent}%`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result ? (result.awaitingReview ? <Clock className="h-5 w-5 text-amber-600" /> : result.passed ? <Award className="h-5 w-5 text-gold" /> : <XCircle className="h-5 w-5 text-destructive" />) : null}
            {quiz.title}
          </DialogTitle>
          <DialogDescription>
            {result
              ? result.awaitingReview
                ? 'Submitted, waiting to be marked'
                : `You scored ${result.percent}% (${result.score}/${result.totalMarks})`
              : `Pass mark: ${quiz.passMark}% · ${shuffledQuestions.length} question${shuffledQuestions.length === 1 ? '' : 's'}${essayCount ? ` · ${essayCount} written` : ''}`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            {result.awaitingReview ? (
              <div className="rounded-lg p-6 text-center bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="h-10 w-10 mx-auto mb-2" />
                <p className="font-medium text-lg">Answer submitted</p>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  This quiz had written answers, so it is being marked against your lecturer's marking guide.
                  Your score will appear here and in your progress once it has been checked.
                </p>
              </div>
            ) : (
            <div className={`rounded-lg p-6 text-center ${result.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="text-4xl font-bold mb-1">{result.percent}%</p>
              <p className="font-medium">{result.passed ? 'Passed!' : 'Not passed yet'}</p>
              <p className="text-xs mt-1">Score: {result.score} / {result.totalMarks}</p>
            </div>
            )}
            <DialogFooter>
              <Button onClick={() => onSubmitted?.(result || undefined)} className="bg-primary hover:bg-primary/90">Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-5 py-2 max-h-[55vh] overflow-y-auto albashir-scroll pr-2">
              {shuffledQuestions.map((q, i) => (
                <div key={q.id} className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q.text}</p>
                      {q.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border bg-secondary/20">
                          <img src={q.imageUrl} alt="Question diagram" className="max-w-full max-h-64 mx-auto" />
                        </div>
                      )}
                    </div>
                  </div>
                  {q.type === 'ESSAY' ? (
                    <div className="space-y-1">
                      <Textarea
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        rows={5}
                        className="text-sm"
                        placeholder="Write your answer here…"
                      />
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5" /> Worth {q.marks} mark{q.marks > 1 ? 's' : ''} · marked by your lecturer
                      </p>
                    </div>
                  ) : (
                  <RadioGroup
                    value={answers[q.id] ?? ''}
                    onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
                  >
                    {q.shuffledOptions.map((opt: { text: string; originalIdx: number }, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 border">
                        <RadioGroupItem value={opt.text} id={`${q.id}-${idx}`} />
                        <Label htmlFor={`${q.id}-${idx}`} className="text-sm font-normal cursor-pointer flex-1">{opt.text}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={!allAnswered || submitting} className="bg-primary hover:bg-primary/90">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Submit Quiz
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
