'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft, ArrowRight, Newspaper, User, Calendar, BookOpen } from 'lucide-react'

// Strip markdown formatting from text so it reads as plain text
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')      // Remove ## headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // Remove **bold**
    .replace(/\*(.+?)\*/g, '$1')       // Remove *italic*
    .replace(/^[-*]\s+/gm, '')         // Remove - bullet points
    .replace(/^>\s+/gm, '')            // Remove > blockquotes
    .replace(/`(.+?)`/g, '$1')         // Remove `inline code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove [link](url) → keep text
    .replace(/^---+$/gm, '')           // Remove --- separators
    .trim()
}

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  imageUrl: string | null
  createdAt: string
  author: { id: string; name: string }
  course?: { id: string; code: string; title: string } | null
}

export default function BlogDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!params?.id) return
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    fetch(`/api/blog/${params.id}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error || `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        if (!d?.post) throw new Error('Blog post not found')
        setPost(d.post)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [params?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Newspaper className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h1 className="text-xl font-bold mb-2">Post not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {error || 'The blog post you are looking for does not exist or has been removed.'}
        </p>
        <Button onClick={() => router.push('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between max-w-3xl mx-auto">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 min-w-0">
            <img src="/icon-192.png?v=2" alt="Logo" className="h-8 w-8 rounded-full flex-shrink-0" />
            <span className="font-bold text-primary text-xs sm:text-sm truncate">Al-Bashir Academy</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Home
          </Button>
        </div>
      </header>

      {/* Article */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="mb-6 -ml-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
        </Button>

        {/* Article header */}
        <div className="mb-6">
          {/* Course badge */}
          {post.course && (
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              <BookOpen className="h-3 w-3 mr-1" />
              {post.course.code}: {post.course.title}
            </Badge>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4 text-foreground">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {post.author.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Cover image */}
        {post.imageUrl && (
          <div className="rounded-lg overflow-hidden border mb-8 aspect-video bg-secondary">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content — plain text, no markdown */}
        <article className="max-w-none">
          <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground">
            {stripMarkdown(post.content)}
          </div>
        </article>

        {/* CTA at bottom */}
        <Card className="mt-12 border-primary/20 bg-primary/5">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="h-12 w-12 rounded-full albashir-gradient flex items-center justify-center mx-auto mb-3">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Ready to start learning?</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Create a free student account with any email — Gmail, Yahoo, Outlook, or your Al-Bashir email — and enroll in Economics courses today.
            </p>
            <Button size="lg" onClick={() => router.push('/register')} className="bg-primary hover:bg-primary/90">
              Create Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="px-4 py-6 max-w-3xl mx-auto text-center text-[11px] sm:text-xs text-muted-foreground">
          © {new Date().getFullYear()} Al-Bashir Academy · Department of Economics
        </div>
      </footer>
    </div>
  )
}
