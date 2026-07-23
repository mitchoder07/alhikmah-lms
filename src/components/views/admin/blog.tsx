'use client'

import { useApi, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Plus, Newspaper, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/lms/image-upload'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  imageUrl: string | null
  isPublished: boolean
  createdAt: string
  author: { id: string; name: string }
  course?: { id: string; code: string; title: string } | null
}

const emptyForm = {
  title: '',
  excerpt: '',
  content: '',
  imageUrl: '' as string,
  courseId: '',
  isPublished: true,
  publishAt: '' as string,
}

export function AdminBlog() {
  const { data, loading, refetch } = useApi<{ posts: BlogPost[] }>('/api/admin/blog')
  const { data: coursesData } = useApi<{ courses: Array<{ id: string; code: string; title: string }> }>('/api/courses')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const openNew = () => {
    setForm(emptyForm)
    setEditingId(null)
    setOpen(true)
  }

  const openEdit = (post: any) => {
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      imageUrl: post.imageUrl ?? '',
      courseId: post.course?.id ?? '',
      isPublished: post.isPublished,
      publishAt: post.publishAt ? new Date(post.publishAt).toISOString().slice(0, 16) : '',
    })
    setEditingId(post.id)
    setOpen(true)
  }

  const save = async () => {
    if (!form.title || !form.content) {
      toast.error('Title and content are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        imageUrl: form.imageUrl || null,
        courseId: form.courseId || null,
        isPublished: form.isPublished,
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      }
      if (editingId) {
        await apiPatch(`/api/admin/blog/${editingId}`, payload)
        toast.success('Post updated')
      } else {
        await apiPost('/api/admin/blog', payload)
        toast.success('Post created')
      }
      setOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this blog post? This cannot be undone.')) return
    try {
      await apiDelete(`/api/admin/blog/${id}`)
      toast.success('Post deleted')
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const togglePublish = async (post: BlogPost) => {
    try {
      await apiPatch(`/api/admin/blog/${post.id}`, { isPublished: !post.isPublished })
      toast.success(post.isPublished ? 'Unpublished' : 'Published')
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const posts = data?.posts ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog</h2>
          <p className="text-sm text-muted-foreground mt-1">Publish articles, study tips, and updates visible on the landing page.</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> New Post
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading posts…</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No blog posts yet. Click “New Post” to create your first article.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {p.isPublished ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                      )}
                      {p.course && (
                        <Badge variant="outline" className="text-[10px]">{p.course.code}</Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm leading-tight">{p.title}</p>
                    {p.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">by {p.author.name}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => togglePublish(p)}
                      title={p.isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {p.isPublished ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)} title="Edit">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(p.id)} title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Post' : 'New Blog Post'}</DialogTitle>
            <DialogDescription>
              Write an article for the department blog. Posts appear on the landing page once published.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bp-title">Title</Label>
              <Input
                id="bp-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Understanding Inflation in Nigeria"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-excerpt">Excerpt</Label>
              <Input
                id="bp-excerpt"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="A short summary shown on the blog card."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-content">Content</Label>
              <Textarea
                id="bp-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                placeholder="Write your article here. Plain text or markdown supported."
              />
            </div>
            <ImageUpload
              value={form.imageUrl || null}
              onChange={(url) => setForm({ ...form, imageUrl: url ?? '' })}
              label="Cover Image (optional)"
            />
            <div className="space-y-1.5">
              <Label>Linked Course (optional)</Label>
              <Select
                value={form.courseId || 'none'}
                onValueChange={(v) => setForm({ ...form, courseId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No linked course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked course</SelectItem>
                  {(coursesData?.courses ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}: {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="bp-publish" className="text-sm font-medium cursor-pointer">Publish immediately</Label>
                <p className="text-xs text-muted-foreground">If off, the post is saved as a draft.</p>
              </div>
              <Switch
                id="bp-publish"
                checked={form.isPublished}
                onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-publish-at">Schedule Publish (optional)</Label>
              <Input
                id="bp-publish-at"
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">If set, the post will only be visible to the public after this date and time. Leave blank to publish immediately (when publish toggle is on).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.title || !form.content} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
