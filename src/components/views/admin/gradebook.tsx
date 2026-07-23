'use client'

import { useApi, apiPatch, apiPost } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Award, CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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

export function AdminGradebook() {
  const { data, loading, refetch } = useApi<GradebookData>('/api/admin/gradebook')
  const [finalizeModal, setFinalizeModal] = useState<{ enrollmentId: string; studentName: string; courseCode: string } | null>(null)
  const [finalScore, setFinalScore] = useState('')

  if (loading || !data) return <div className="text-sm text-muted-foreground">Loading gradebook…</div>

  const finalize = async () => {
    if (!finalizeModal) return
    try {
      await apiPost(`/api/enrollments/${finalizeModal.enrollmentId}/finalize`, { finalScore: Number(finalScore) })
      toast.success('Course finalized. Student can now pay for certificate.')
      setFinalizeModal(null)
      setFinalScore('')
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Gradebook</h2>
        <p className="text-sm text-muted-foreground mt-1">View student progress across all courses, finalize scores, and approve for certification.</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Student</th>
                {data.courses.map((c) => (
                  <th key={c.id} className="text-center p-3 font-medium min-w-[120px]">{c.code}</th>
                ))}
                <th className="text-center p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.students.length === 0 ? (
                <tr><td colSpan={data.courses.length + 2} className="p-8 text-center text-muted-foreground">No students yet.</td></tr>
              ) : data.students.map((s) => {
                const eligibleForFinalize = s.enrollments.find(e => !e.completedAt)
                return (
                  <tr key={s.id} className="hover:bg-secondary/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.matricNumber || s.email}</p>
                        </div>
                      </div>
                    </td>
                    {data.courses.map((c) => {
                      const en = s.enrollments.find(e => e.course.id === c.id)
                      const attempts = s.quizAttempts.filter(a => a.quiz.lesson.module.courseId === c.id)
                      const avgScore = attempts.length ? Math.round((attempts.reduce((sum, a) => sum + (a.score / a.totalMarks) * 100, 0) / attempts.length)) : null
                      return (
                        <td key={c.id} className="text-center p-3">
                          {!en ? <span className="text-muted-foreground/40">·</span> :
                           en.certificate ? <Badge variant="secondary" className="bg-gold/20 text-gold text-[10px]"><Award className="h-2.5 w-2.5 mr-0.5" />Cert</Badge> :
                           en.completedAt ? <Badge variant="secondary" className="text-[10px]">{en.finalScore}%</Badge> :
                           en.lecturerApproved ? <Badge variant="secondary" className="text-[10px] text-amber-600">Approved</Badge> :
                           avgScore !== null ? <Badge variant="outline" className="text-[10px]">{avgScore}%</Badge> :
                           <Badge variant="secondary" className="text-[10px] text-muted-foreground">Enrolled</Badge>}
                        </td>
                      )
                    })}
                    <td className="text-center p-3">
                      {eligibleForFinalize ? (
                        <Button size="sm" variant="outline" onClick={() => {
                          setFinalizeModal({
                            enrollmentId: eligibleForFinalize.id,
                            studentName: s.name,
                            courseCode: eligibleForFinalize.course.code,
                          })
                          setFinalizeScore(String(eligibleForFinalize.finalScore ?? ''))
                        }}>
                          Finalize
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

      <Dialog open={!!finalizeModal} onOpenChange={(o) => !o && setFinalizeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Course Score</DialogTitle>
            <DialogDescription>
              <strong>{finalizeModal?.studentName}</strong> · {finalizeModal?.courseCode}
              <br />Enter final score (0-100). Student must score ≥ pass mark to qualify for certificate. This also marks the lecturer as approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Final Score (%)</Label>
            <Input type="number" min={0} max={100} value={finalScore} onChange={(e) => setFinalScore(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeModal(null)}>Cancel</Button>
            <Button onClick={finalize} disabled={!finalScore} className="bg-primary hover:bg-primary/90">Finalize & Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
