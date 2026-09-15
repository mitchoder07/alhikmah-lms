'use client'

import { useApi, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ChevronLeft, Plus, Trash2, FileText, Video, File, Download, Pencil, GripVertical, Play, Loader2, X, Upload, PlusCircle, Radio, FileCheck, Brain } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { FinalExamEditor } from './final-exam-editor'
import { ImageUpload } from '@/components/lms/image-upload'
import {
  QuestionCard, emptyQuestion, toEditorQuestion, toApiQuestion, validateQuestions,
  type EditorQuestion,
} from './question-editor'
import type { AssessmentDraft } from './ai-assistant'

interface CourseData {
  course: {
    id: string; code: string; title: string; description: string; level: string; certificateFee: number
    liveClassUrl?: string | null; liveClassTitle?: string | null; liveClassScheduledAt?: string | null
    lecturer: { name: string }
    modules: Array<{
      id: string; title: string; description?: string | null; position: number
      lessons: Array<{
        id: string; title: string; description?: string | null; content?: string | null; videoUrl?: string | null; duration: number; position: number; isPreview: boolean
        files: Array<{ id: string; filename: string; fileUrl: string; fileType: string; fileSize: number }>
        quizzes: Array<{ id: string; title: string; passMark: number; questions: Array<{ id: string; text: string; options: string; answer: string; marks: number }> }>
      }>
    }>
  }
}

