'use client'

import { useApi, apiPost, apiDelete } from '@/lib/api'
import { useSession } from '@/components/app-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Award, Loader2, Search, Ban } from 'lucide-react'
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
  }>
  courses: Array<{ id: string; code: string; title: string }>
}

export function AdminCertificates() {
  const { user } = useSession()
  const isAdmin = user?.role === 'ADMIN'
  const { data, loading, refetch } = useApi<GradebookData>('/api/admin/gradebook')
  const [q, setQ] = useState('')
  const [issuing, setIssuing] = useState<string | null>(null)

  const issue = async (enrollmentId: string, score: number) => {
    setIssuing(enrollmentId)
    try {
      await apiPost('/api/certificates/issue', { enrollmentId, score })
      toast.success('Certificate issued')
      refetch()
    } catch (e: any) { toast.error(e.message) } finally { setIssuing(null) }
  }

  const revoke = async (certId: string, studentName: string) => {
    if (!confirm(`Revoke certificate for ${studentName}? This will permanently delete the certificate. The student will need to repay to get a new one.`)) return
    setIssuing(certId)
    try {
      await apiDelete(`/api/certificates/issue/${certId}`)
      toast.success('Certificate revoked')
      refetch()
    } catch (e: any) { toast.error(e.message) } finally { setIssuing(null) }
  }

  if (loading || !data) return <div className="text-sm text-muted-foreground">Loading…</div>

  const allEnrollments = data.students.flatMap(s =>
    s.enrollments.map(e => ({ ...e, studentName: s.name, matric: s.matricNumber, email: s.email }))
  ).filter(e => !q || e.studentName.toLowerCase().includes(q.toLowerCase()) || e.course.code.toLowerCase().includes(q.toLowerCase()))

  const issued = allEnrollments.filter(e => e.certificate)
  const eligible = allEnrollments.filter(e => !e.certificate && e.completedAt && e.finalScore !== null && e.finalScore >= 50)
  const failed = allEnrollments.filter(e => !e.certificate && e.completedAt && e.finalScore !== null && e.finalScore < 50)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Certificate Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Issue, view, and manage student certificates.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3"><Award className="h-5 w-5 text-gold" /><div><p className="text-2xl font-bold">{issued.length}</p><p className="text-xs text-muted-foreground">Issued</p></div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3"><Award className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{eligible.length}</p><p className="text-xs text-muted-foreground">Eligible (Awaiting Payment)</p></div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3"><Award className="h-5 w-5 text-destructive" /><div><p className="text-2xl font-bold">{failed.length}</p><p className="text-xs text-muted-foreground">Failed (Below Pass Mark)</p></div></div>
        </CardContent></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by student or course"
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Enrollments</CardTitle>
          <CardDescription>Issue certificates manually or let students pay via Paystack.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[600px] overflow-y-auto alhikmah-scroll">
            {allEnrollments.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No enrollments found.</div>
            ) : allEnrollments.map((e) => (
              <div key={e.id} className="p-3 flex items-center gap-3 hover:bg-secondary/30">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.studentName}</p>
                  <p className="text-xs text-muted-foreground">{e.course.code} · {e.course.title}</p>
                  <p className="text-[10px] text-muted-foreground">{e.matric || e.email}</p>
                </div>
                <div className="text-right">
                  {e.certificate ? (
                    <>
                      <Badge variant="secondary" className="bg-gold/20 text-gold"><Award className="h-3 w-3 mr-1" />Cert #{e.certificate.certificateNumber.slice(-6)}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">Issued</p>
                    </>
                  ) : e.completedAt ? (
                    <>
                      <Badge variant="outline">{e.finalScore}%</Badge>
                      <p className="text-[10px] mt-1">
                        {e.finalScore >= 50 ? <span className="text-amber-600">Eligible</span> : <span className="text-destructive">Below pass mark</span>}
                      </p>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">In Progress</Badge>
                  )}
                </div>
                {e.certificate && isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => revoke(e.certificate!.id, e.studentName)} disabled={issuing === e.certificate!.id} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    {issuing === e.certificate!.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3 mr-1" />}
                    Revoke
                  </Button>
                )}
                {e.completedAt && e.finalScore !== null && e.finalScore >= 50 && !e.certificate && (
                  <Button size="sm" onClick={() => issue(e.id, e.finalScore!)} disabled={issuing === e.id}>
                    {issuing === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3 mr-1" />}
                    Issue
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
