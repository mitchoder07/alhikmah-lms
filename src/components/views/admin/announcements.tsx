'use client'

import { useApi, apiPost, apiDelete } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Megaphone, Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Announcement {
  id: string; title: string; body: string; createdAt: string
  course?: { code: string; title: string } | null
  author: { name: string }
}

export function AdminAnnouncements() {
  const { data, loading, refetch } = useApi<{ announcements: Announcement[] }>('/api/admin/announcements')
  const { data: coursesData } = useApi<{ courses: Array<{ id: string; code: string; title: string }> }>('/api/courses')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', courseId: '', publishAt: '' })

  const create = async () => {
    try {
      await apiPost('/api/admin/announcements', {
        ...form,
        courseId: form.courseId || null,
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      })
      toast.success('Announcement posted')
      setOpen(false)
      setForm({ title: '', body: '', courseId: '', publishAt: '' })
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await apiDelete(`/api/admin/announcements/${id}`)
      toast.success('Deleted')
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-sm text-muted-foreground mt-1">Broadcast messages to students.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (data?.announcements ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(data?.announcements ?? []).map((a) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {a.course && <Badge variant="outline" className="text-[10px]">{a.course.code}</Badge>}
                      <span className="text-[10px] text-muted-foreground">by {a.author.name}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>Choose "All Courses" to broadcast to everyone, or select a specific course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Welcome to ECO201!" />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Write your announcement..." />
            </div>
            <div className="space-y-1.5">
              <Label>Target Course (optional)</Label>
              <Select value={form.courseId || 'all'} onValueChange={(v) => setForm({ ...form, courseId: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {(coursesData?.courses ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}: {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-publish-at">Schedule (optional)</Label>
              <Input
                id="ann-publish-at"
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">If set, the announcement will only be visible to students after this date and time. Leave blank to publish immediately.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.title || !form.body} className="bg-primary hover:bg-primary/90">Post Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
