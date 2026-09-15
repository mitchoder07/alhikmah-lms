'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiPatch, apiPost, useApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  Loader2, CheckCircle2, XCircle, Bot, Sparkles, FileText, ListChecks,
  Save, Pencil, Clock,
} from 'lucide-react'

interface GradedItem {
  questionId: string
  type: 'MCQ' | 'ESSAY'
  question: string
  answer: string
  correct?: string
  isCorrect?: boolean
  maxMarks: number
  marksAwarded: number
  aiMarks?: number | null
  feedback?: string
  lecturerAdjusted?: boolean
}

interface AttemptDetail {
  attempt: {
    id: string
    kind: 'quiz' | 'exam'
    reviewStatus: 'AUTO' | 'PENDING' | 'REVIEWED'
    gradingMode: string
    score: number
    totalMarks: number
    percent: number
    passed: boolean
    aiScore: number | null
    aiFeedback: string | null
    aiMarkedAt: string | null
    reviewNote: string | null
    reviewedAt: string | null
    submittedAt: string
  }
  assessment: { id: string; title: string; passMark: number; lessonTitle: string | null }
  course: { id: string; code: string; title: string }
  student: { id: string; name: string; email: string; matricNumber: string | null }
  items: GradedItem[]
  hasEssay: boolean
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'PENDING') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Awaiting your review</Badge>
  }
  if (status === 'REVIEWED') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Reviewed</Badge>
  }
  return <Badge variant="secondary" className="text-[10px]">Auto-graded</Badge>
}

