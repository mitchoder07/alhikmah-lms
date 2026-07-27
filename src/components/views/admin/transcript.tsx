'use client'

import { useApi, apiPost } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FileText, Printer, Loader2, Pencil, Award, GraduationCap, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  email: string
  matricNumber: string | null
}

interface EnrollmentRow {
  id: string
  courseCode: string
  courseTitle: string
  creditUnit: number
  level: string
  semester: string
  quizAverage: number | null
  finalExamScore: number | null
  finalScore: number | null
  grade: string | null
  gradePoint: number | null
  certificateStatus: 'Issued' | 'Eligible' | 'Pending'
  certificateNumber: string | null
  enrolledAt: string
  completedAt: string | null
}

interface Transcript {
  student: {
    id: string
    name: string
    email: string
    matricNumber: string | null
    department: string
  }
  enrollments: EnrollmentRow[]
  gpa: number | null
  totals: {
    coursesEnrolled: number
    coursesCompleted: number
    certificatesIssued: number
    totalCreditUnits: number
  }
}

// Map a letter grade to a tailwind badge color
function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted-foreground/40 text-xs">—</span>
  const map: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-emerald-100 text-emerald-700',
    C: 'bg-amber-100 text-amber-700',
    D: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  }
  return <Badge className={`text-[10px] font-bold ${map[grade] ?? 'bg-secondary'}`}>{grade}</Badge>
}

