'use client'

import { useApi, apiPost } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, CheckCircle2, ArrowRight, Loader2, Lock, CreditCard, ShieldCheck, ShoppingCart, Trash2, Search, Filter, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCartIds } from './course-cart'

interface Course {
  id: string; code: string; title: string; description: string; level: string; semester: string; creditUnit: number; certificateFee: number; thumbnailUrl?: string | null
  isPaid?: boolean; courseFee?: number; accessDurationMonths?: number; allowDownload?: boolean
  lecturer: { name: string }
  _count: { enrollments: number }
}
interface Enrollment {
  id: string; course: { id: string }
}
interface AccessInfo {
  hasAccess: boolean
  expiresAt?: string
}

const LEVEL_OPTIONS = ['All', '100', '200', '300', '400'] as const
type LevelFilter = typeof LEVEL_OPTIONS[number]
type TypeFilter = 'All' | 'Free' | 'Paid'

export function StudentCourses({ onNavigate }: { onNavigate: (v: string, p?: any) => void }) {
  const router = useRouter()
  const { data: coursesData, loading: l1 } = useApi<{ courses: Course[] }>('/api/courses')
  const { data: enrollData, loading: l2, refetch } = useApi<{ enrollments: Enrollment[] }>('/api/enrollments')
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [accessMap, setAccessMap] = useState<Record<string, AccessInfo>>({})
  const { ids: cartIds, toggle: toggleCart } = useCartIds()

  // Search + filter state
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  const courses = coursesData?.courses ?? []
  const enrolledCourseIds = new Set((enrollData?.enrollments ?? []).map(e => e.course.id))

  // For each paid course the student is enrolled in, fetch access status
  // Use coursesData and enrollData (stable from useState) as deps, not derived `courses`
  useEffect(() => {
    if (!coursesData || !enrollData) return
    let cancelled = false
    const allCourses = coursesData.courses
    const enrolledIds = new Set(enrollData.enrollments.map(e => e.course.id))
    const paidEnrolledCourses = allCourses.filter((c) => c.isPaid && enrolledIds.has(c.id))
    if (paidEnrolledCourses.length === 0) {
      return
    }
    Promise.all(
      paidEnrolledCourses.map(async (c) => {
        try {
          const r = await fetch(`/api/courses/${c.id}/access`, { cache: 'no-store' })
          if (!r.ok) return null
          const json = await r.json()
          return [c.id, { hasAccess: !!json.hasAccess, expiresAt: json.expiresAt }] as const
        } catch {
          return null
        }
      })
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, AccessInfo> = {}
      for (const r of results) {
        if (r) map[r[0]] = r[1]
      }
      setAccessMap(map)
    })
    return () => { cancelled = true }
  }, [coursesData, enrollData])

  // Client-side filtering
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses.filter((c) => {
      // Level filter
      if (levelFilter !== 'All' && c.level !== levelFilter) return false
      // Type filter
      if (typeFilter === 'Paid' && !c.isPaid) return false
      if (typeFilter === 'Free' && c.isPaid) return false
      // Search query — match code, title, or description
      if (q) {
        const haystack = `${c.code} ${c.title} ${c.description}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [courses, search, levelFilter, typeFilter])

  const hasActiveFilters = search.trim() !== '' || levelFilter !== 'All' || typeFilter !== 'All'

  const clearFilters = () => {
    setSearch('')
    setLevelFilter('All')
    setTypeFilter('All')
  }

  const enroll = async (courseId: string) => {
    setEnrolling(courseId)
    try {
      await apiPost(`/api/courses/${courseId}/enroll`)
      toast.success('Enrolled! You can now access course materials.')
      refetch()
    } catch (e: any) {
      toast.error(e.message || 'Enrollment failed')
    } finally {
      setEnrolling(null)
    }
  }

  const payForAccess = async (course: Course) => {
    setEnrolling(course.id)
    try {
      const res = await apiPost(`/api/courses/${course.id}/access`, { provider: 'paystack' })
      if (res.authorization_url) {
        // Demo mode returns a relative URL; real gateway returns absolute URL.
        if (res.authorization_url.startsWith('http')) {
          window.location.href = res.authorization_url
        } else {
          router.push(res.authorization_url)
        }
      } else {
        toast.success('Payment initiated')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to initiate payment')
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Course Catalog</h2>
        <p className="text-sm text-muted-foreground mt-1">Browse and enroll in Economics courses offered by the department.</p>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search bar — full width on mobile */}
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="course-search" className="text-xs text-muted-foreground sr-only">
                Search courses
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="course-search"
                  type="search"
                  placeholder="Search by title, code, or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filters — below search on mobile, inline on sm+ */}
            <div className="grid grid-cols-2 sm:flex sm:items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="level-filter" className="text-xs text-muted-foreground">
                  Level
                </Label>
                <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)}>
                  <SelectTrigger id="level-filter" className="w-full sm:w-32">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl === 'All' ? 'All Levels' : `${lvl} Level`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type-filter" className="text-xs text-muted-foreground">
                  Type
                </Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                  <SelectTrigger id="type-filter" className="w-full sm:w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    <SelectItem value="Free">Free</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active filter summary + clear */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Filter className="h-3 w-3" />
              Showing <span className="font-semibold text-foreground">{filteredCourses.length}</span> of <span className="font-semibold text-foreground">{courses.length}</span> courses
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                <XCircle className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {(l1 || l2) ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-lg mb-1">No courses match your search</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Try adjusting your search query or filters to find what you&apos;re looking for.
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                <XCircle className="h-4 w-4 mr-2" /> Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => {
            const enrolled = enrolledCourseIds.has(c.id)
            const isPaid = !!c.isPaid
            const hasAccess = isPaid ? !!accessMap[c.id]?.hasAccess : true
            const accessFee = c.courseFee ?? 0
            return (
              <Card key={c.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-28 alhikmah-gradient relative flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{c.code}</span>
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <Badge className="bg-gold text-black border-0">{c.level} Level</Badge>
                    {isPaid && (
                      <Badge variant="secondary" className="bg-white/90 text-amber-800 border-0">
                        <Lock className="h-2.5 w-2.5 mr-0.5" /> Paid
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">{c.creditUnit} CU</Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">{c.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.lecturer.name}</span>
                    <span>{c._count.enrollments} enrolled</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Certificate Fee</span>
                    <span className="font-semibold text-gold">₦{c.certificateFee.toLocaleString()}</span>
                  </div>
                  {isPaid && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Course Access
                      </span>
                      <span className="font-semibold text-amber-700">₦{accessFee.toLocaleString()} to access</span>
                    </div>
                  )}
                  {isPaid && c.accessDurationMonths && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Access Duration</span>
                      <span className="font-medium text-amber-700">
                        {c.accessDurationMonths} {c.accessDurationMonths === 1 ? 'month' : 'months'} access
                      </span>
                    </div>
                  )}
                  {enrolled && isPaid && hasAccess && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-0 self-start">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Access Active
                    </Badge>
                  )}
                  <div className="mt-1">
                    {!enrolled ? (
                      <Button onClick={() => enroll(c.id)} disabled={enrolling === c.id} variant="outline" className="w-full">
                        {enrolling === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Enroll Now
                      </Button>
                    ) : isPaid && !hasAccess ? (
                      <div className="space-y-1.5">
                        <Button onClick={() => payForAccess(c)} disabled={enrolling === c.id} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                          {enrolling === c.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                          Pay to Access
                        </Button>
                        <Button
                          onClick={() => toggleCart(c.id)}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                        >
                          {cartIds.includes(c.id) ? (
                            <><Trash2 className="h-3 w-3 mr-1" /> Remove from Cart</>
                          ) : (
                            <><ShoppingCart className="h-3 w-3 mr-1" /> Add to Cart</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => onNavigate('course-player', { courseId: c.id })} className="w-full bg-primary hover:bg-primary/90">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Continue Learning <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
