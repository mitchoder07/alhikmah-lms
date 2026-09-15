'use client'

import { useApi, apiPatch, apiPost } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Award, CheckCircle2, Loader2, Pencil, Info, Check, ClipboardCheck, Brain, FileSearch } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AttemptReviewDialog, StatusBadge } from './attempt-review'

interface GradebookData {
  students: Array<{
    id: string; name: string; email: string; matricNumber: string | null
    enrollments: Array<{
      id: string; finalScore: number | null; lecturerApproved: boolean; completedAt: string | null
      course: { id: string; code: string; title: string }
      certificate: { certificateNumber: string } | null
    }>
    quizAttempts: Array<{ score: number; totalMarks: number; passed: boolean; quiz: { lesson: { module: { courseId: string } } } }>
  }>
  courses: Array<{ id: string; code: string; title: string }>
}

interface AttemptRow {
  id: string
  kind: 'quiz' | 'exam'
  title: string
  lessonTitle: string | null
  passMark: number
  course: { id: string; code: string; title: string }
  student: { id: string; name: string; email: string; matricNumber: string | null }
  score: number
  totalMarks: number
  percent: number
  passed: boolean
  reviewStatus: 'AUTO' | 'PENDING' | 'REVIEWED'
  gradingMode: string
  aiScore: number | null
  aiMarkedAt: string | null
  reviewedAt: string | null
  submittedAt: string
}

