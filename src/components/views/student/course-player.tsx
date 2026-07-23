'use client'

import { useApi, apiPost, apiPatch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Award, CheckCircle2, ChevronLeft, FileText, Play, PlayCircle, Lock, Brain, Download, Video, File, FileCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { QuizModal } from '@/components/lms/quiz-modal'
import { AITutorPanel } from '@/components/lms/ai-tutor-panel'

interface CourseData {
  course: {
    id: string; code: string; title: string; description: string; level: string; creditUnit: number; certificateFee: number; passMark: number
    liveClassUrl?: string | null; liveClassTitle?: string | null; liveClassScheduledAt?: string | null
    lecturer: { name: string }
    modules: Array<{
      id: string; title: string; description?: string | null; position: number
      lessons: Array<{
        id: string; title: string; description?: string | null; content?: string | null; videoUrl?: string | null; duration: number; position: number; isPreview: boolean
        files: Array<{ id: string; filename: string; fileUrl: string; fileType: string; fileSize: number }>
        quizzes: Array<{ id: string; title: string; passMark: number; questions: Array<{ id: string; text: string; options: string; answer: string; marks: number }> }>
        progress?: Array<{ completed: boolean; watchedSec: number }>
      }>
    }>
    enrollments: Array<{ id: string; finalScore: number | null; lecturerApproved: boolean; completedAt: string | null; certificate: { certificateNumber: string } | null }>
    announcements: Array<{ id: string; title: string; body: string; createdAt: string }>
  }
}

export function StudentCoursePlayer({ courseId, onNavigate }: { courseId: string; onNavigate: (v: string, p?: any) => void }) {
  const { data, loading, refetch } = useApi<CourseData>(`/api/courses/${courseId}`)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [quizOpen, setQuizOpen] = useState<string | null>(null)
  const [tutorOpen, setTutorOpen] = useState(false)

  const course = data?.course
  const enrollment = course?.enrollments?.[0]
  const allLessons = course?.modules.flatMap(m => m.lessons) ?? []
  const activeLesson = allLessons.find(l => l.id === activeLessonId) ?? allLessons[0]

  // Auto-select first lesson if none selected — schedule via microtask to avoid setState-in-effect lint
  useEffect(() => {
    if (!activeLessonId && allLessons.length > 0) {
      Promise.resolve().then(() => setActiveLessonId(allLessons[0].id))
    }
  }, [allLessons, activeLessonId])

  const completedCount = allLessons.filter(l => l.progress?.[0]?.completed).length
  const overallProgress = allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0

  const markComplete = async (lessonId: string) => {
    try {
      await apiPatch(`/api/courses/${courseId}/lessons/${lessonId}/progress`, { completed: true })
      toast.success('Lesson marked complete')
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading || !course) {
    return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading course…</div>
  }

  const hasCertificate = !!enrollment?.certificate
  const canPayForCert = enrollment?.lecturerApproved && !hasCertificate

  return (
    <div className="space-y-4">
      <button onClick={() => onNavigate('courses')} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
        <ChevronLeft className="h-3 w-3" /> Back to courses
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{course.code}</Badge>
            <Badge variant="secondary">{course.level} Level</Badge>
            <Badge variant="secondary">{course.creditUnit} CU</Badge>
          </div>
          <h2 className="text-2xl font-bold">{course.title}</h2>
          <p className="text-sm text-muted-foreground">By {course.lecturer.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Your Progress</p>
            <p className="text-lg font-bold text-primary">{overallProgress}%</p>
          </div>
          <div className="w-32">
            <Progress value={overallProgress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">{completedCount}/{allLessons.length} lessons</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Lesson content */}
        <div className="lg:col-span-2 space-y-4">
          {activeLesson && (
            <>
              <Card>
                <div className="aspect-video bg-black rounded-t-lg overflow-hidden flex items-center justify-center">
                  {activeLesson.videoUrl ? (
                    <iframe
                      src={activeLesson.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-white/60 flex flex-col items-center gap-2">
                      <Video className="h-12 w-12" />
                      <p className="text-xs">No video for this lesson</p>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{activeLesson.title}</h3>
                  {activeLesson.description && <p className="text-sm text-muted-foreground mb-3">{activeLesson.description}</p>}
                  {activeLesson.content && <div className="prose prose-sm max-w-none text-sm text-muted-foreground mb-3">{activeLesson.content}</div>}
                  <div className="flex flex-wrap gap-2">
                    {activeLesson.progress?.[0]?.completed ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>
                    ) : (
                      <Button size="sm" onClick={() => markComplete(activeLesson.id)} className="bg-primary hover:bg-primary/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Mark as Complete
                      </Button>
                    )}
                    {activeLesson.quizzes.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setQuizOpen(activeLesson.quizzes[0].id)}>
                        <Play className="h-3 w-3 mr-1" /> Take Quiz
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setTutorOpen(true)}>
                      <Brain className="h-3 w-3 mr-1" /> Ask AI Tutor
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Files */}
              {activeLesson.files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lesson Materials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeLesson.files.map((f) => (
                      <a key={f.id} href={f.fileUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-md border hover:bg-secondary/50 transition-colors">
                        <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {f.fileType === 'image' ? <FileText className="h-4 w-4 text-primary" /> :
                           f.fileType === 'video' ? <Video className="h-4 w-4 text-primary" /> :
                           <File className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.filename}</p>
                          <p className="text-xs text-muted-foreground capitalize">{f.fileType} · {(f.fileSize / 1024).toFixed(0)} KB</p>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar — course outline */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Course Outline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-3 pb-3">
                <Accordion type="multiple" defaultValue={course.modules.map(m => m.id)} className="w-full">
                  {course.modules.map((m) => (
                    <AccordionItem key={m.id} value={m.id} className="border-b last:border-0">
                      <AccordionTrigger className="text-sm hover:no-underline py-3">
                        <div className="text-left">
                          <p className="font-medium">{m.title}</p>
                          <p className="text-[10px] text-muted-foreground">{m.lessons.length} lessons</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <div className="space-y-1">
                          {m.lessons.map((l) => {
                            const isActive = activeLesson?.id === l.id
                            const isDone = l.progress?.[0]?.completed
                            return (
                              <button
                                key={l.id}
                                onClick={() => setActiveLessonId(l.id)}
                                className={`w-full text-left flex items-start gap-2 p-2 rounded-md text-xs transition-colors ${
                                  isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                                }`}
                              >
                                {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" /> :
                                 <PlayCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
                                <div className="min-w-0">
                                  <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>{l.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{l.duration} min · {l.quizzes.length} quiz</p>
                                </div>
                              </button>
                            )
                          })}
                          {m.lessons.length === 0 && (
                            <p className="text-[10px] text-muted-foreground px-2 py-1">No lessons yet.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Live class card */}
          {course.liveClassUrl && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <CardTitle className="text-sm">Live Session</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium text-xs">{course.liveClassTitle || 'Live Class'}</p>
                {course.liveClassScheduledAt && (
                  <p className="text-xs text-muted-foreground">
                    Scheduled: {new Date(course.liveClassScheduledAt).toLocaleString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
                <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => window.open(course.liveClassUrl!, '_blank')}>
                  <Video className="h-3 w-3 mr-1" /> Join Live Class
                </Button>
                <p className="text-[10px] text-muted-foreground">Opens Zoom, Google Meet, or Teams in a new tab.</p>
              </CardContent>
            </Card>
          )}

          {/* Final Exam card */}
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">Final Exam</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Pass the final exam to qualify for your certificate.</p>
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={() => onNavigate('final-exam', { courseId: course.id, courseTitle: course.title })}>
                <FileCheck className="h-3 w-3 mr-1" /> Take Final Exam
              </Button>
            </CardContent>
          </Card>

          {/* Certificate card */}
          <Card className={hasCertificate ? 'border-gold' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Award className={`h-5 w-5 ${hasCertificate ? 'text-gold' : 'text-muted-foreground'}`} />
                <CardTitle className="text-sm">Certificate</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hasCertificate ? (
                <>
                  <p className="text-xs text-green-600 font-medium">Certificate issued!</p>
                  <p className="text-xs font-mono bg-secondary px-2 py-1 rounded">{enrollment?.certificate?.certificateNumber}</p>
                  <Button size="sm" className="w-full bg-gold hover:bg-gold/90 text-black" onClick={() => onNavigate('certificates')}>
                    View Certificate
                  </Button>
                </>
              ) : !enrollment?.lecturerApproved ? (
                <>
                  <p className="text-xs text-muted-foreground">Complete all lessons and quizzes. The lecturer will approve you for certification.</p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span>Lessons:</span><span>{completedCount}/{allLessons.length}</span></div>
                    <div className="flex justify-between"><span>Approval:</span><span className="text-amber-600">Pending</span></div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">You're approved! Pay the certificate fee to get your verified certificate.</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-bold text-gold">₦{course.certificateFee.toLocaleString()}</span>
                  </div>
                  <Button size="sm" className="w-full bg-gold hover:bg-gold/90 text-black" onClick={() => onNavigate('checkout', { enrollmentId: enrollment?.id, courseId: course.id })}>
                    Pay & Get Certificate
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {tutorOpen && (
            <AITutorPanel courseId={course.id} onClose={() => setTutorOpen(false)} />
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {quizOpen && activeLesson && (
        <QuizModal
          quiz={activeLesson.quizzes.find(q => q.id === quizOpen)!}
          lessonId={activeLesson.id}
          courseId={course.id}
          onClose={() => setQuizOpen(null)}
          onSubmitted={() => { refetch(); setQuizOpen(null) }}
        />
      )}
    </div>
  )
}
