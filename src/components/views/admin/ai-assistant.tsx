'use client'

import { useState, useEffect, useRef } from 'react'
import { useApi, apiPost, apiDelete } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useSession } from '@/components/app-provider'
import {
  Sparkles, Upload, FileText, Trash2, Loader2, Send, Bot, Settings2, Eye,
  Wand2, CheckCircle2, AlertCircle, ArrowRight, Library, Brain, KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'

interface Course { id: string; code: string; title: string; lecturerId?: string }
interface AiDoc {
  id: string; title: string; filename: string; fileType: string; fileSize: number
  charCount: number; courseId: string | null; createdAt: string
  course: { id: string; code: string; title: string } | null
  owner: { id: string; name: string }
}
export interface GeneratedQuestion {
  type: 'MCQ' | 'ESSAY'
  text: string
  options: string[]
  answerIndex: number
  marks: number
  rubric: string
}
export interface AssessmentDraft {
  title: string
  description: string
  passMark: number
  questions: GeneratedQuestion[]
}
interface GenerateMeta {
  target: 'quiz' | 'exam'
  courseId: string
  lessonId: string | null
  generated: number
  mcq: number
  essay: number
  sources: string[]
}

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy — recall and definitions' },
  { id: 'medium', label: 'Medium — application and short reasoning' },
  { id: 'hard', label: 'Hard — analysis, evaluation and calculation' },
]

