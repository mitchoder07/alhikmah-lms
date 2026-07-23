'use client'

import { useApi, apiPost } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Award, TrendingUp, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { useSession } from '@/components/app-provider'
import { useRouter } from 'next/navigation'

interface Course {
  id: string; code: string; title: string; description: string; level: string; semester: string; creditUnit: number; certificateFee: number; thumbnailUrl?: string | null
  lecturer: { name: string }
  _count: { enrollments: number }
}
interface Enrollment {
  id: string; enrolledAt: string; finalScore: number | null; lecturerApproved: boolean; completedAt: string | null
  course: Course
  certificate: { certificateNumber: string } | null
  course: {
    id: string; code: string; title: string; creditUnit: number; certificateFee: number
    lecturer: { name: string }
    modules: { lessons: { progress: { completed: boolean }[] }[] }[]
  }
}

export function StudentDashboard({ onNavigate }: { onNavigate: (v: string, p?: any) => void }) {
  const { user } = useSession()
  const { data: coursesData } = useApi<{ courses: Course[] }>('/api/courses')
  const { data: enrollData, loading } = useApi<{ enrollments: Enrollment[] }>('/api/enrollments')

  const enrollments = enrollData?.enrollments ?? []
  const inProgress = enrollments.filter(e => !e.completedAt)
  const completed = enrollments.filter(e => e.completedAt)

  // Compute overall progress
  const computeProgress = (e: Enrollment) => {
    const lessons = e.course.modules.flatMap(m => m.lessons)
    if (lessons.length === 0) return 0
    const done = lessons.filter(l => l.progress[0]?.completed).length
    return Math.round((done / lessons.length) * 100)
  }

  const announcements = [
    { title: 'Welcome back!', body: 'You have new lessons available in Microeconomic Theory I.', time: '2h ago' },
    { title: 'Quiz reminder', body: 'Intro to Microeconomics Quiz is due this Friday.', time: '1d ago' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome */}
      <div className="alhikmah-gradient rounded-xl p-4 sm:p-6 text-white">
        <p className="text-xs sm:text-sm text-white/80">Welcome back,</p>
        <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate">{user?.name}</h2>
        <p className="text-xs sm:text-sm text-white/90 truncate">{user?.matricNumber || 'Student'} · Department of Economics</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur rounded-lg px-2 sm:px-4 py-2 border border-white/20 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-white/70">Enrolled</p>
            <p className="text-lg sm:text-xl font-bold text-gold">{enrollments.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg px-2 sm:px-4 py-2 border border-white/20 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-white/70">Completed</p>
            <p className="text-lg sm:text-xl font-bold text-gold">{completed.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg px-2 sm:px-4 py-2 border border-white/20 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-white/70">Certificates</p>
            <p className="text-lg sm:text-xl font-bold text-gold">{enrollments.filter(e => e.certificate).length}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={BookOpen} label="In Progress" value={String(inProgress.length)} accent="primary" />
        <StatCard icon={Award} label="Certificates" value={String(enrollments.filter(e => e.certificate).length)} accent="gold" />
        <StatCard icon={TrendingUp} label="Avg Progress" value={`${Math.round(enrollments.length ? enrollments.reduce((s, e) => s + computeProgress(e), 0) / enrollments.length : 0)}%`} accent="primary" />
        <StatCard icon={Clock} label="Available" value={String(coursesData?.courses.length ?? 0)} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Continue learning */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base">Continue Learning</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('courses')} className="text-xs h-8">View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading</p>
          ) : inProgress.length === 0 ? (
            <Card><CardContent className="py-8 sm:py-10 text-center text-sm text-muted-foreground">No active courses. Browse the catalog to enroll.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {inProgress.slice(0, 3).map((e) => {
                const progress = computeProgress(e)
                return (
                  <Card key={e.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onNavigate('course-player', { courseId: e.course.id })}>
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg alhikmah-gradient flex items-center justify-center text-white font-bold text-[9px] sm:text-xs flex-shrink-0">
                        {e.course.code.slice(0, 6)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{e.course.title}</p>
                        <p className="text-xs text-muted-foreground mb-2 truncate">{e.course.code} · {e.course.lecturer.name}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground flex-shrink-0">{progress}%</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-sm sm:text-base">Announcements</h3>
          <div className="space-y-3">
            {announcements.map((a, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1">{a.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{a.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-gold/40 bg-gold/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-sm">Need help studying?</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Ask the AI Study Buddy anything about your courses.</p>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('tutor')}>Open AI Tutor</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: 'primary' | 'gold' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent === 'primary' ? 'bg-primary/10' : 'bg-gold/20'}`}>
            <Icon className={`h-4 w-4 ${accent === 'primary' ? 'text-primary' : 'text-gold'}`} />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
