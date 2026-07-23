import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'

// GET — list all lecturers (admin only)
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const lecturers = await db.user.findMany({
    where: { role: 'LECTURER' },
    include: {
      coursesTaught: { select: { id: true, code: true, title: true } },
      announcements: { select: { id: true } },
      _count: { select: { coursesTaught: true, announcements: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ lecturers })
}

// POST — create a new lecturer (admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, department } = body
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password required' }, { status: 400 })
  }

  const exists = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

  const lecturer = await db.user.create({
    data: {
      name,
      email: String(email).toLowerCase(),
      password: hashPassword(password),
      role: 'LECTURER',
      department: department || 'Economics',
    }
  })

  return NextResponse.json({ lecturer: { id: lecturer.id, name: lecturer.name, email: lecturer.email } })
}
