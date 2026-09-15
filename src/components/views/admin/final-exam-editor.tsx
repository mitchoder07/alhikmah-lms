'use client'

import { useState } from 'react'
import { useApi, apiPost, apiDelete } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, FileCheck, Save, Brain } from 'lucide-react'
import { toast } from 'sonner'
import {
  QuestionCard, emptyQuestion, toEditorQuestion, toApiQuestion, validateQuestions,
  type EditorQuestion,
} from './question-editor'
import type { AssessmentDraft } from './ai-assistant'

export function FinalExamButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileCheck className="h-4 w-4 mr-1" /> Final Exam
      </Button>
      {open && <FinalExamEditor courseId={courseId} onClose={() => setOpen(false)} />}
    </>
  )
}

export function FinalExamEditor({
  courseId, onClose, initialDraft,
}: {
  courseId: string
  onClose: () => void
  /** questions drafted by the AI assistant, pre-filled for review */
  initialDraft?: AssessmentDraft | null
}) {
  const { data, loading } = useApi<{ exam: any }>(`/api/admin/courses/${courseId}/final-exam`)

  if (loading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <FinalExamForm
      // Remount so the stored exam / AI draft is picked up as initial state
      key={data?.exam?.id ?? 'new'}
      courseId={courseId}
      existing={data?.exam ?? null}
      initialDraft={initialDraft}
      onClose={onClose}
    />
  )
}

function FinalExamForm({
  courseId, existing, initialDraft, onClose,
}: {
  courseId: string
  existing: any | null
  initialDraft?: AssessmentDraft | null
  onClose: () => void
}) {
  // An AI draft takes priority over the stored exam, because the lecturer asked for it
  const draft = initialDraft?.questions?.length ? initialDraft : null
  const [title, setTitle] = useState(draft?.title || existing?.title || 'Final Exam')
  const [description, setDescription] = useState(draft?.description ?? existing?.description ?? '')
  const [passMark, setPassMark] = useState(String(draft?.passMark ?? existing?.passMark ?? 50))
  const [timeLimit, setTimeLimit] = useState(String(existing?.timeLimit ?? 0))
  const [maxAttempts, setMaxAttempts] = useState(String(existing?.maxAttempts ?? 3))
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    draft
      ? draft.questions.map(toEditorQuestion)
      : existing?.questions?.length
        ? existing.questions.map(toEditorQuestion)
        : [emptyQuestion('MCQ')]
  )
  const [saving, setSaving] = useState(false)

  const updateQ = (i: number, next: EditorQuestion) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? next : q)))

  const insertQ = (i: number, type: 'MCQ' | 'ESSAY') => {
    const next = [...questions]
    next.splice(i + 1, 0, emptyQuestion(type))
    setQuestions(next)
  }

  const save = async () => {
    const problem = validateQuestions(questions)
    if (problem) return toast.error(problem)

    setSaving(true)
    try {
      await apiPost(`/api/admin/courses/${courseId}/final-exam`, {
        title,
        description,
        passMark: Number(passMark),
        timeLimit: Number(timeLimit),
        maxAttempts: Number(maxAttempts),
        questions: questions.map(toApiQuestion),
      })
      toast.success('Final exam saved')
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this final exam? All student attempts will be lost.')) return
    setSaving(true)
    try {
      await apiDelete(`/api/admin/courses/${courseId}/final-exam`)
      toast.success('Final exam deleted')
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const essayCount = questions.filter((q) => q.type === 'ESSAY').length

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" /> Final Exam Builder
          </DialogTitle>
          <DialogDescription>
            Students must pass this exam to qualify for the certificate. Mix multiple choice with essay questions.
            Essays are marked by the AI and released only after you approve them.
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs flex items-start gap-2">
            <Brain className="h-4 w-4 text-gold mt-0.5 shrink-0" />
            <p>
              <strong>AI draft loaded: {draft.questions.length} questions.</strong> Check every question and
              marking guide below before saving. Nothing reaches students until you do.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Exam Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Final Exam" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Instructions for students..." />
              </div>
              <div className="space-y-1.5">
                <Label>Pass Mark (%)</Label>
                <Input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Attempts</Label>
                <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Time Limit (minutes, 0 = none)</Label>
                <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-sm font-semibold">
                  Questions ({questions.length})
                  {essayCount > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{essayCount} essay</Badge>}
                </Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, emptyQuestion('MCQ')])}>
                    + Multiple choice
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, emptyQuestion('ESSAY')])}>
                    + Essay
                  </Button>
                </div>
              </div>

              {questions.map((q, i) => (
                <QuestionCard
                  key={i}
                  q={q}
                  index={i}
                  radioGroup={`exam-answer-${i}`}
                  canRemove={questions.length > 1}
                  onChange={(next) => updateQ(i, next)}
                  onRemove={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                  onInsertBelow={(type) => insertQ(i, type)}
                />
              ))}
            </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existing && (
            <Button variant="ghost" onClick={remove} disabled={saving} className="text-destructive sm:mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Delete Exam
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Final Exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