export function AttemptReviewDialog({
  attemptId, kind, onClose, onSaved,
}: {
  attemptId: string
  kind: 'quiz' | 'exam'
  onClose: () => void
  onSaved?: () => void
}) {
  const { data, loading, error, refetch } = useApi<AttemptDetail>(`/api/admin/attempts/${attemptId}?kind=${kind}`)
  // Lecturer edits sit on top of the stored marks, so a refetch never needs an effect
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [noteOverride, setNoteOverride] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [remarking, setRemarking] = useState(false)

  const markOf = (item: GradedItem) => overrides[item.questionId] ?? String(item.marksAwarded)
  const note = noteOverride ?? (data?.attempt.reviewNote || '')

  if (error) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Could not open this submission</DialogTitle><DialogDescription>{error}</DialogDescription></DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const remark = async () => {
    setRemarking(true)
    try {
      const res = await apiPost('/api/admin/ai/mark', { kind, attemptId })
      toast.success(`AI re-marked it — ${res.score}/${res.totalMarks}`)
      setOverrides({})
      refetch()
    } catch (e: any) {
      toast.error(e.message || 'The AI marker did not respond')
    } finally {
      setRemarking(false)
    }
  }

  const save = async () => {
    if (!data) return
    setSaving(true)
    try {
      const res = await apiPatch(`/api/admin/attempts/${attemptId}?kind=${kind}`, {
        marks: Object.fromEntries(data.items.map((i) => [i.questionId, Number(markOf(i))])),
        note,
      })
      toast.success(`Saved — ${res.percent}% released to the student`)
      onSaved?.()
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const adjustedCount = data
    ? data.items.filter((i) => Number(markOf(i)) !== i.marksAwarded).length
    : 0

  const previewPercent = (() => {
    if (!data) return 0
    const total = data.items.reduce((s, i) => s + i.maxMarks, 0)
    const got = data.items.reduce((s, i) => s + (Number(markOf(i)) || 0), 0)
    return total ? Math.round((got / total) * 100) : 0
  })()

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Review marking
            {data && <StatusBadge status={data.attempt.reviewStatus} />}
          </DialogTitle>
          <DialogDescription>
            {data
              ? `${data.student.name}${data.student.matricNumber ? ` (${data.student.matricNumber})` : ''} · ${data.course.code} · ${data.assessment.title}${data.assessment.lessonTitle ? ` — ${data.assessment.lessonTitle}` : ''}`
              : 'Loading attempt…'}
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2">
                <p className="text-[10px] text-muted-foreground uppercase">AI score</p>
                <p className="text-lg font-bold">
                  {data.attempt.aiScore === null ? '—' : `${data.attempt.aiScore}/${data.attempt.totalMarks}`}
                </p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Your score</p>
                <p className="text-lg font-bold">
                  {data.items.reduce((s, i) => s + (Number(markOf(i)) || 0), 0)}/{data.attempt.totalMarks}
                  <span className="text-xs font-normal text-muted-foreground"> ({previewPercent}%)</span>
                </p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Pass mark</p>
                <p className="text-lg font-bold">{data.assessment.passMark}%</p>
              </div>
            </div>

            {data.attempt.aiFeedback && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-medium text-primary flex items-center gap-1 uppercase tracking-wide">
                  <Bot className="h-3 w-3" /> AI marker's summary
                </p>
                <p className="text-xs mt-1 whitespace-pre-wrap">{data.attempt.aiFeedback}</p>
                {data.attempt.aiMarkedAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Marked {new Date(data.attempt.aiMarkedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {data.items.map((item, i) => {
                const changed = Number(markOf(item)) !== item.marksAwarded
                return (
                  <div key={item.questionId} className={`border rounded-lg p-3 space-y-2 ${changed ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-[9px]">
                            {item.type === 'ESSAY' ? <><FileText className="h-2.5 w-2.5 mr-1" />Essay</> : <><ListChecks className="h-2.5 w-2.5 mr-1" />MCQ</>}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{item.maxMarks} mark{item.maxMarks > 1 ? 's' : ''}</span>
                          {item.type === 'MCQ' && (
                            <span className={`text-[10px] ${item.isCorrect ? 'text-green-700' : 'text-destructive'}`}>
                              {item.isCorrect ? 'correct' : 'incorrect'}
                            </span>
                          )}
                          {item.lecturerAdjusted && (
                            <span className="text-[10px] text-primary flex items-center gap-0.5"><Pencil className="h-2.5 w-2.5" />you changed this</span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{item.question}</p>
                      </div>
                    </div>

                    <div className="rounded-md bg-secondary/40 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Student's answer</p>
                      <p className="text-xs mt-0.5 whitespace-pre-wrap">
                        {item.answer?.trim() ? item.answer : <span className="italic text-muted-foreground">No answer given</span>}
                      </p>
                    </div>

                    {item.type === 'MCQ' && item.correct && (
                      <p className="text-[11px] text-muted-foreground">
                        Correct answer: <span className="text-green-700 font-medium">{item.correct}</span>
                      </p>
                    )}

                    {item.feedback && (
                      <div className="rounded-md border border-gold/30 bg-gold/10 p-2">
                        <p className="text-[10px] text-gold uppercase tracking-wide">AI feedback</p>
                        <p className="text-xs mt-0.5 whitespace-pre-wrap">{item.feedback}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Mark</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.maxMarks}
                        value={markOf(item)}
                        onChange={(e) => setOverrides((p) => ({ ...p, [item.questionId]: e.target.value }))}
                        className="h-8 w-20 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">/ {item.maxMarks}</span>
                      {changed && <span className="text-[10px] text-primary">was {item.marksAwarded}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <Label>Note for your records (optional)</Label>
              <Textarea value={note} onChange={(e) => setNoteOverride(e.target.value)} rows={2} placeholder="e.g. Q4 answer was incomplete but the method was correct — added 2 marks." />
            </div>

            {data.attempt.reviewStatus === 'REVIEWED' && data.attempt.reviewedAt && (
              <p className="text-[11px] text-muted-foreground">
                Reviewed {new Date(data.attempt.reviewedAt).toLocaleString()}. Saving again updates the released score.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {data?.hasEssay && (
            <Button variant="outline" onClick={remark} disabled={remarking || saving} className="sm:mr-auto">
              {remarking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Re-mark with AI
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading || !data} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save & release to student
            {adjustedCount > 0 && ` (${adjustedCount} changed)`}
          </Button>
        </DialogFooter>

        {data && !data.hasEssay && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <XCircle className="h-3 w-3" /> This assessment had no written answers — the score was calculated automatically.
            You can still change any mark.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
