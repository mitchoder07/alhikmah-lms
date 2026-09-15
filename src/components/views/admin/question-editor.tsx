'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/lms/image-upload'
import { Plus, X, FileText, ListChecks } from 'lucide-react'

// Shared question editor used by both the lesson quiz builder and the final exam
// builder. Supports multiple-choice and essay questions; an essay carries a
// marking guide (`rubric`) that the AI marks against.

export interface EditorQuestion {
  type: 'MCQ' | 'ESSAY'
  text: string
  options: string[]
  answer: number
  marks: number
  rubric: string
  imageUrl: string
}

export function emptyQuestion(type: 'MCQ' | 'ESSAY' = 'MCQ'): EditorQuestion {
  return {
    type,
    text: '',
    options: type === 'ESSAY' ? [] : ['', '', '', ''],
    answer: 0,
    marks: type === 'ESSAY' ? 10 : 1,
    rubric: '',
    imageUrl: '',
  }
}

/** Maps a question coming from the API or from an AI draft into editor state. */
export function toEditorQuestion(q: any): EditorQuestion {
  const type = String(q?.type || 'MCQ').toUpperCase() === 'ESSAY' ? 'ESSAY' : 'MCQ'
  if (type === 'ESSAY') {
    return { type, text: q.text || '', options: [], answer: 0, marks: Number(q.marks) || 10, rubric: q.rubric || '', imageUrl: q.imageUrl || '' }
  }
  const options: string[] = Array.isArray(q.options)
    ? q.options
    : typeof q.answerIndex === 'number'
      ? q.options ?? []
      : []
  return {
    type,
    text: q.text || '',
    options: options.length ? options : ['', '', '', ''],
    answer: Number(q.answer ?? q.answerIndex ?? 0) || 0,
    marks: Number(q.marks) || 1,
    rubric: q.rubric || '',
    imageUrl: q.imageUrl || '',
  }
}

/** Returns an error message, or null when every question is ready to save. */
export function validateQuestions(questions: EditorQuestion[]): string | null {
  if (!questions.length) return 'Add at least one question'
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.text.trim()) return `Question ${i + 1} has no text`
    if (q.type === 'MCQ') {
      const filled = q.options.filter((o) => o.trim()).length
      if (filled < 2) return `Question ${i + 1} needs at least 2 options`
      if (!q.options[q.answer]?.trim()) return `Question ${i + 1}: the selected correct answer is empty`
    } else if (!q.rubric.trim()) {
      return `Question ${i + 1}: add a marking guide so the AI knows what the marks are for`
    }
  }
  return null
}

/** Payload shape expected by the quiz / final-exam save endpoints. */
export function toApiQuestion(q: EditorQuestion) {
  return {
    type: q.type,
    text: q.text,
    options: q.type === 'ESSAY' ? [] : q.options.filter((o) => o.trim()),
    answer: q.type === 'ESSAY' ? 0 : q.answer,
    rubric: q.type === 'ESSAY' ? q.rubric : null,
    marks: Number(q.marks) || 1,
    imageUrl: q.imageUrl || null,
  }
}

export function QuestionCard({
  q, index, onChange, onRemove, onInsertBelow, canRemove, radioGroup,
}: {
  q: EditorQuestion
  index: number
  onChange: (next: EditorQuestion) => void
  onRemove: () => void
  onInsertBelow: (type: 'MCQ' | 'ESSAY') => void
  canRemove: boolean
  radioGroup: string
}) {
  const setOption = (idx: number, value: string) => {
    const options = [...q.options]
    options[idx] = value
    onChange({ ...q, options })
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Q{index + 1}</Badge>
          <div className="flex rounded-md border overflow-hidden">
            {(['MCQ', 'ESSAY'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...q, type: t, options: t === 'ESSAY' ? [] : (q.options.length ? q.options : ['', '', '', '']), marks: t === 'ESSAY' && q.marks <= 1 ? 10 : q.marks })}
                className={`px-2 py-0.5 text-[10px] flex items-center gap-1 ${q.type === t ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              >
                {t === 'MCQ' ? <ListChecks className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {t === 'MCQ' ? 'Multiple choice' : 'Essay'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Marks
            <Input
              type="number"
              min={1}
              max={100}
              value={q.marks}
              onChange={(e) => onChange({ ...q, marks: Number(e.target.value) || 1 })}
              className="h-7 w-14 text-xs"
            />
          </label>
          {canRemove && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <Input value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })} placeholder="Question text" />

      <ImageUpload value={q.imageUrl || null} onChange={(url) => onChange({ ...q, imageUrl: url ?? '' })} label="Question Image (optional)" />

      {q.type === 'MCQ' ? (
        <>
          <div className="space-y-1">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={radioGroup} checked={q.answer === oi} onChange={() => onChange({ ...q, answer: oi })} className="h-3 w-3" />
                <Input value={opt} onChange={(e) => setOption(oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="text-xs h-8" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Select the radio button next to the correct answer. Graded automatically.</p>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Marking guide / model answer</Label>
          <Textarea
            value={q.rubric}
            onChange={(e) => onChange({ ...q, rubric: e.target.value })}
            rows={4}
            className="text-xs"
            placeholder="What the marks are for, point by point. e.g. 2 marks for defining price elasticity; 3 marks for the formula and a worked example; 2 marks for distinguishing elastic vs inelastic; 3 marks for a Nigerian example."
          />
          <p className="text-[10px] text-muted-foreground">
            The AI marks each student answer against this guide, then you check and adjust it in the Gradebook.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onInsertBelow('MCQ')}>
          <Plus className="h-3 w-3 mr-1" /> MCQ below
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onInsertBelow('ESSAY')}>
          <Plus className="h-3 w-3 mr-1" /> Essay below
        </Button>
      </div>
    </div>
  )
}
