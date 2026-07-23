'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Brain, Send, Loader2, X, Sparkles } from 'lucide-react'

interface Msg { role: 'user' | 'assistant'; content: string }

export function AITutorPanel({ courseId, onClose }: { courseId?: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Assalamu alaikum! I'm your Economics study buddy. Ask me anything about your courses: demand & supply, elasticity, monetary policy, econometrics, you name it." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Msg = { role: 'user', content: input.trim() }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          courseId,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        })
      })
      const data = await res.json()
      setMessages((p) => [...p, { role: 'assistant', content: data.reply || 'Sorry, I could not respond.' }])
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const suggested = [
    'Explain the law of demand with examples',
    'What is the difference between GDP and GNP?',
    'How does monetary policy affect inflation?',
    'Explain price elasticity of demand',
  ]

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full alhikmah-gradient-gold flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">AI Study Buddy</CardTitle>
            <p className="text-[10px] text-muted-foreground">Economics tutor · online</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[260px] pr-2" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {messages.length <= 1 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-gold" /> Suggested questions:</p>
            <div className="flex flex-wrap gap-1">
              {suggested.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/70 text-foreground/80 border">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask your question…"
            className="text-sm"
            disabled={loading}
          />
          <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="bg-primary hover:bg-primary/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
