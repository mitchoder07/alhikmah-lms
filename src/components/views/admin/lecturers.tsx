'use client'

import { useApi, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Loader2, Users, Mail, BookOpen, X, Shield } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Lecturer {
  id: string; name: string; email: string; department: string
  coursesTaught: Array<{ id: string; code: string; title: string }>
  _count: { coursesTaught: number; announcements: number }
}

export function AdminLecturers() {
  const { data, loading, refetch } = useApi<{ lecturers: Lecturer[] }>('/api/admin/lecturers')
  const [createOpen, setCreateOpen] = useState(false)
  const [editLecturer, setEditLecturer] = useState<Lecturer | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Economics' })
  const [editForm, setEditForm] = useState({ name: '', email: '', department: 'Economics', password: '' })
  const [submitting, setSubmitting] = useState(false)

  const lecturers = data?.lecturers ?? []

  const create = async () => {
    setSubmitting(true)
    try {
      await apiPost('/api/admin/lecturers', form)
      toast.success('Lecturer created')
      setCreateOpen(false)
      setForm({ name: '', email: '', password: '', department: 'Economics' })
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const saveEdit = async () => {
    if (!editLecturer) return
    setSubmitting(true)
    try {
      const updateData: any = { name: editForm.name, email: editForm.email, department: editForm.department }
      if (editForm.password) updateData.password = editForm.password
      await apiPatch(`/api/admin/lecturers/${editLecturer.id}`, updateData)
      toast.success('Lecturer updated')
      setEditLecturer(null)
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      await apiDelete(`/api/admin/lecturers/${deleteId}`)
      toast.success('Lecturer removed')
      setDeleteId(null)
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const openEdit = (l: Lecturer) => {
    setEditLecturer(l)
    setEditForm({ name: l.name, email: l.email, department: l.department, password: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Lecturers</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage lecturer accounts. Admins can create, edit, and remove lecturers.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> Add Lecturer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{lecturers.length}</p><p className="text-xs text-muted-foreground">Total Lecturers</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gold/20 flex items-center justify-center"><BookOpen className="h-5 w-5 text-gold" /></div>
            <div><p className="text-2xl font-bold">{lecturers.reduce((s, l) => s + l._count.coursesTaught, 0)}</p><p className="text-xs text-muted-foreground">Courses Assigned</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{lecturers.reduce((s, l) => s + l._count.announcements, 0)}</p><p className="text-xs text-muted-foreground">Announcements</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Lecturers list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading lecturers...</div>
          ) : lecturers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No lecturers yet. Click "Add Lecturer" to create one.</p>
            </div>
          ) : (
            <div className="divide-y">
              {lecturers.map((l) => (
                <div key={l.id} className="p-4 flex items-start gap-3 hover:bg-secondary/30">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {l.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{l.name}</p>
                      <Badge variant="outline" className="text-[10px]">Lecturer</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {l.email}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{l._count.coursesTaught} course(s)</span>
                      <span className="text-[10px] text-muted-foreground">{l._count.announcements} announcement(s)</span>
                      {l.coursesTaught.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {l.coursesTaught.slice(0, 4).map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">{c.code}</Badge>
                          ))}
                          {l.coursesTaught.length > 4 && <span className="text-[9px] text-muted-foreground">+{l.coursesTaught.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(l)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lecturer</DialogTitle>
            <DialogDescription>Create a new lecturer account. They will be able to sign in via the Staff Portal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dr.doe@alhikmah.edu.ng" />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" />
              <p className="text-[11px] text-muted-foreground">The lecturer can change this after their first login.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Economics" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={submitting || !form.name || !form.email || !form.password} className="bg-primary hover:bg-primary/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Lecturer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editLecturer} onOpenChange={(o) => !o && setEditLecturer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lecturer</DialogTitle>
            <DialogDescription>Update lecturer details. Leave password blank to keep the current one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>New Password (optional)</Label>
              <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLecturer(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={submitting} className="bg-primary hover:bg-primary/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Lecturer?</DialogTitle>
            <DialogDescription>This will permanently delete the lecturer account and all their courses, modules, lessons, and announcements. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">Warning: All courses taught by this lecturer will also be deleted. Students enrolled in those courses will lose their progress.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove Lecturer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
