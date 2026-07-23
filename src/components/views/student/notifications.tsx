'use client'

import { useApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Loader2, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  createdAt: string
  course?: { code: string; title: string } | null
  author: { name: string }
}

export function StudentNotifications() {
  const { data, loading } = useApi<{ announcements: Announcement[] }>('/api/announcements')
  const announcements = data?.announcements ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">All announcements from your lecturers and the department.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet. Check back later for announcements.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.course && <Badge variant="outline" className="text-[10px]">{a.course.code}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">{a.body}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>by {a.author.name}</span>
                      <span>·</span>
                      <span>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
