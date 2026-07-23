'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Brain, Send, Loader2, Sparkles, BookOpen, GraduationCap } from 'lucide-react'

interface Msg { role: 'user' | 'assistant'; content: string }

export function StudentTutor() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Assalamu alaikum! I'm your AI Economics study buddy at Al-Hikmah University. I can help you with:\n\n• Microeconomics (demand, supply, elasticity, market structures)\n• Macroeconomics (GDP, inflation, fiscal & monetary policy)\n• Monetary economics and central banking\n• Development economics\n• Econometrics (regression, hypothesis testing)\n\nWhat would you like to learn today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    const userMsg: Msg = { role: 'user', content: msg }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
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

  const suggestions = [
    { icon: BookOpen, text: 'Explain the law of demand with examples from the Nigerian market' },
    { icon: BookOpen, text: 'What is the difference between GDP and GNP?' },
    { icon: BookOpen, text: 'How does the CBN use monetary policy to control inflation?' },
    { icon: BookOpen, text: 'Explain price elasticity of demand and its determinants' },
    { icon: BookOpen, text: 'What are the assumptions of ordinary least squares (OLS)?' },
    { icon: BookOpen, text: 'Discuss the causes of underdevelopment in Nigeria' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-11 w-11 rounded-full alhikmah-gradient-gold flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Study Buddy</h2>
            <p className="text-sm text-muted-foreground">Your personal Economics tutor · powered by AI</p>
          </div>
        </div>
      </div>

      <Card className="flex flex-col h-[600px]">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full" />
            <p className="text-xs font-medium">Online · typically replies instantly</p>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollRef as any}>
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full alhikmah-gradient-gold flex items-center justify-center flex-shrink-0">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full alhikmah-gradient-gold flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <div className="border-t p-3 space-y-2">
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 pb-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s.text)} className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-foreground/80 border flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-gold" />
                  {s.text.length > 50 ? s.text.slice(0, 50) + '…' : s.text}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type your question about Economics…"
              disabled={loading}
            />
            <Button onClick={() => send()} disabled={loading || !input.trim()} className="bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
