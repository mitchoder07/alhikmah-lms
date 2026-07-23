'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Award, Users, Brain, BarChart3, ShieldCheck, FileText, Video, ArrowRight, GraduationCap, Sparkles, Radio, Smartphone, TrendingUp, Quote, CheckCircle2, Newspaper } from 'lucide-react'
import { useApi } from '@/lib/api'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  imageUrl: string | null
  createdAt: string
  author: { id: string; name: string }
  course?: { id: string; code: string; title: string } | null
}

export function LandingPage() {
  const router = useRouter()
  const { data: blogData } = useApi<{ posts: BlogPost[] }>('/api/blog')
  const blogPosts = (blogData?.posts ?? []).slice(0, 3)
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header — simple, no overflow */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="px-4 h-14 flex items-center justify-between gap-2 max-w-7xl mx-auto">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full alhikmah-gradient flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">HUI</div>
            <span className="font-bold text-primary text-xs sm:text-sm truncate">Al-Hikmah University</span>
          </button>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')} className="text-xs h-8 px-2.5 sm:px-3">Sign in</Button>
            <Button size="sm" onClick={() => router.push('/register')} className="bg-primary hover:bg-primary/90 text-xs h-8 px-2.5 sm:px-3">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#003d1f]">
        <div className="absolute inset-0 alhikmah-gradient" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(212,175,55,0.4) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(212,175,55,0.3) 0%, transparent 50%)' }} />

        <div className="relative px-4 py-10 sm:py-16 lg:py-24 text-white max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-[10px] sm:text-xs font-medium mb-5 border border-gold/50">
              <Sparkles className="h-3 w-3 text-gold" />
              <span className="text-gold font-semibold">Dept. of Economics · Ilorin · Est. 2005</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
              Learn Economics.<br />
              <span className="text-gold">Earn Verified Certificates.</span>
            </h1>

            <p className="text-sm sm:text-lg text-white/85 mb-7 max-w-2xl leading-relaxed">
              A modern learning portal from the Department of Economics, Al-Hikmah University, Ilorin.
              Open to everyone. Stream lectures, attempt quizzes, get help from your AI study buddy, and pay for certificates securely via Paystack or Flutterwave.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 mb-8">
              <Button size="lg" onClick={() => router.push('/register')} className="bg-gold hover:bg-gold/90 text-black font-semibold h-12 text-sm sm:text-base">
                Create Student Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-white/80 mb-8">
              {['Free to enroll', 'No matric required for guests', 'Pay only for certificates', 'Mobile app available'].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/15 max-w-2xl">
              {[
                { label: 'Active Courses', value: '5+' },
                { label: 'Students', value: '200+' },
                { label: 'Credit Units', value: '14' },
                { label: 'Cert Fee from', value: '₦5K' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl sm:text-3xl font-bold text-gold leading-none">{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-white/60 mt-1.5 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-8 bg-background">
          <svg className="absolute top-0 left-0 w-full h-8 -translate-y-1/2" viewBox="0 0 1440 48" preserveAspectRatio="none" fill="none">
            <path d="M0,24 C240,48 480,0 720,16 C960,32 1200,8 1440,24 L1440,48 L0,48 Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12 sm:py-16 lg:py-20 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-semibold text-gold uppercase tracking-wider mb-2">Everything you need</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">A complete LMS, tailored for Economics</h2>
          <p className="text-sm sm:text-base text-muted-foreground">From lecture uploads to certificate issuance, the portal covers the full teaching and learning lifecycle.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: Video, title: 'Video Lectures', desc: 'Stream recorded lectures organized by modules and lessons. Resume from where you left off, with progress tracking.' },
            { icon: Radio, title: 'Live Class Links', desc: 'Lecturers paste Zoom, Google Meet, or Teams links. Students see a "Join Live Class" button when a session is scheduled.' },
            { icon: FileText, title: 'Course Materials', desc: 'Download PDFs, slide decks, worksheets and supplementary files attached to each lesson.' },
            { icon: Brain, title: 'AI Study Buddy', desc: 'Ask questions about your course material and get instant, contextual answers powered by AI. Works like a personal tutor.' },
            { icon: BarChart3, title: 'Real-time Analytics', desc: 'Lecturers see live engagement, completion rates, quiz performance, and revenue trends on one dashboard.' },
            { icon: Award, title: 'QR-verifiable Certificates', desc: 'Each certificate has a unique number and QR code. Anyone can verify authenticity at the public verification portal.' },
            { icon: ShieldCheck, title: 'Paystack + Flutterwave', desc: 'Pay for certificates in Naira via Paystack or Flutterwave. Cards, bank transfer, USSD all supported.' },
            { icon: BookOpen, title: 'Quiz Engine', desc: 'Auto-graded quizzes after each lesson. Students must hit the pass mark to qualify for certification.' },
            { icon: Users, title: 'Student Roster & Gradebook', desc: 'Bulk import students, view a course by student grade matrix, and approve candidates for certification.' },
            { icon: Smartphone, title: 'Installable PWA', desc: 'Add the portal to your phone home screen. Works offline for already-downloaded lessons and materials.' },
            { icon: GraduationCap, title: 'Moodle-style Modules', desc: 'Familiar hierarchical structure: Course, then Modules, then Lessons, Files, Quizzes, and Progress.' },
            { icon: Sparkles, title: 'Open to Everyone', desc: 'Al-Hikmah students and external learners alike. Sign up with any email (Gmail, Yahoo, Outlook, etc.).' },
          ].map((f, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow border-border/60">
              <CardHeader className="p-4 sm:p-6">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg alhikmah-gradient flex items-center justify-center mb-2 sm:mb-3 shadow-sm">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg">{f.title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-secondary/40 border-y">
        <div className="px-4 py-12 sm:py-16 max-w-3xl mx-auto text-center">
          <Quote className="h-8 w-8 sm:h-10 sm:w-10 text-gold mx-auto mb-3 sm:mb-4 opacity-60" />
          <p className="text-base sm:text-xl lg:text-2xl font-medium text-foreground leading-relaxed mb-3 sm:mb-4">
            "This portal brings our Economics curriculum into the digital age. Students can now learn at their own pace, ask an AI tutor questions anytime, and earn certificates that employers can verify online."
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Department of Economics, Al-Hikmah University, Ilorin</p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="px-4 py-12 sm:py-16 text-center max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to start learning?</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">Create a free student account with any email: Gmail, Yahoo, Outlook, or your Al-Hikmah email. Enroll in Economics courses today.</p>
          <Button size="lg" onClick={() => router.push('/register')} className="bg-primary hover:bg-primary/90 h-12 text-sm sm:text-base">
            Create Account <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Blog — latest from the department */}
      {blogPosts.length > 0 && (
        <section className="px-4 py-12 sm:py-16 lg:py-20 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] sm:text-xs font-medium mb-3">
              <Newspaper className="h-3 w-3 text-gold" />
              <span className="text-gold font-semibold">From the Blog</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">Latest from the Department</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Insights, study tips, and updates from our Economics lecturers</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {blogPosts.map((post) => (
              <Card key={post.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow border-border/60">
                {post.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden bg-secondary">
                    <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video w-full alhikmah-gradient flex items-center justify-center">
                    <Newspaper className="h-10 w-10 text-white/80" />
                  </div>
                )}
                <CardHeader className="p-4 sm:p-5 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {post.course && (
                      <span className="text-[10px] font-medium text-gold uppercase tracking-wide">{post.course.code}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <CardTitle className="text-base sm:text-lg leading-tight line-clamp-2">{post.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm leading-relaxed line-clamp-3 mt-1">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">by {post.author.name}</span>
                    <a href={`/blog/${post.id}`}>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs text-primary hover:text-primary/80 p-0 h-auto"
                      >
                        Read more <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="px-4 py-8 max-w-7xl mx-auto grid sm:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full alhikmah-gradient flex items-center justify-center text-white font-bold text-[9px]">HUI</div>
              <p className="font-semibold">Al-Hikmah University LMS</p>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">Department of Economics, Ilorin, Kwara State, Nigeria.</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Quick Links</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><button className="hover:text-primary text-xs sm:text-sm" onClick={() => router.push('/register')}>Register as Student</button></li>
              <li><button className="hover:text-primary text-xs sm:text-sm" onClick={() => router.push('/login')}>Student Sign in</button></li>
              <li><button className="hover:text-primary text-xs sm:text-sm" onClick={() => router.push('/verify-certificate')}>Verify Certificate</button></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Get Started</p>
            <p className="text-xs text-muted-foreground">Free to enroll. No matric number required for guests. Sign up with any email.</p>
          </div>
        </div>
        <div className="border-t py-4 text-center text-[11px] sm:text-xs text-muted-foreground px-4">
          © {new Date().getFullYear()} Al-Hikmah University, Ilorin · Department of Economics · Built with care for educators.
        </div>
      </footer>
    </div>
  )
}
