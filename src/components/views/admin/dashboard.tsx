'use client'

import { useApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, BookOpen, Award, TrendingUp, DollarSign, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { useSession } from '@/components/app-provider'

interface Analytics {
  totals: { students: number; courses: number; enrollments: number; certificates: number; lessons: number; revenue: number; passRate: number }
  revenueByMonth: { label: string; revenue: number; certs: number }[]
  courseDistribution: { code: string; title: string; students: number }[]
}

const COLORS = [
  '#006633', // Al-Bashir green
  '#D4AF37', // Gold
  '#2E8B57', // Sea green
  '#8B4513', // Saddle brown
  '#4169E1', // Royal blue
  '#DC143C', // Crimson
  '#FF8C00', // Dark orange
  '#9370DB', // Medium purple
  '#20B2AA', // Light sea green
  '#B8860B', // Dark goldenrod
  '#CD5C5C', // Indian red
  '#1E90FF', // Dodger blue
]

export function AdminDashboard({ onNavigate }: { onNavigate: (v: string, p?: any) => void }) {
  const { user } = useSession()
  const { data, loading, error } = useApi<Analytics>('/api/admin/analytics')

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">The dashboard could not load</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Loading dashboard…</div>
  }

  const stats = [
    { label: 'Total Students', value: data.totals.students, icon: Users, accent: 'primary', delta: '+12%' },
    { label: 'Active Courses', value: data.totals.courses, icon: BookOpen, accent: 'gold', delta: '+2' },
    { label: 'Certificates', value: data.totals.certificates, icon: Award, accent: 'primary', delta: '+8%' },
    { label: 'Revenue (NGN)', value: `₦${data.totals.revenue.toLocaleString()}`, icon: DollarSign, accent: 'gold', delta: '+15%' },
  ]

  return (
    <div className="space-y-6">
      <div className="albashir-gradient rounded-xl p-6 text-white">
        <p className="text-sm text-white/80">Welcome,</p>
        <h2 className="text-2xl font-bold mb-1">{user?.name || 'Lecturer'}</h2>
        <p className="text-sm text-white/90">Department of Economics · Al-Bashir Academy · Real-time overview of your teaching portal.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.accent === 'primary' ? 'bg-primary/10' : 'bg-gold/20'}`}>
                  <s.icon className={`h-5 w-5 ${s.accent === 'primary' ? 'text-primary' : 'text-gold'}`} />
                </div>
                <Badge variant="secondary" className="text-green-600 bg-green-50"><ArrowUpRight className="h-3 w-3 mr-0.5" />{s.delta}</Badge>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend (6 months)</CardTitle>
            <CardDescription>Total certificate fee collected per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#006633" strokeWidth={2} dot={{ fill: '#D4AF37', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Course distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrollment by Course</CardTitle>
            <CardDescription>Students per course</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.courseDistribution}
                  dataKey="students"
                  nameKey="code"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.courseDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: 10, lineHeight: '20px' }}
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconSize={8}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pass rate & lessons */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiz Pass Rate</CardTitle>
            <CardDescription>Across all attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-bold text-primary">{data.totals.passRate}%</p>
              <p className="text-xs text-muted-foreground mb-1">of quiz attempts</p>
            </div>
            <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${data.totals.passRate}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.totals.passRate >= 70 ? 'Excellent performance!' : data.totals.passRate >= 50 ? 'Solid performance. Keep pushing.' : 'Needs improvement. Consider review materials.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common lecturer tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('courses')}>
              <BookOpen className="h-4 w-4 mr-2" /> Manage Courses <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('students')}>
              <Users className="h-4 w-4 mr-2" /> View Students <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('announcements')}>
              <TrendingUp className="h-4 w-4 mr-2" /> Post Announcement <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('certificates')}>
              <Award className="h-4 w-4 mr-2" /> Issue Certificate <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course Performance</CardTitle>
            <CardDescription>Enrollment counts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.courseDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="students" fill="#006633" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
