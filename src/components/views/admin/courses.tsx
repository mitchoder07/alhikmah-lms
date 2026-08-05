'use client'

import { useApi, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, BookOpen, Users, Pencil, Trash2, ChevronRight, Loader2, Lock, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

interface Course {
  id: string; code: string; title: string; description: string; level: string; semester: string; creditUnit: number; certificateFee: number; passMark: number; isPublished: boolean
  isPaid?: boolean; courseFee?: number; accessDurationMonths?: number
  lecturer: { name: string }
  modules: any[]
  _count: { enrollments: number }
}

const EMPTY_FORM = {
  code: '',
  title: '',
  description: '',
  level: '200',
  semester: 'First',
  creditUnit: '2',
  certificateFee: '5000',
  passMark: '50',
  isPaid: false,
  courseFee: '2000',
  accessDurationMonths: '6',
  allowDownload: false,
}

export function AdminCourses({ onNavigate }: { onNavigate: (v: string, p?: any) => void }) {
  const { data, loading, refetch } = useApi<{ courses: Course[] }>('/api/courses')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const courses = data?.courses ?? []

  const createCourse = async () => {
    try {
      await apiPost('/api/courses', {
        ...form,
        creditUnit: Number(form.creditUnit),
        certificateFee: Number(form.certificateFee),
        passMark: Number(form.passMark),
        isPaid: form.isPaid,
        courseFee: Number(form.courseFee),
        accessDurationMonths: Number(form.accessDurationMonths),
        allowDownload: form.allowDownload,
      })
      toast.success('Course created!')
      setCreateOpen(false)
      setForm({ ...EMPTY_FORM })
      refetch()
    } catch (e: any) {
      const msg = e?.message?.includes('Unexpected') || e?.message?.includes('JSON')
        ? 'Server error. Please try again.'
        : (e?.message || 'Failed to create course. Please try again.')
      toast.error(msg)
    }
  }

  const openEdit = (c: Course) => {
    setEditing(c)
    setForm({
      code: c.code,
      title: c.title,
      description: c.description,
      level: c.level,
      semester: c.semester,
      creditUnit: String(c.creditUnit),
      certificateFee: String(c.certificateFee),
      passMark: String(c.passMark),
      isPaid: !!c.isPaid,
      courseFee: String(c.courseFee ?? 0),
      accessDurationMonths: String(c.accessDurationMonths ?? 6),
      allowDownload: false,
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      await apiPatch(`/api/courses/${editing.id}`, {
        code: form.code,
        title: form.title,
        description: form.description,
        level: form.level,
        semester: form.semester,
        creditUnit: Number(form.creditUnit),
        certificateFee: Number(form.certificateFee),
        passMark: Number(form.passMark),
        isPaid: form.isPaid,
        courseFee: Number(form.courseFee),
        accessDurationMonths: Number(form.accessDurationMonths),
      })
      toast.success('Course updated — new certificate fee will apply to all future payments.')
      setEditOpen(false)
      setEditing(null)
      refetch()
    } catch (e: any) {
      const msg = e?.message?.includes('Unexpected') || e?.message?.includes('JSON')
        ? 'Server error. Please try again.'
        : (e?.message || 'Failed to update course. Please try again.')
      toast.error(msg)
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteCourse = async (id: string) => {
    if (!confirm('Delete this course and all its modules, lessons, and enrollments?')) return
    try {
      await apiDelete(`/api/courses/${id}`)
      toast.success('Course deleted')
      refetch()
    } catch (e: any) {
      const msg = e?.message?.includes('Unexpected') || e?.message?.includes('JSON')
        ? 'Server error. Please try again.'
        : (e?.message || 'Failed to delete course. Please try again.')
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Courses</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage all Economics courses, modules, and lessons.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> New Course
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading courses…</div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No courses yet. Create your first course.</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col hover:shadow-md transition-shadow">
              <div className="h-20 albashir-gradient rounded-t-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">{c.code}</span>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="outline">{c.level} Level</Badge>
                    <Badge variant="secondary">{c.creditUnit} CU</Badge>
                    {c.isPublished ? <Badge variant="secondary" className="bg-green-100 text-green-700">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                  </div>
                  <p className="font-medium text-sm leading-tight line-clamp-2">{c.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{c.description}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c._count.enrollments} students</span>
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {c.modules.length} modules</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={() => onNavigate('course-builder', { courseId: c.id })}>
                    <Pencil className="h-3 w-3 mr-1" /> Manage
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)} title="Edit course details (cert fee, level, etc.)">
                    <DollarSign className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteCourse(c.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>Add a new Economics course to the catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Course Code</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ECO201" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 Level</SelectItem>
                    <SelectItem value="200">200 Level</SelectItem>
                    <SelectItem value="300">300 Level</SelectItem>
                    <SelectItem value="400">400 Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Course Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Microeconomic Theory I" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief course description" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="creditUnit">Credit Units</Label>
                <Input id="creditUnit" type="number" value={form.creditUnit} onChange={(e) => setForm({ ...form, creditUnit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="certificateFee">Cert Fee (₦)</Label>
                <Input id="certificateFee" type="number" value={form.certificateFee} onChange={(e) => setForm({ ...form, certificateFee: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passMark">Pass Mark (%)</Label>
                <Input id="passMark" type="number" value={form.passMark} onChange={(e) => setForm({ ...form, passMark: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="semester">Semester</Label>
              <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First">First Semester</SelectItem>
                  <SelectItem value="Second">Second Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <Label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">Paid Course</Label>
                    <p className="text-xs text-muted-foreground">If checked, students must pay an access fee to view course materials.</p>
                  </div>
                </div>
                <Checkbox
                  id="isPaid"
                  checked={form.isPaid}
                  onCheckedChange={(v) => setForm({ ...form, isPaid: v === true })}
                />
              </div>
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <div className="space-y-1.5">
                    <Label htmlFor="courseFee">Course Access Fee (₦)</Label>
                    <Input id="courseFee" type="number" value={form.courseFee} onChange={(e) => setForm({ ...form, courseFee: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accessDurationMonths">Access Duration (months)</Label>
                    <Input id="accessDurationMonths" type="number" value={form.accessDurationMonths} onChange={(e) => setForm({ ...form, accessDurationMonths: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox
                      id="allowDownload"
                      checked={form.allowDownload}
                      onCheckedChange={(v) => setForm({ ...form, allowDownload: v === true })}
                    />
                    <Label htmlFor="allowDownload" className="text-sm font-medium cursor-pointer">Allow Downloads</Label>
                    <span className="text-xs text-muted-foreground">If unchecked, students cannot download materials.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createCourse} className="bg-primary hover:bg-primary/90" disabled={!form.code || !form.title}>Create Course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — admin can modify cert fee, course fee, level, etc. at any time */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details. The certificate fee takes effect immediately for all future certificate payments.
              Already-issued certificates are not affected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Course Code</Label>
                <Input id="edit-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-level">Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 Level</SelectItem>
                    <SelectItem value="200">200 Level</SelectItem>
                    <SelectItem value="300">300 Level</SelectItem>
                    <SelectItem value="400">400 Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Course Title</Label>
              <Input id="edit-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-creditUnit">Credit Units</Label>
                <Input id="edit-creditUnit" type="number" value={form.creditUnit} onChange={(e) => setForm({ ...form, creditUnit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-certificateFee">Cert Fee (₦)</Label>
                <Input id="edit-certificateFee" type="number" value={form.certificateFee} onChange={(e) => setForm({ ...form, certificateFee: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-passMark">Pass Mark (%)</Label>
                <Input id="edit-passMark" type="number" value={form.passMark} onChange={(e) => setForm({ ...form, passMark: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-semester">Semester</Label>
              <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First">First Semester</SelectItem>
                  <SelectItem value="Second">Second Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <Label htmlFor="edit-isPaid" className="text-sm font-medium cursor-pointer">Paid Course</Label>
                    <p className="text-xs text-muted-foreground">If checked, students must pay an access fee to view course materials.</p>
                  </div>
                </div>
                <Checkbox
                  id="edit-isPaid"
                  checked={form.isPaid}
                  onCheckedChange={(v) => setForm({ ...form, isPaid: v === true })}
                />
              </div>
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-courseFee">Course Access Fee (₦)</Label>
                    <Input id="edit-courseFee" type="number" value={form.courseFee} onChange={(e) => setForm({ ...form, courseFee: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-accessDurationMonths">Access Duration (months)</Label>
                    <Input id="edit-accessDurationMonths" type="number" value={form.accessDurationMonths} onChange={(e) => setForm({ ...form, accessDurationMonths: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} className="bg-primary hover:bg-primary/90" disabled={savingEdit}>
              {savingEdit ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