export function AdminCourseBuilder({
  courseId, onNavigate, openQuizLessonId, quizDraft, openFinalExam, examDraft,
}: {
  courseId: string
  onNavigate: (v: string, p?: any) => void
  /** set when arriving from the AI assistant with a drafted quiz */
  openQuizLessonId?: string | null
  quizDraft?: AssessmentDraft | null
  /** set when arriving from the AI assistant with a drafted final exam */
  openFinalExam?: boolean
  examDraft?: AssessmentDraft | null
}) {
  const { data, loading, refetch } = useApi<CourseData>(`/api/courses/${courseId}`)
  const course = data?.course

  const [moduleOpen, setModuleOpen] = useState(false)
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' })
  const [lessonModal, setLessonModal] = useState<{ moduleId: string; lesson?: any } | null>(null)
  // Arriving from the AI assistant opens the matching builder straight away
  const [quizModal, setQuizModal] = useState<{ lessonId: string; draft?: AssessmentDraft | null } | null>(
    openQuizLessonId ? { lessonId: openQuizLessonId, draft: quizDraft ?? null } : null
  )
  const [examModal, setExamModal] = useState<{ draft?: AssessmentDraft | null } | null>(
    openFinalExam ? { draft: examDraft ?? null } : null
  )
  const [liveClassOpen, setLiveClassOpen] = useState(false)

  const addModule = async () => {
    try {
      await apiPost(`/api/admin/courses/${courseId}/modules`, { ...moduleForm, position: course?.modules.length ?? 0 })
      toast.success('Module added')
      setModuleOpen(false)
      setModuleForm({ title: '', description: '' })
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  const deleteModule = async (id: string) => {
    if (!confirm('Delete this module and all its lessons?')) return
    try {
      await apiDelete(`/api/admin/modules/${id}`)
      toast.success('Module deleted')
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  const deleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return
    try {
      await apiDelete(`/api/admin/lessons/${id}`)
      toast.success('Lesson deleted')
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  const deleteFile = async (lessonId: string, fileId: string) => {
    try {
      await apiDelete(`/api/admin/lessons/${lessonId}/files/${fileId}`)
      toast.success('File removed')
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  if (loading || !course) {
    return <div className="text-sm text-muted-foreground">Loading course builder…</div>
  }

  return (
    <div className="space-y-4">
      <button onClick={() => onNavigate('courses')} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
        <ChevronLeft className="h-3 w-3" /> Back to courses
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{course.code}</Badge>
            <Badge variant="secondary">{course.level} Level</Badge>
          </div>
          <h2 className="text-2xl font-bold">{course.title}</h2>
          <p className="text-sm text-muted-foreground">{course.lecturer.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setLiveClassOpen(true)} className={course.liveClassUrl ? 'border-primary/30 text-primary' : ''}>
            <Radio className="h-4 w-4 mr-1" /> {course.liveClassUrl ? 'Edit Live Class' : 'Set Live Class'}
          </Button>
          <Button variant="outline" onClick={() => setExamModal({})}>
            <FileCheck className="h-4 w-4 mr-1" /> Final Exam
          </Button>
          <Button onClick={() => setModuleOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1" /> Add Module
          </Button>
        </div>
      </div>

      {/* Modules & lessons */}
      <div className="space-y-3">
        {course.modules.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No modules yet. Click "Add Module" to get started.</CardContent></Card>
        ) : (
          <Accordion type="multiple" defaultValue={course.modules.map(m => m.id)} className="space-y-3">
            {course.modules.map((m, mi) => (
              <AccordionItem key={m.id} value={m.id} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{mi + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <p className="text-[10px] text-muted-foreground">{m.lessons.length} lessons</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {m.lessons.length === 0 && <p className="text-xs text-muted-foreground py-2">No lessons in this module yet.</p>}
                    {m.lessons.map((l, li) => (
                      <div key={l.id} className="border rounded-lg p-3 bg-card">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">Lesson {li + 1}</span>
                              {l.isPreview && <Badge variant="secondary" className="text-[9px] py-0">Preview</Badge>}
                              {l.videoUrl && <Badge variant="secondary" className="text-[9px] py-0 bg-primary/10 text-primary"><Video className="h-2.5 w-2.5 mr-0.5" /> Video</Badge>}
                            </div>
                            <p className="font-medium text-sm">{l.title}</p>
                            {l.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{l.description}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">{l.duration} min · {l.files.length} files · {l.quizzes.length} quizzes</p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLessonModal({ moduleId: m.id, lesson: l })}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteLesson(l.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Files */}
                        {l.files.length > 0 && (
                          <div className="space-y-1 mt-2 pt-2 border-t">
                            {l.files.map((f) => (
                              <div key={f.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-secondary/50">
                                {f.fileType === 'video' ? <Video className="h-3 w-3 text-primary" /> :
                                 f.fileType === 'image' ? <FileText className="h-3 w-3 text-primary" /> :
                                 <File className="h-3 w-3 text-primary" />}
                                <a href={f.fileUrl} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-primary">{f.filename}</a>
                                <span className="text-[10px] text-muted-foreground">{(f.fileSize/1024).toFixed(0)}KB</span>
                                <button onClick={() => deleteFile(l.id, f.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 mt-2 pt-2 border-t">
                          <FileUploader lessonId={l.id} onDone={refetch} />
                          <Button size="sm" variant="outline" onClick={() => setLessonModal({ moduleId: m.id, lesson: l })}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          {l.quizzes.length > 0 ? (
                            <Button size="sm" variant="outline" onClick={() => setQuizModal({ lessonId: l.id })}>
                              <Play className="h-3 w-3 mr-1" /> View Quiz
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setQuizModal({ lessonId: l.id })}>
                              <PlusCircle className="h-3 w-3 mr-1" /> Add Quiz
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => setLessonModal({ moduleId: m.id })}>
                      <Plus className="h-3 w-3 mr-1" /> Add Lesson
                    </Button>
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => deleteModule(m.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3 mr-1" /> Delete Module
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Module dialog */}
      <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Module Title</Label>
              <Input value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="Module 1: Introduction to..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleOpen(false)}>Cancel</Button>
            <Button onClick={addModule} disabled={!moduleForm.title} className="bg-primary hover:bg-primary/90">Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson dialog */}
      {lessonModal && (
        <LessonEditor
          moduleId={lessonModal.moduleId}
          lesson={lessonModal.lesson}
          courseId={courseId}
          onClose={() => setLessonModal(null)}
          onSaved={() => { setLessonModal(null); refetch() }}
        />
      )}

      {/* Final exam dialog */}
      {examModal && (
        <FinalExamEditor
          courseId={course.id}
          initialDraft={examModal.draft}
          onClose={() => setExamModal(null)}
        />
      )}

      {/* Quiz dialog */}
      {quizModal && (
        <QuizEditor
          lessonId={quizModal.lessonId}
          courseId={courseId}
          initialDraft={quizModal.draft}
          onClose={() => setQuizModal(null)}
          onSaved={() => { setQuizModal(null); refetch() }}
        />
      )}

      {/* Live class dialog */}
      {liveClassOpen && (
        <LiveClassEditor
          course={course}
          onClose={() => setLiveClassOpen(false)}
          onSaved={() => { setLiveClassOpen(false); refetch() }}
        />
      )}
    </div>
  )
}

function LiveClassEditor({ course, onClose, onSaved }: { course: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    liveClassUrl: course.liveClassUrl || '',
    liveClassTitle: course.liveClassTitle || '',
    liveClassScheduledAt: course.liveClassScheduledAt ? new Date(course.liveClassScheduledAt).toISOString().slice(0, 16) : '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await apiPatch(`/api/courses/${course.id}`, {
        liveClassUrl: form.liveClassUrl || null,
        liveClassTitle: form.liveClassTitle || null,
        liveClassScheduledAt: form.liveClassScheduledAt ? new Date(form.liveClassScheduledAt).toISOString() : null,
      })
      toast.success('Live class updated')
      onSaved()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const clear = async () => {
    setSaving(true)
    try {
      await apiPatch(`/api/courses/${course.id}`, {
        liveClassUrl: null,
        liveClassTitle: null,
        liveClassScheduledAt: null,
      })
      toast.success('Live class removed')
      onSaved()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Live Class Link</DialogTitle>
          <DialogDescription>Paste a Zoom, Google Meet, or Microsoft Teams link. Students will see a "Join Live Class" button when a link is set.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Live Class Title</Label>
            <Input value={form.liveClassTitle} onChange={(e) => setForm({ ...form, liveClassTitle: e.target.value })} placeholder="e.g. Week 5 Live Lecture: Elasticity" />
          </div>
          <div className="space-y-1.5">
            <Label>Meeting URL</Label>
            <Input value={form.liveClassUrl} onChange={(e) => setForm({ ...form, liveClassUrl: e.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx or https://zoom.us/j/..." />
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled Time (optional)</Label>
            <Input type="datetime-local" value={form.liveClassScheduledAt} onChange={(e) => setForm({ ...form, liveClassScheduledAt: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {course.liveClassUrl && (
            <Button variant="ghost" onClick={clear} disabled={saving} className="text-destructive sm:mr-auto">
              Remove Live Class
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FileUploader({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error('File too large. Maximum 4MB.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/lessons/${lessonId}/files`, { method: 'POST', body: fd })
      const text = await res.text()
      if (!text) throw new Error('Upload failed. File may be too large (max 4MB).')
      let json
      try { json = JSON.parse(text) } catch { throw new Error('Server error during upload.') }
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      toast.success(`Uploaded: ${file.name}`)
      onDone()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,video/*,audio/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }}
      />
      <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
        Upload File
      </Button>
    </>
  )
}

function LessonEditor({ moduleId, lesson, courseId, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    content: lesson?.content || '',
    videoUrl: lesson?.videoUrl || '',
    duration: String(lesson?.duration || 0),
    isPreview: lesson?.isPreview || false,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      if (lesson) {
        await apiPatch(`/api/admin/lessons/${lesson.id}`, { ...form, duration: Number(form.duration) })
      } else {
        await apiPost('/api/admin/lessons', { ...form, moduleId, duration: Number(form.duration) })
      }
      toast.success(lesson ? 'Lesson updated' : 'Lesson created')
      onSaved()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Lesson Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Content (text/notes)</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Video URL (YouTube, MP4, or any video link)</Label>
              <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              <p className="text-[11px] text-muted-foreground">Paste any YouTube link (watch or embed), YouTube short link, or direct video URL. We'll convert it automatically.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isPreview} onChange={(e) => setForm({ ...form, isPreview: e.target.checked })} className="rounded" />
            <span>Mark as preview (anyone can watch without enrolling)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.title} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {lesson ? 'Save Changes' : 'Create Lesson'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QuizEditor({
  lessonId, courseId, onClose, onSaved, initialDraft,
}: {
  lessonId: string
  courseId: string
  onClose: () => void
  onSaved: () => void
  /** questions drafted by the AI assistant, pre-filled for review */
  initialDraft?: AssessmentDraft | null
}) {
  // An AI draft, when present, is the starting point, so there is nothing to fetch
  const draft = initialDraft?.questions?.length ? initialDraft : null
  const [title, setTitle] = useState(draft?.title || '')
  const [passMark, setPassMark] = useState(String(draft?.passMark ?? 50))
  const [questions, setQuestions] = useState<EditorQuestion[]>(
    draft ? draft.questions.map(toEditorQuestion) : [emptyQuestion('MCQ')]
  )
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!draft)
  const [existingQuizId, setExistingQuizId] = useState<string | null>(null)
  void courseId

  // Fetch the stored quiz for this lesson
  useEffect(() => {
    if (draft) return
    fetch(`/api/admin/quizzes?lessonId=${lessonId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.quiz) {
          setExistingQuizId(data.quiz.id)
          setTitle(data.quiz.title || '')
          setPassMark(String(data.quiz.passMark || 50))
          if (data.quiz.questions && data.quiz.questions.length > 0) {
            setQuestions(data.quiz.questions.map(toEditorQuestion))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lessonId, draft])

  const updateQ = (i: number, next: EditorQuestion) =>
    setQuestions(prev => prev.map((q, idx) => (idx === i ? next : q)))

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
      await apiPost('/api/admin/quizzes', {
        lessonId,
        title,
        passMark: Number(passMark),
        questions: questions.map(toApiQuestion),
      })
      toast.success(existingQuizId ? 'Quiz updated' : 'Quiz created')
      onSaved()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const essayCount = questions.filter(q => q.type === 'ESSAY').length

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loading ? 'Loading...' : existingQuizId ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
          <DialogDescription>
            Mix multiple choice with essay questions. Multiple choice is graded instantly; essays are marked by the AI
            against your marking guide and released after you approve them in the Gradebook.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading quiz...</span>
            </div>
          ) : (
            <>
          {draft ? (
            <div className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs flex items-start gap-2">
              <Brain className="h-4 w-4 text-gold mt-0.5 shrink-0" />
              <p>
                <strong>AI draft loaded: {draft.questions.length} questions.</strong> Check every question and
                marking guide before saving. Nothing reaches students until you do.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quiz Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson Quiz" />
            </div>
            <div className="space-y-1.5">
              <Label>Pass Mark (%)</Label>
              <Input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-sm font-semibold">
              Questions ({questions.length})
              {essayCount > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{essayCount} essay</Badge>}
            </Label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, emptyQuestion('MCQ')])}>+ Multiple choice</Button>
              <Button size="sm" variant="outline" onClick={() => setQuestions([...questions, emptyQuestion('ESSAY')])}>+ Essay</Button>
            </div>
          </div>

          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              q={q}
              index={i}
              radioGroup={`quiz-answer-${i}`}
              canRemove={questions.length > 1}
              onChange={(next) => updateQ(i, next)}
              onRemove={() => setQuestions(questions.filter((_, idx) => idx !== i))}
              onInsertBelow={(type) => insertQ(i, type)}
            />
          ))}
            </>
          )}
        </div>
        <DialogFooter>
          {existingQuizId && (
            <Button variant="ghost" onClick={async () => {
              if (!confirm('Delete this quiz? All student attempts will be kept but the quiz will no longer be available.')) return
              try {
                await apiDelete(`/api/admin/quizzes/${existingQuizId}`)
                toast.success('Quiz deleted')
                onSaved()
              } catch (e: any) { toast.error(e.message) }
            }} className="text-destructive mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Delete Quiz
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading} className="bg-primary hover:bg-primary/90">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</> : (existingQuizId ? 'Update Quiz' : 'Create Quiz')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
