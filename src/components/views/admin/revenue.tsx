'use client'

import { useApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { DollarSign, TrendingUp, CreditCard, Award } from 'lucide-react'

interface Analytics {
  totals: { revenue: number; certificates: number }
  revenueByMonth: { label: string; revenue: number; certs: number }[]
  courseDistribution: { code: string; title: string; students: number }[]
}

export function AdminRevenue() {
  const { data, loading } = useApi<Analytics>('/api/admin/analytics')

  if (loading || !data) return <div className="text-sm text-muted-foreground">Loading revenue…</div>

  const monthlyMax = Math.max(...data.revenueByMonth.map(d => d.revenue), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Revenue Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Track certificate fee payments via Paystack.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="h-9 w-9 rounded-lg bg-gold/20 flex items-center justify-center mb-2">
              <DollarSign className="h-4 w-4 text-gold" />
            </div>
            <p className="text-2xl font-bold">₦{data.totals.revenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{data.totals.certificates}</p>
            <p className="text-xs text-muted-foreground">Certificates Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">₦{data.totals.certificates ? Math.round(data.totals.revenue / data.totals.certificates).toLocaleString() : 0}</p>
            <p className="text-xs text-muted-foreground">Avg Revenue / Cert</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">Paystack</p>
            <p className="text-xs text-muted-foreground">Payment Provider</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue & Certificates (6 months)</CardTitle>
          <CardDescription>Monthly certificate fee collection and issuance count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v: any, name: any) => name === 'revenue' ? `₦${Number(v).toLocaleString()}` : v} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#006633" strokeWidth={2} name="Revenue (₦)" dot={{ fill: '#D4AF37', r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="certs" stroke="#D4AF37" strokeWidth={2} name="Certificates" dot={{ fill: '#006633', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.revenueByMonth.map((m, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-12 text-xs text-muted-foreground">{m.label}</div>
              <div className="flex-1 h-6 bg-secondary rounded relative overflow-hidden">
                <div className="h-full alhikmah-gradient" style={{ width: `${(m.revenue / monthlyMax) * 100}%` }} />
              </div>
              <div className="w-24 text-right text-xs font-medium">₦{m.revenue.toLocaleString()}</div>
              <Badge variant="secondary" className="text-[10px]">{m.certs} cert{m.certs !== 1 ? 's' : ''}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This is demo revenue data. To enable live Paystack payments, set the <code className="bg-secondary px-1 py-0.5 rounded text-[10px]">PAYSTACK_SECRET_KEY</code> environment variable and update the certificate fee per course as needed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
