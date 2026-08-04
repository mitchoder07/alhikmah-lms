'use client'

import { useApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Award, Eye, ExternalLink, Loader2, GraduationCap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CertificatePreview } from '@/components/lms/certificate-preview'
import { useSession } from '@/components/app-provider'

interface Enrollment {
  id: string; enrolledAt: string; finalScore: number | null; lecturerApproved: boolean; completedAt: string | null
  course: { id: string; code: string; title: string; creditUnit: number; certificateFee: number; passMark: number; lecturer: { name: string } }
  certificate: { certificateNumber: string; issuedAt: string; score: number } | null
}

export function StudentCertificates({ onNavigate }: { onNavigate: (v: string, p?: any) => void }) {
  const router = useRouter()
  const { user } = useSession()
  const { data, loading } = useApi<{ enrollments: Enrollment[] }>('/api/enrollments')
  const enrollments = data?.enrollments ?? []
  const [previewCert, setPreviewCert] = useState<any | null>(null)

  const issued = enrollments.filter(e => e.certificate)
  const eligible = enrollments.filter(e => !e.certificate && e.lecturerApproved)
  const pending = enrollments.filter(e => !e.certificate && !e.lecturerApproved)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Certificates</h2>
        <p className="text-sm text-muted-foreground mt-1">View, preview, download, and share your verified certificates.</p>
      </div>

      {/* Issued */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-gold" /> Issued Certificates ({issued.length})</h3>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> :
         issued.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No certificates issued yet.</CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {issued.map((e) => (
              <Card key={e.id} className="overflow-hidden border-gold/40">
                <div className="albashir-gradient p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gold/90">Certificate of Completion</p>
                      <p className="font-bold mt-1">{e.course.title}</p>
                      <p className="text-xs text-white/80 mt-1">{e.course.code} · {e.course.creditUnit} Credit Units</p>
                    </div>
                    <Award className="h-8 w-8 text-gold flex-shrink-0" />
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Certificate No.</span>
                    <span className="font-mono font-medium">{e.certificate!.certificateNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-medium">{e.certificate!.score}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Issued</span>
                    <span>{new Date(e.certificate!.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setPreviewCert({
                      certificateNumber: e.certificate!.certificateNumber,
                      issuedAt: e.certificate!.issuedAt,
                      score: e.certificate!.score,
                      studentName: user?.name || 'Student',
                      matricNumber: user?.matricNumber || null,
                      department: 'Economics',
                      courseCode: e.course.code,
                      courseTitle: e.course.title,
                      creditUnit: e.course.creditUnit,
                      lecturerName: e.course.lecturer.name,
                    })}>
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/?view=verify-certificate&cert=${e.certificate!.certificateNumber}`, '_blank')}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Verify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Eligible (approved, awaiting payment) */}
      {eligible.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Ready to Certify ({eligible.length})</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {eligible.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{e.course.title}</p>
                      <p className="text-xs text-muted-foreground">{e.course.code} · {e.course.lecturer.name}</p>
                    </div>
                    <Badge className="bg-gold text-black border-0">Approved</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Certificate Fee</span>
                    <span className="font-bold text-gold">₦{e.course.certificateFee.toLocaleString()}</span>
                  </div>
                  <Button className="w-full bg-gold hover:bg-gold/90 text-black" size="sm" onClick={() => onNavigate('checkout', { enrollmentId: e.id, courseId: e.course.id })}>
                    Pay & Get Certificate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending approval */}
      {pending.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Awaiting Lecturer Approval ({pending.length})</h3>
          <Card>
            <CardContent className="divide-y">
              {pending.map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{e.course.title}</p>
                    <p className="text-xs text-muted-foreground">{e.course.code}</p>
                  </div>
                  <Badge variant="secondary" className="text-amber-600">Pending</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewCert} onOpenChange={(o) => !o && setPreviewCert(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          {previewCert && <CertificatePreview cert={previewCert} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
