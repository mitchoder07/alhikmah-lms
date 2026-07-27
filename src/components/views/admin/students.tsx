'use client'

import { useApi, apiDelete, apiPost, apiPatch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Search, Users, Trash2, Plus, Upload, Mail, Loader2, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner'

interface Student {
  id: string; name: string; email: string; matricNumber: string | null; phone: string | null; department: string; createdAt: string
  enrollments: Array<{ course: { code: string; title: string } }>
  _count: { payments: number; certificates: number }
}

export function AdminStudents() {
  const { data, loading, refetch } = useApi<{ students: Student[] }>('/api/admin/students')
  const [q, setQ] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const students = (data?.students ?? []).filter(s =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase()) || (s.matricNumber || '').toLowerCase().includes(q.toLowerCase())
  )

  const remove = async () => {
    if (!deleteId) return
    try {
      await apiDelete(`/api/admin/students/${deleteId}`)
      toast.success('Student removed')
      setDeleteId(null)
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Student Roster</h2>
          <p className="text-sm text-muted-foreground mt-1">{data?.students.length ?? 0} students enrolled in the department.</p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="bg-primary hover:bg-primary/90">
          <Upload className="h-4 w-4 mr-1" /> Bulk Import
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, or matric number" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No students found.</p>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto albashir-scroll">
              {students.map((s) => (
                <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-secondary/30">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      {s.matricNumber && <Badge variant="outline" className="text-[10px] font-mono">{s.matricNumber}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>
                      {s.phone && <span>{s.phone}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {s.enrollments.slice(0, 3).map((e, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{e.course.code}</Badge>
                      ))}
                      {s.enrollments.length > 3 && <span className="text-[10px] text-muted-foreground">+{s.enrollments.length - 3} more</span>}
                      {s._count.certificates > 0 && <Badge variant="secondary" className="text-[10px] bg-gold/20 text-gold">{s._count.certificates} cert(s)</Badge>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); refetch() }} />
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student?</DialogTitle>
            <DialogDescription>This will permanently delete the student and all their enrollments, progress, and certificates. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Remove Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState([{ name: '', email: '', matric: '', phone: '' }])
  const [importing, setImporting] = useState(false)

  const update = (i: number, k: string, v: string) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const addRow = () => setRows([...rows, { name: '', email: '', matric: '', phone: '' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))

  const submit = async () => {
    setImporting(true)
    try {
      const res = await apiPost('/api/admin/students/import', { students: rows.map(r => ({ name: r.name, email: r.email, matric: r.matric, phone: r.phone })).filter(r => r.name && r.email) })
      toast.success(`Imported ${res.created} students (${res.skipped} skipped)`)
      setRows([{ name: '', email: '', matric: '', phone: '' }])
      onDone()
    } catch (e: any) { toast.error(e.message) } finally { setImporting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>Each student will be created with default password <span className="font-mono">student123</span>. They should change it after first login.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
            <div className="col-span-3">Name</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-3">Matric</div>
            <div className="col-span-2">Phone</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-3" placeholder="Aisha Mohammed" value={r.name} onChange={(e) => update(i, 'name', e.target.value)} />
              <Input className="col-span-4" placeholder="aisha@student.alhikmah.edu.ng" value={r.email} onChange={(e) => update(i, 'email', e.target.value)} />
              <Input className="col-span-3" placeholder="20/03ECO002" value={r.matric} onChange={(e) => update(i, 'matric', e.target.value)} />
              <div className="col-span-2 flex gap-1">
                <Input placeholder="+234..." value={r.phone} onChange={(e) => update(i, 'phone', e.target.value)} />
                {rows.length > 1 && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow(i)}><X className="h-3 w-3" /></Button>}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={importing} className="bg-primary hover:bg-primary/90">
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Import Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