export function AdminTranscript() {
  // Load the full student roster for the dropdown
  const { data: studentsData, loading: studentsLoading } = useApi<{ students: Student[] }>('/api/admin/students')
  const [selectedId, setSelectedId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState<EnrollmentRow | null>(null)
  const [editScore, setEditScore] = useState('')
  const [saving, setSaving] = useState(false)

  // Fetch the transcript for the selected student
  const transcriptUrl = selectedId ? `/api/admin/students/${selectedId}/transcript` : null
  const { data: transcript, loading: transcriptLoading, refetch } = useApi<Transcript>(transcriptUrl, [selectedId])

  const filteredStudents = useMemo(() => {
    const list = studentsData?.students ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.matricNumber || '').toLowerCase().includes(q),
    )
  }, [studentsData, search])

  const handlePrint = () => {
    if (!transcript) return
    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.error('Please allow popups to print the transcript.')
      return
    }
    win.document.write(buildPrintHtml(transcript))
    win.document.close()
    win.focus()
  }

  const openEdit = (row: EnrollmentRow) => {
    setEditModal(row)
    setEditScore(row.finalScore !== null ? String(row.finalScore) : '')
  }

  const saveEdit = async () => {
    if (!editModal) return
    const score = Number(editScore)
    if (Number.isNaN(score) || score < 0 || score > 100) {
      toast.error('Final score must be a number between 0 and 100.')
      return
    }
    setSaving(true)
    try {
      await apiPost(`/api/enrollments/${editModal.id}/finalize`, { finalScore: score })
      toast.success(`Updated ${editModal.courseCode} score to ${score}%`)
      setEditModal(null)
      refetch()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update score')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Transcripts
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          View, print, and edit a student's full academic record. GPA is computed across finalized courses.
        </p>
      </div>

      {/* Student selector */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-[1fr_320px] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Search students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, or matric number…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Select student</Label>
              <Select value={selectedId} onValueChange={setSelectedId} disabled={studentsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={studentsLoading ? 'Loading students…' : 'Choose a student'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredStudents.length === 0 ? (
                    <SelectItem value="_none" disabled>No matches</SelectItem>
                  ) : (
                    filteredStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {s.matricNumber ? `· ${s.matricNumber}` : `· ${s.email}`}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript body */}
      {!selectedId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a student above to view their transcript.
            </p>
          </CardContent>
        </Card>
      ) : transcriptLoading || !transcript ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading transcript…</span>
        </div>
      ) : (
        <>
          {/* Student header */}
          <Card className="border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4 flex-wrap">
                <Avatar className="h-14 w-14 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-base font-medium">
                    {transcript.student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">{transcript.student.name}</h3>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
                    {transcript.student.matricNumber && (
                      <span className="font-mono">{transcript.student.matricNumber}</span>
                    )}
                    <span>·</span>
                    <span>{transcript.student.email}</span>
                    <span>·</span>
                    <span>{transcript.student.department}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <Stat label="Courses" value={String(transcript.totals.coursesEnrolled)} />
                    <Stat label="Completed" value={String(transcript.totals.coursesCompleted)} />
                    <Stat label="Certificates" value={String(transcript.totals.certificatesIssued)} />
                    <Stat label="Credit Units" value={String(transcript.totals.totalCreditUnits)} />
                  </div>
                </div>
                <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90">
                  <Printer className="h-4 w-4 mr-1" /> Print Transcript
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enrollments table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Record</CardTitle>
              <CardDescription>
                {transcript.enrollments.length} enrollment{transcript.enrollments.length !== 1 ? 's' : ''}.
                Click <span className="font-medium text-foreground">Edit</span> to update a finalized score.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transcript.enrollments.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  This student is not enrolled in any courses yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 border-b text-xs">
                      <tr>
                        <th className="text-left p-3 font-medium">Course Code</th>
                        <th className="text-left p-3 font-medium min-w-[180px]">Title</th>
                        <th className="text-center p-3 font-medium">CU</th>
                        <th className="text-center p-3 font-medium">Quiz Avg</th>
                        <th className="text-center p-3 font-medium">Final Exam</th>
                        <th className="text-center p-3 font-medium">Final Score</th>
                        <th className="text-center p-3 font-medium">Grade</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...transcript.enrollments].sort((a, b) => {
                        const levelA = parseInt(a.level) || 0
                        const levelB = parseInt(b.level) || 0
                        if (levelB !== levelA) return levelB - levelA
                        return a.courseCode.localeCompare(b.courseCode)
                      }).map((row) => (
                        <tr key={row.id} className="hover:bg-secondary/20">
                          <td className="p-3 font-mono font-medium">{row.courseCode}</td>
                          <td className="p-3">
                            <p className="font-medium text-xs">{row.courseTitle}</p>
                            <p className="text-[10px] text-muted-foreground">Level {row.level} · {row.semester} Semester</p>
                          </td>
                          <td className="text-center p-3">{row.creditUnit}</td>
                          <td className="text-center p-3">
                            {row.quizAverage !== null ? (
                              <span className="text-xs font-medium">{row.quizAverage}%</span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="text-center p-3">
                            {row.finalExamScore !== null ? (
                              <span className="text-xs font-medium">{row.finalExamScore}%</span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="text-center p-3">
                            {row.finalScore !== null ? (
                              <span className="text-xs font-bold text-primary">{row.finalScore}%</span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="text-center p-3"><GradeBadge grade={row.grade} /></td>
                          <td className="text-center p-3">
                            {row.certificateStatus === 'Issued' ? (
                              <Badge className="bg-gold/20 text-gold text-[10px]"><Award className="h-2.5 w-2.5 mr-0.5" />Issued</Badge>
                            ) : row.certificateStatus === 'Eligible' ? (
                              <Badge variant="secondary" className="text-[10px] text-amber-600">Eligible</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">Pending</Badge>
                            )}
                          </td>
                          <td className="text-center p-3">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(row)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GPA summary */}
          <Card className="border-gold/30">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Cumulative GPA</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {transcript.gpa !== null ? transcript.gpa.toFixed(2) : '—'}
                  <span className="text-base text-muted-foreground font-normal ml-1">/ 5.00</span>
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground max-w-sm">
                <p>
                  GPA is the credit-weighted average of grade points across all finalized courses
                  (A:5, B:4, C:3, D:2, F:0). Courses still in progress are excluded.
                </p>
                {transcript.totals.totalCreditUnits > 0 && (
                  <p className="mt-1">Across {transcript.totals.totalCreditUnits} credit unit{transcript.totals.totalCreditUnits !== 1 ? 's' : ''}.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Score Dialog */}
      <Dialog open={!!editModal} onOpenChange={(o) => !o && setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Score</DialogTitle>
            <DialogDescription>
              {editModal && (
                <>
                  <strong>{transcript?.student.name}</strong> · {editModal.courseCode} — {editModal.courseTitle}
                  <br />
                  Enter the new final score (0–100). This updates the lecturer-assigned score and re-approves for certification.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Final Score (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              autoFocus
            />
            {editModal && (
              <p className="text-[11px] text-muted-foreground">
                Current: <span className="font-medium">{editModal.finalScore ?? '—'}%</span>
                {editModal.completedAt && <> · Completed on {new Date(editModal.completedAt).toLocaleDateString('en-GB')}</>}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || editScore === ''} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-2">
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

// Build a clean printable HTML document for the transcript (mirrors the certificate download approach)
function buildPrintHtml(t: Transcript): string {
  const student = t.student
  // Sort enrollments by level descending (400 level first, then 300, 200, 100)
  const sortedEnrollments = [...t.enrollments].sort((a, b) => {
    const levelA = parseInt(a.level) || 0
    const levelB = parseInt(b.level) || 0
    if (levelB !== levelA) return levelB - levelA
    return a.courseCode.localeCompare(b.courseCode)
  })
  const rows = sortedEnrollments.map((r) => {
    const scoreCell = r.finalScore !== null ? `${r.finalScore}%` : '—'
    const quizCell = r.quizAverage !== null ? `${r.quizAverage}%` : '—'
    const examCell = r.finalExamScore !== null ? `${r.finalExamScore}%` : '—'
    const gradeCell = r.grade ?? '—'
    const statusCell = r.certificateStatus
    return `<tr>
      <td>${escapeHtml(r.courseCode)}</td>
      <td>${escapeHtml(r.courseTitle)}<div class="meta">Level ${escapeHtml(r.level)} · ${escapeHtml(r.semester)} Semester · ${r.creditUnit} CU</div></td>
      <td class="num">${quizCell}</td>
      <td class="num">${examCell}</td>
      <td class="num score">${scoreCell}</td>
      <td class="num grade">${gradeCell}</td>
      <td class="num">${statusCell}</td>
    </tr>`
  }).join('\n')

  const issuedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const gpaDisplay = t.gpa !== null ? t.gpa.toFixed(2) : '—'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Transcript — ${escapeHtml(student.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; color: #222; }
  .wrap { max-width: 900px; margin: 0 auto; background: white; border: 6px double #006633; padding: 4px; }
  .inner { border: 2px solid #D4AF37; padding: 32px; }
  .toolbar { text-align: center; padding: 10px; background: #006633; color: white; margin-bottom: 12px; border-radius: 6px; }
  .toolbar button { background: #D4AF37; color: black; border: none; padding: 8px 20px; font-size: 13px; font-weight: bold; border-radius: 4px; cursor: pointer; }
  .header { text-align: center; margin-bottom: 20px; }
  .header-top { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
  .logo { width: 56px; height: 56px; border-radius: 50%; background: #006633; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .uni-name { font-weight: bold; color: #006633; font-size: 17px; }
  .uni-sub { font-size: 10px; color: #666; }
  .divider { height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 8px 0; }
  .arabic { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 2px; }
  h1 { font-size: 24px; color: #006633; margin: 18px 0 4px; text-align: center; }
  .subtitle { font-size: 11px; color: #999; font-style: italic; text-align: center; margin-bottom: 18px; }
  .student-block { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #fafaf5; border: 1px solid #eee; padding: 14px 18px; border-radius: 4px; margin-bottom: 18px; }
  .student-block .row { font-size: 12px; }
  .student-block .label { color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .student-block .value { color: #222; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th { background: #006633; color: white; font-size: 11px; padding: 8px; text-align: left; font-weight: 600; }
  thead th.num { text-align: center; }
  tbody td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: top; }
  tbody td.num { text-align: center; }
  tbody td.score { font-weight: bold; color: #006633; }
  tbody td.grade { font-weight: bold; color: #D4AF37; font-size: 13px; }
  td .meta { font-size: 9px; color: #999; margin-top: 2px; }
  .gpa-row { margin-top: 18px; padding: 14px 18px; background: #fafaf5; border: 1px solid #D4AF37; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
  .gpa-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 2px; }
  .gpa-value { font-size: 28px; font-weight: bold; color: #006633; }
  .gpa-value .scale { font-size: 13px; color: #999; font-weight: normal; margin-left: 4px; }
  .grading { margin-top: 14px; font-size: 10px; color: #666; padding: 8px 12px; background: #f5f5f5; border-radius: 4px; }
  .grading strong { color: #006633; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #D4AF37; text-align: center; font-size: 9px; color: #999; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
  .sign-block { text-align: center; }
  .sign-line { border-top: 1px solid #666; padding-top: 4px; }
  .sign-name { font-size: 12px; font-weight: 600; }
  .sign-role { font-size: 10px; color: #999; }
  @page { size: A4 portrait; margin: 0.5in; }
  @media print {
    .toolbar { display: none; }
    body { background: white; padding: 0; }
    .wrap { border-width: 4px; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="toolbar no-print">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="inner">
      <div class="header">
        <div class="header-top">
          <img src="/icon-192.png?v=2" alt="Logo" class="logo-img" style="width:56px;height:56px;border-radius:50%;" />
          <div style="text-align: left;">
            <div class="uni-name">AL-BASHIR ACADEMY</div>
            <div class="uni-sub">Ilorin, Kwara State, Nigeria</div>
            <div class="uni-sub">Department of Economics</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="arabic">In the name of Allah, the Most Gracious, the Most Merciful</div>
      </div>

      <h1>Official Academic Transcript</h1>
      <div class="subtitle">This document certifies the academic record of the student named below.</div>

      <div class="student-block">
        <div class="row"><div class="label">Student Name</div><div class="value">${escapeHtml(student.name)}</div></div>
        <div class="row"><div class="label">Matric Number</div><div class="value">${escapeHtml(student.matricNumber || '—')}</div></div>
        <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(student.email)}</div></div>
        <div class="row"><div class="label">Department</div><div class="value">${escapeHtml(student.department)}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Title</th>
            <th class="num">Quiz Avg</th>
            <th class="num">Final Exam</th>
            <th class="num">Final Score</th>
            <th class="num">Grade</th>
            <th class="num">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="text-align:center;color:#999;padding:18px;">No enrollments on record.</td></tr>'}
        </tbody>
      </table>

      <div class="gpa-row">
        <div>
          <div class="gpa-label">Cumulative GPA</div>
          <div class="gpa-value">${gpaDisplay}<span class="scale">/ 5.00</span></div>
        </div>
        <div style="text-align:right; font-size:10px; color:#666;">
          ${t.totals.coursesCompleted} of ${t.totals.coursesEnrolled} courses completed<br />
          ${t.totals.totalCreditUnits} credit units earned
        </div>
      </div>

      <div class="grading">
        <strong>Grading Scale:</strong> A ≥ 70 (5 pts) · B ≥ 60 (4 pts) · C ≥ 50 (3 pts) · D ≥ 40 (2 pts) · F &lt; 40 (0 pts).
        GPA = Σ(gradePoint × creditUnit) ÷ Σ(creditUnit) across finalized courses.
      </div>

      <div class="sign-row">
        <div class="sign-block">
          <div class="sign-line">
            <div class="sign-name">Course Lecturer</div>
            <div class="sign-role">Department of Economics</div>
          </div>
        </div>
        <div class="sign-block">
          <div class="sign-line">
            <div class="sign-name">Registrar</div>
            <div class="sign-role">Al-Bashir Academy</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Issued on ${issuedDate} · Al-Bashir Academy, Department of Economics.</p>
        <p style="margin-top: 4px;">This transcript is for official use. Verify with the registrar's office if in doubt.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
