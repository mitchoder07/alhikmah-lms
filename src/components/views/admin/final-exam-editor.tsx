'use client'

import { useState, useEffect } from 'react'
import { useApi, apiPost, apiDelete } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, FileCheck, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/lms/image-upload'

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

function FinalExamEditor({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { data, loading } = useApi<{ exam: any }>(`/api/admin/courses/${courseId}/final-exam`)
  const [title, setTitle] = useState('Final Exam')
  const [description, setDescription] = useState('')
  const [passMark, setPassMark] = useState('50')
  const [timeLimit, setTimeLimit] = useState('0')
  const [maxAttempts, setMaxAttempts] = useState('3')
  const [questions, setQuestions] = useState<Array<{ text: string; options: string[]; answer: number; marks?: number; imageUrl?: string }>>([
    { text: '', options: ['', '', '', ''], answer: 0, imageUrl: '' }
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.exam) {
      setTitle(data.exam.title || 'Final Exam')
      setDescription(data.exam.description || '')
      setPassMark(String(data.exam.passMark || 50))
      setTimeLimit(String(data.exam.timeLimit || 0))
      setMaxAttempts(String(data.exam.maxAttempts || 3))
      if (data.exam.questions?.length > 0) {
        setQuestions(data.exam.questions.map((q: any) => ({
          text: q.text,
          options: q.options,
          answer: Number(q.answer),
          marks: q.marks,
          imageUrl: q.imageUrl || '',
        })))
      }
    }
  }, [data])

  const updateQ = (i: number, field: 'text' | 'options' | 'answer' | 'marks' | 'imageUrl', val: any) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== i) return q
      if (field === 'options') {
        const opts = [...q.options]
        opts[val.idx] = val.value
        return { ...q, options: opts }
      }
      return { ...q, [field]: val }
    }))
  }

  const addQ = () => setQuestions([...questions, { text: '', options: ['', '', '', ''], answer: 0, imageUrl: '' }])
  const insertQ = (i: number) => {
    const next = [...questions]
    next.splice(i + 1, 0, { text: '', options: ['', '', '', ''], answer: 0, imageUrl: '' })
    setQuestions(next)
  }
  const removeQ = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!title || questions.some(q => !q.text || q.options.some(o => !o))) {
      toast.error('Please fill all questions and options')
      return
    }
    setSaving(true)
    try {
      await apiPost(`/api/admin/courses/${courseId}/final-exam`, {
        title,
        description,
        passMark: Number(passMark),
        timeLimit: Number(timeLimit),
        maxAttempts: Number(maxAttempts),
        questions: questions.map(q => ({
          text: q.text,
          options: q.options,
          answer: q.answer,
          marks: q.marks,
          imageUrl: q.imageUrl || null,
        })),
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" /> Final Exam Builder
          </DialogTitle>
          <DialogDescription>Students must pass this exam to qualify for the certificate. Set a pass mark and add questions.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Settings */}
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
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Questions ({questions.length})</Label>
                <Button size="sm" variant="outline" onClick={addQ}><Plus className="h-3 w-3 mr-1" /> Add Question</Button>
              </div>

              {questions.map((q, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Q{i + 1}</Badge>
                    {questions.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeQ(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Input value={q.text} onChange={(e) => updateQ(i, 'text', e.target.value)} placeholder="Question text" />
                  <ImageUpload
                    value={q.imageUrl || null}
                    onChange={(url) => updateQ(i, 'imageUrl', url ?? '')}
                    label="Question Image (optional)"
                  />
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`answer-${i}`} checked={q.answer === oi} onChange={() => updateQ(i, 'answer', oi)} className="h-3 w-3" />
                        <Input value={opt} onChange={(e) => updateQ(i, 'options', { idx: oi, value: e.target.value })} placeholder={`Option ${oi + 1}`} className="text-xs h-8" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Select the radio button next to the correct answer.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => insertQ(i)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Question Below
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addQ} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Question</Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {data?.exam && (
            <Button variant="ghost" onClick={remove} disabled={saving} className="text-destructive sm:mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Delete Exam
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Final Exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
