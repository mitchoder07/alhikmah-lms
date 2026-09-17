import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // The dashboard shows "Loading dashboard" for as long as it has no data, so a failure
  // here has to come back as a message rather than an empty body.
  try {
    return NextResponse.json(await collect())
  } catch (e) {
    const { error, code } = describeDbError(e, 'The dashboard numbers could not be loaded. Please try again.')
    console.error('[analytics] error:', code ?? '', e)
    return NextResponse.json({ error, code }, { status: 500 })
  }
}

async function collect() {
  const [students, courses, enrollments, payments, certificates, lessons, attempts] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT' } }),
    db.course.count(),
    db.enrollment.count(),
    db.payment.findMany({ where: { status: 'success' } }),
    db.certificate.count(),
    db.lesson.count(),
    db.quizAttempt.findMany(),
  ])

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0)

  // Last 6 months revenue trend
  const months: { label: string; revenue: number; certs: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthPayments = payments.filter(p => p.paidAt && p.paidAt >= d && p.paidAt < end)
    const monthCerts = await db.certificate.count({ where: { issuedAt: { gte: d, lt: end } } })
    months.push({
      label: d.toLocaleDateString('en', { month: 'short' }),
      revenue: monthPayments.reduce((s, p) => s + p.amount, 0),
      certs: monthCerts,
    })
  }

  // Course enrollment distribution
  const courseDist = await db.course.findMany({
    include: { _count: { select: { enrollments: true } } },
    orderBy: { code: 'asc' },
  })

  // Average pass rate
  const passRate = attempts.length > 0 ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0

  return {
    totals: { students, courses, enrollments, certificates, lessons, revenue, passRate },
    revenueByMonth: months,
    courseDistribution: courseDist.map(c => ({ code: c.code, title: c.title, students: c._count.enrollments })),
  }
}