export function AdminGradebook() {
  const { data, loading, refetch } = useApi<GradebookData>('/api/admin/gradebook')
  const { data: attemptsData, refetch: refetchAttempts } = useApi<{ attempts: AttemptRow[]; pending: number }>('/api/admin/attempts?limit=300')
  const [finalizeModal, setFinalizeModal] = useState<{ enrollmentId: string; studentName: string; courseCode: string; currentScore?: number | null } | null>(null)
  const [finalScore, setFinalScore] = useState('')
  const [approving, setApproving] = useState<string | null>(null)
  const [review, setReview] = useState<{ attemptId: string; kind: 'quiz' | 'exam' } | null>(null)
  const [studentAttempts, setStudentAttempts] = useState<{ studentId: string; name: string } | null>(null)

  const attempts = attemptsData?.attempts ?? []
  const pending = attempts.filter((a) => a.reviewStatus === 'PENDING')
  const aiMarked = attempts.filter((a) => a.gradingMode === 'AI')
  const refresh = () => { refetch(); refetchAttempts() }

  if (loading || !data) return <div className="text-sm text-muted-foreground">Loading gradebook...</div>

  const finalize = async () => {
    if (!finalizeModal) return
    try {
      await apiPost(`/api/enrollments/${finalizeModal.enrollmentId}/finalize`, { finalScore: Number(finalScore) })
      toast.success('Score saved. Student can now pay for certificate.')
      setFinalizeModal(null)
      setFinalScore('')
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  const approve = async (enrollmentId: string, studentName: string) => {
    setApproving(enrollmentId)
    try {
      await apiPatch(`/api/enrollments/${enrollmentId}/approve`, {})
      toast.success(`${studentName} approved for certification`)
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setApproving(null) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Gradebook</h2>
        <p className="text-sm text-muted-foreground mt-1">View student progress, approve for certification, and assign final scores.</p>
      </div>

      {/* Explanation card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <p className="font-medium text-sm">How to read this gradebook</p>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <p><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40 mr-1"></span> Not enrolled in this course</p>
                <p><Badge variant="secondary" className="text-[9px] mr-1">Enrolled</Badge> Joined, no quizzes taken yet</p>
                <p><Badge variant="outline" className="text-[9px] mr-1">75%</Badge> Average quiz score (auto-calculated)</p>
                <p><Badge variant="secondary" className="text-[9px] text-amber-600 mr-1">Approved</Badge> You approved them for certification</p>
                <p><Badge variant="secondary" className="text-[9px] mr-1">82%</Badge> Final score you assigned via Finalize</p>
                <p><Badge variant="secondary" className="text-[9px] bg-gold/20 text-gold mr-1"><Award className="h-2 w-2 mr-0.5" />Cert</Badge> Certificate issued</p>
              </div>
              <p className="pt-1"><Badge variant="secondary" className="text-[9px] mr-1 text-amber-700"><Brain className="h-2 w-2 mr-0.5" />AI</Badge> Essay answer marked by the AI. Click the score to check and adjust it before it is released to the student.</p>
              <p><strong>Finalize</strong> = assign a final score + approve for certification</p>
              <p><strong>Edit</strong> = change an already-assigned score</p>
              <p><strong>Approve</strong> = approve a student without assigning a score yet</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI marking queue */}
      <Card className={pending.length ? 'border-amber-300' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Marking queue
            {pending.length > 0 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{pending.length} to review</Badge>}
          </CardTitle>
          <CardDescription>
            Written answers are marked by the AI against your marking guide. Nothing is shown to the student until you
            approve it here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No submissions yet.</p>
          ) : pending.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Nothing waiting. {aiMarked.length} submission{aiMarked.length === 1 ? '' : 's'} already reviewed.
            </p>
          ) : (
            <div className="divide-y max-h-[320px] overflow-y-auto">
              {pending.map((a) => (
                <div key={`${a.kind}-${a.id}`} className="flex items-center gap-3 p-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.student.name} <span className="text-muted-foreground font-normal">· {a.course.code}</span></p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.kind === 'exam' ? 'Final exam' : 'Quiz'}: {a.title}{a.lessonTitle ? `: ${a.lessonTitle}` : ''}
                      {' · submitted '}{new Date(a.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    AI: {a.aiScore === null ? 'unmarked' : `${a.aiScore}/${a.totalMarks}`}
                  </Badge>
                  <StatusBadge status={a.reviewStatus} />
                  <Button size="sm" variant="outline" onClick={() => setReview({ attemptId: a.id, kind: a.kind })}>
                    <FileSearch className="h-3 w-3 mr-1" /> Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b">
              <tr>
                <th className="text-left p-3 font-medium whitespace-nowrap">Student</th>
                {data.courses.map((c) => (
                  <th key={c.id} className="text-center p-3 font-medium min-w-[100px] whitespace-nowrap">{c.code}</th>
                ))}
                <th className="text-center p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.students.length === 0 ? (
                <tr><td colSpan={data.courses.length + 2} className="p-8 text-center text-muted-foreground">No students yet.</td></tr>
              ) : data.students.map((s) => {
                // Find the first enrollment that needs action (not completed)
                const needsFinalize = s.enrollments.find(e => !e.completedAt)
                // Find an enrollment that's approved but not completed (for approve button)
                const needsApprove = s.enrollments.find(e => !e.lecturerApproved && !e.completedAt)

                return (
                  <tr key={s.id} className="hover:bg-secondary/20">
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => setStudentAttempts({ studentId: s.id, name: s.name })}
                        className="flex items-center gap-2 text-left hover:opacity-80"
                        title="View every submission and its marking"
                      >
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.matricNumber || s.email}</p>
                        </div>
                      </button>
                    </td>
                    {data.courses.map((c) => {
                      const en = s.enrollments.find(e => e.course.id === c.id)
                      if (!en) {
                        return <td key={c.id} className="text-center p-3"><span className="text-muted-foreground/30">·</span></td>
                      }
                      const quizAttempts = s.quizAttempts.filter(a => a.quiz.lesson.module.courseId === c.id)
                      const avgScore = quizAttempts.length ? Math.round((quizAttempts.reduce((sum, a) => sum + (a.score / a.totalMarks) * 100, 0) / quizAttempts.length)) : null
                      const courseAttempts = attempts.filter(a => a.course.id === c.id && a.student.id === s.id)
                      const needsReview = courseAttempts.find(a => a.reviewStatus === 'PENDING')
                      const latestAi = courseAttempts.find(a => a.gradingMode === 'AI')

                      return (
                        <td key={c.id} className="text-center p-3">
                          {en.certificate ? (
                            <Badge variant="secondary" className="bg-gold/20 text-gold text-[10px]"><Award className="h-2.5 w-2.5 mr-0.5" />Cert</Badge>
                          ) : en.completedAt ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="secondary" className="text-[10px]">{en.finalScore}%</Badge>
                              <button
                                onClick={() => {
                                  setFinalizeModal({ enrollmentId: en.id, studentName: s.name, courseCode: c.code, currentScore: en.finalScore })
                                  setFinalScore(String(en.finalScore ?? ''))
                                }}
                                className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                              >
                                <Pencil className="h-2 w-2" /> Edit
                              </button>
                            </div>
                          ) : en.lecturerApproved ? (
                            <Badge variant="secondary" className="text-[10px] text-amber-600">Approved</Badge>
                          ) : needsReview ? (
                            <button
                              onClick={() => setReview({ attemptId: needsReview.id, kind: needsReview.kind })}
                              className="flex flex-col items-center gap-1"
                              title="AI has marked this. Check and release it."
                            >
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                                <Brain className="h-2.5 w-2.5 mr-0.5" />Review
                              </Badge>
                              <span className="text-[9px] text-muted-foreground">held for you</span>
                            </button>
                          ) : avgScore !== null ? (
                            <button onClick={() => setStudentAttempts({ studentId: s.id, name: s.name })} className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className="text-[10px]">{avgScore}%</Badge>
                              <span className="text-[9px] text-muted-foreground">
                                {latestAi ? <span className="inline-flex items-center gap-0.5 text-primary"><Brain className="h-2 w-2" />AI marked</span> : 'quiz avg'}
                              </span>
                            </button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-muted-foreground">Enrolled</Badge>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center p-3 whitespace-nowrap">
                      {needsFinalize ? (
                        <Button size="sm" variant="outline" onClick={() => {
                          setFinalizeModal({
                            enrollmentId: needsFinalize.id,
                            studentName: s.name,
                            courseCode: needsFinalize.course.code,
                            currentScore: needsFinalize.finalScore
                          })
                          setFinalScore(String(needsFinalize.finalScore ?? ''))
                        }}>
                          Finalize
                        </Button>
                      ) : needsApprove ? (
                        <Button size="sm" variant="ghost" onClick={() => approve(needsApprove.id, s.name)} disabled={approving === needsApprove.id}>
                          {approving === needsApprove.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                          Approve
                        </Button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {review && (
        <AttemptReviewDialog
          attemptId={review.attemptId}
          kind={review.kind}
          onClose={() => setReview(null)}
          onSaved={refresh}
        />
      )}

      <Dialog open={!!studentAttempts} onOpenChange={(o) => !o && setStudentAttempts(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions: {studentAttempts?.name}</DialogTitle>
            <DialogDescription>Every quiz and final exam attempt, with how it was marked.</DialogDescription>
          </DialogHeader>
          {(() => {
            const rows = attempts.filter((a) => a.student.id === studentAttempts?.studentId)
            if (!rows.length) return <p className="text-sm text-muted-foreground py-4">No submissions yet.</p>
            return (
              <div className="divide-y">
                {rows.map((a) => (
                  <div key={`${a.kind}-${a.id}`} className="flex items-center gap-3 py-2.5 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {a.kind === 'exam' ? 'Final exam' : 'Quiz'}: {a.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {a.course.code}{a.lessonTitle ? `: ${a.lessonTitle}` : ''} · {new Date(a.submittedAt).toLocaleDateString()}
                        {a.gradingMode === 'AI' && ' · AI marked'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{a.score}/{a.totalMarks} ({a.percent}%)</Badge>
                    <StatusBadge status={a.reviewStatus} />
                    <Button size="sm" variant="outline" onClick={() => setReview({ attemptId: a.id, kind: a.kind })}>
                      <FileSearch className="h-3 w-3 mr-1" /> {a.reviewStatus === 'PENDING' ? 'Review' : 'Open'}
                    </Button>
                  </div>
                ))}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!finalizeModal} onOpenChange={(o) => !o && setFinalizeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{finalizeModal?.currentScore != null ? 'Edit Score' : 'Finalize Course Score'}</DialogTitle>
            <DialogDescription>
              <strong>{finalizeModal?.studentName}</strong> · {finalizeModal?.courseCode}
              <br />Enter final score (0-100). Score of 50+ qualifies for certificate. This also approves the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Final Score (%)</Label>
            <Input type="number" min={0} max={100} value={finalScore} onChange={(e) => setFinalScore(e.target.value)} placeholder="e.g. 75" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeModal(null)}>Cancel</Button>
            <Button onClick={finalize} disabled={!finalScore} className="bg-primary hover:bg-primary/90">
              {finalizeModal?.currentScore != null ? 'Update Score' : 'Finalize & Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