export function AdminAiAssistant({ onNavigate }: { onNavigate: (v: string, p?: Record<string, any>) => void }) {
  const { user } = useSession()
  const { data: coursesData } = useApi<{ courses: Course[] }>('/api/courses')
  const { data: docsData, refetch: refetchDocs } = useApi<{ documents: AiDoc[] }>('/api/admin/ai/documents')

  const courses = (coursesData?.courses ?? []).filter((c) => user?.role === 'ADMIN' || !c.lecturerId || c.lecturerId === user?.id)
  const documents = docsData?.documents ?? []

  const handOff = (draft: AssessmentDraft, meta: GenerateMeta) => {
    if (meta.target === 'exam') {
      onNavigate('course-builder', { courseId: meta.courseId, openFinalExam: true, examDraft: draft })
    } else {
      onNavigate('course-builder', { courseId: meta.courseId, openQuizLessonId: meta.lessonId, quizDraft: draft })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" /> AI Assistant
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your handouts, then have the AI set quizzes and final exams from them — including essay questions
            with marking guides. It also marks the written answers, ready for you to check in the Gradebook.
          </p>
        </div>
        {user?.role === 'ADMIN' && <AiSettingsButton />}
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate"><Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate assessment</TabsTrigger>
          <TabsTrigger value="documents"><Library className="h-3.5 w-3.5 mr-1.5" /> Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="chat"><Brain className="h-3.5 w-3.5 mr-1.5" /> Ask the AI</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <GeneratePanel courses={courses} documents={documents} onHandOff={handOff} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPanel courses={courses} documents={documents} refetch={refetchDocs} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatPanel courses={courses} documents={documents} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Generate ─────────────────────────────────────────────────────────────────

function GeneratePanel({
  courses, documents, onHandOff,
}: {
  courses: Course[]
  documents: AiDoc[]
  onHandOff: (draft: AssessmentDraft, meta: GenerateMeta) => void
}) {
  const [target, setTarget] = useState<'quiz' | 'exam'>('quiz')
  const [courseId, setCourseId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [count, setCount] = useState('10')
  const [essayCount, setEssayCount] = useState('2')
  const [difficulty, setDifficulty] = useState('medium')
  const [marksPerMcq, setMarksPerMcq] = useState('1')
  const [marksPerEssay, setMarksPerEssay] = useState('10')
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<AssessmentDraft | null>(null)
  const [meta, setMeta] = useState<GenerateMeta | null>(null)

  // Lessons of the chosen course, for lesson quizzes
  const { data: courseDetail } = useApi<{ course: any }>(courseId ? `/api/courses/${courseId}` : null)
  const lessons: Array<{ id: string; title: string; module: { title: string } }> =
    courseDetail?.course?.modules?.flatMap((m: any) => m.lessons.map((l: any) => ({ ...l, module: { title: m.title } }))) ?? []

  const courseDocs = documents.filter((d) => !d.courseId || d.courseId === courseId)
  const total = Number(count) || 0
  const essays = Math.min(Number(essayCount) || 0, total)

  const generate = async () => {
    if (!courseId) return toast.error('Choose a course first')
    if (target === 'quiz' && !lessonId) return toast.error('Choose the lesson this quiz belongs to')
    if (total < 1) return toast.error('Set how many questions you want')

    setGenerating(true)
    setDraft(null)
    try {
      const res = await apiPost('/api/admin/ai/generate', {
        target, courseId,
        lessonId: target === 'quiz' ? lessonId : undefined,
        count: total, essayCount: essays, difficulty,
        marksPerMcq: Number(marksPerMcq) || 1,
        marksPerEssay: Number(marksPerEssay) || 10,
        topic: topic || undefined,
        instructions: instructions || undefined,
        documentIds: selectedDocs,
      })
      setDraft(res.draft)
      setMeta(res.meta)
      toast.success(`${res.meta.generated} questions drafted`)
    } catch (e: any) {
      toast.error(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (draft && meta) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Draft ready — {draft.questions.length} questions
          </CardTitle>
          <CardDescription>
            {meta.mcq} multiple choice · {meta.essay} essay · {meta.sources.length ? `from ${meta.sources.join(', ')}` : 'from course material'}
            {meta.generated < meta.mcq + meta.essay ? ' — some AI questions were unusable and were dropped' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-secondary/30 p-3 text-sm">
            <p className="font-medium">{draft.title}</p>
            {draft.description && <p className="text-xs text-muted-foreground mt-1">{draft.description}</p>}
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {draft.questions.map((q, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={q.type === 'ESSAY' ? 'secondary' : 'outline'} className="text-[9px]">
                        {q.type === 'ESSAY' ? `Essay · ${q.marks} marks` : `MCQ · ${q.marks} mark${q.marks > 1 ? 's' : ''}`}
                      </Badge>
                    </div>
                    <p className="text-sm">{q.text}</p>
                  </div>
                </div>
                {q.type === 'MCQ' ? (
                  <ul className="space-y-1 pl-8 text-xs">
                    {q.options.map((o, oi) => (
                      <li key={oi} className={oi === q.answerIndex ? 'text-green-700 font-medium' : 'text-muted-foreground'}>
                        {String.fromCharCode(65 + oi)}. {o} {oi === q.answerIndex && <CheckCircle2 className="h-3 w-3 inline" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  q.rubric && (
                    <div className="ml-8 rounded-md bg-gold/10 border border-gold/20 p-2">
                      <p className="text-[10px] font-medium text-gold uppercase tracking-wide">Marking guide</p>
                      <p className="text-xs whitespace-pre-wrap mt-0.5">{q.rubric}</p>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => onHandOff(draft, meta)} className="bg-primary hover:bg-primary/90">
              {meta.target === 'exam' ? 'Open in Final Exam Builder' : 'Open in Quiz Builder'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" onClick={() => { setDraft(null); setMeta(null) }}>
              Edit the request instead
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Nothing is published yet — the questions open in the builder so you can change or remove any of them before saving.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What should the AI set?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['quiz', 'exam'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`rounded-lg border p-3 text-left text-sm transition ${target === t ? 'border-primary bg-primary/5' : 'hover:bg-secondary/50'}`}
              >
                <p className="font-medium">{t === 'quiz' ? 'Lesson quiz' : 'Final exam'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t === 'quiz' ? 'Attached to one lesson' : 'End of course, gates the certificate'}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Course</Label>
            <select
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setLessonId('') }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
          </div>

          {target === 'quiz' && (
            <div className="space-y-1.5">
              <Label>Lesson</Label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={!courseId}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{courseId ? 'Select a lesson…' : 'Choose a course first'}</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.module.title} — {l.title}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total questions</Label>
              <Input type="number" min={1} max={40} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Of which essay</Label>
              <Input type="number" min={0} max={total} value={essayCount} onChange={(e) => setEssayCount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Marks per MCQ</Label>
              <Input type="number" min={1} max={10} value={marksPerMcq} onChange={(e) => setMarksPerMcq(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Marks per essay</Label>
              <Input type="number" min={1} max={50} value={marksPerEssay} onChange={(e) => setMarksPerEssay(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Topic focus (optional)</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. elasticity of demand and government tax policy" />
          </div>

          <div className="space-y-1.5">
            <Label>Extra instructions (optional)</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. Include one calculation question on GDP deflator. Avoid questions on the Solow model — we cover it next semester."
            />
          </div>

          <Button onClick={generate} disabled={generating} className="w-full bg-primary hover:bg-primary/90">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            {generating ? 'Drafting questions…' : 'Generate questions'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Source material</CardTitle>
          <CardDescription>
            Tick the documents the questions must come from. Leave all unticked to use the course lessons instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {courseDocs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No documents for this course yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a handout in the Documents tab and the AI will set questions straight from it.
              </p>
            </div>
          ) : (
            courseDocs.map((d) => {
              const checked = selectedDocs.includes(d.id)
              return (
                <label
                  key={d.id}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer text-sm ${checked ? 'border-primary bg-primary/5' : 'hover:bg-secondary/40'}`}
                >
                  <Switch
                    checked={checked}
                    onCheckedChange={(v) => setSelectedDocs((prev) => (v ? [...prev, d.id] : prev.filter((x) => x !== d.id)))}
                    className="mt-0.5 scale-75"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-xs">{d.title}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {d.fileType.toUpperCase()} · {Math.round(d.charCount / 1000)}k chars
                      {d.course ? ` · ${d.course.code}` : ' · department-wide'}
                    </span>
                  </span>
                </label>
              )
            })
          )}
          <p className="text-[11px] text-muted-foreground pt-1">
            {selectedDocs.length ? `${selectedDocs.length} document(s) selected` : 'Using course lesson content'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Documents ────────────────────────────────────────────────────────────────

function DocumentsPanel({
  courses, documents, refetch,
}: { courses: Course[]; documents: AiDoc[]; refetch: () => void }) {
  const { user } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [courseId, setCourseId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<{ doc: AiDoc; content: string } | null>(null)
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    let ok = 0
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      if (courseId) form.append('courseId', courseId)
      try {
        const res = await fetch('/api/admin/ai/documents', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)
        ok++
        if (data.truncated) toast.info(`"${file.name}" was long — the first part is stored.`)
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message}`)
      }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    if (ok) {
      toast.success(`${ok} document${ok > 1 ? 's' : ''} ready for the AI`)
      refetch()
    }
  }

  const remove = async (doc: AiDoc) => {
    if (!confirm(`Remove "${doc.title}"? The AI will no longer use it.`)) return
    try {
      await apiDelete(`/api/admin/ai/documents/${doc.id}`)
      toast.success('Document removed')
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const view = async (doc: AiDoc) => {
    setLoadingDoc(doc.id)
    try {
      const res = await fetch(`/api/admin/ai/documents/${doc.id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load')
      setViewing({ doc, content: data.document.content })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingDoc(null)
    }
  }

  const canDelete = (d: AiDoc) => user?.role === 'ADMIN' || d.owner.id === user?.id

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Upload for the AI to digest</CardTitle>
          <CardDescription>
            PDF, Word (.docx) or plain text, up to 15MB. Text is read out on upload and used to set questions and to
            mark essay answers. Nothing is shared with students.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5 min-w-[220px] flex-1">
              <Label>Attach to a course (optional)</Label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Department-wide (all courses)</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="bg-primary hover:bg-primary/90">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              {uploading ? 'Reading documents…' : 'Choose files'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Library className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No documents yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload a handout and ask the AI to set a quiz from it.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{d.filename}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">{d.fileType.toUpperCase()}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {Math.round(d.fileSize / 1024)}KB · {d.charCount.toLocaleString()} characters
                  {d.course ? ` · ${d.course.code}` : ' · department-wide'}
                </p>
                <p className="text-[10px] text-muted-foreground">Uploaded by {d.owner.name}</p>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => view(d)} disabled={loadingDoc === d.id}>
                    {loadingDoc === d.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    Text
                  </Button>
                  {canDelete(d) && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove(d)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{viewing?.doc.title}</DialogTitle>
            <DialogDescription>Text the AI reads from this file</DialogDescription>
          </DialogHeader>
          <pre className="text-[11px] whitespace-pre-wrap font-sans bg-secondary/40 rounded-lg p-3 max-h-[60vh] overflow-y-auto">
            {viewing?.content}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Chat ─────────────────────────────────────────────────────────────────────

interface Msg { role: 'user' | 'assistant'; content: string }

function ChatPanel({ courses, documents }: { courses: Course[]; documents: AiDoc[] }) {
  const [courseId, setCourseId] = useState('')
  const [docIds, setDocIds] = useState<string[]>([])
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        "Assalamu alaikum. I can help you prepare teaching material: explain a topic the way you want it taught, draft questions with marking guides, suggest how to weight an assessment, or work through a student's answer with you. Tell me the course and I will keep it in context.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Msg = { role: 'user', content: input.trim() }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await apiPost('/api/admin/ai/chat', {
        message: userMsg.content,
        courseId: courseId || undefined,
        documentIds: docIds.length ? docIds : undefined,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      })
      setMessages((p) => [...p, { role: 'assistant', content: res.reply }])
    } catch (e: any) {
      setMessages((p) => [...p, { role: 'assistant', content: e.message || 'The AI assistant is not responding.' }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    'Set 5 essay questions on monetary policy with marking guides',
    'How should I weight quizzes against the final exam?',
    'Explain the income and substitution effects for a 200 level class',
    'What is a fair marking guide for a 10-mark question on inflation?',
  ]

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full albashir-gradient-gold flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Teaching assistant</CardTitle>
            <p className="text-[10px] text-muted-foreground">Aware of your documents and selected course</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs"
          >
            <option value="">No specific course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>
          <select
            multiple
            value={docIds}
            onChange={(e) => setDocIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="rounded-md border bg-background px-3 py-1.5 text-xs h-[60px]"
            title="Hold Ctrl/Cmd to select several documents"
          >
            {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>

        <ScrollArea className="h-[320px] pr-2" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)} className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/70 border">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about teaching, assessment or marking…"
            className="text-sm"
            disabled={loading}
          />
          <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="bg-primary hover:bg-primary/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Settings (admin only) ────────────────────────────────────────────────────

interface AiSettings {
  apiBase: string; model: string; temperature: number; maxTokens: number
  apiKeyMasked: string; hasKey: boolean; keySource: 'settings' | 'env' | 'none'
}

function AiSettingsButton() {
  const [open, setOpen] = useState(false)
  const { data } = useApi<{ settings: AiSettings }>(open ? '/api/admin/ai/settings' : null)
  const [saving, setSaving] = useState(false)

  const save = async (values: { apiBase: string; model: string; apiKey: string; temperature: number; maxTokens: number }) => {
    setSaving(true)
    try {
      await apiPost('/api/admin/ai/settings', {
        apiBase: values.apiBase,
        model: values.model,
        // An empty key field means "keep the stored key"
        ...(values.apiKey.trim() ? { apiKey: values.apiKey.trim() } : {}),
        temperature: values.temperature,
        maxTokens: values.maxTokens,
      })
      toast.success('AI settings saved')
      setOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4 mr-1" /> AI Settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> AI provider</DialogTitle>
            <DialogDescription>
              Used for question generation, essay marking and the assistant chat. Any OpenAI-compatible API works
              (OpenAI, Groq, Together, OpenRouter) — set the base URL to match.
            </DialogDescription>
          </DialogHeader>

          {!data ? (
            <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : (
            <AiSettingsForm key={`${data.settings.apiBase}-${data.settings.model}`} settings={data.settings} saving={saving} onSave={save} />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AiSettingsForm({
  settings, saving, onSave,
}: {
  settings: AiSettings
  saving: boolean
  onSave: (values: { apiBase: string; model: string; apiKey: string; temperature: number; maxTokens: number }) => void
}) {
  const [form, setForm] = useState({
    apiBase: settings.apiBase,
    model: settings.model,
    apiKey: '',
    temperature: String(settings.temperature),
    maxTokens: String(settings.maxTokens),
  })

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${settings.hasKey ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
        {settings.hasKey ? <CheckCircle2 className="h-4 w-4 text-green-700 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5" />}
        <div>
          {settings.hasKey ? (
            <p className="text-green-800">
              API key active ({settings.keySource === 'env' ? 'from the server environment' : 'stored here'})
              {settings.apiKeyMasked && ` — ${settings.apiKeyMasked}`}
            </p>
          ) : (
            <p className="text-amber-800">
              No API key yet. The AI features will report an error until one is set here or as OPENAI_API_KEY on the server.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>API base URL</Label>
        <Input value={form.apiBase} onChange={(e) => setForm({ ...form, apiBase: e.target.value })} placeholder="https://api.openai.com/v1" />
      </div>
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini" />
      </div>
      <div className="space-y-1.5">
        <Label>
          API key {settings.hasKey && <span className="text-muted-foreground font-normal">(leave blank to keep the current key)</span>}
        </Label>
        <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Temperature</Label>
          <Input type="number" step="0.1" min={0} max={2} value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Max tokens</Label>
          <Input type="number" min={200} max={32000} value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: e.target.value })} />
        </div>
      </div>

      <Button
        onClick={() => onSave({
          apiBase: form.apiBase,
          model: form.model,
          apiKey: form.apiKey,
          temperature: Number(form.temperature) || 0.3,
          maxTokens: Number(form.maxTokens) || 3000,
        })}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save settings
      </Button>
    </div>
  )
}
