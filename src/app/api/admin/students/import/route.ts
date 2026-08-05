import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

// Bulk import students from a list of { name, email, matric, phone }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only administrators can bulk import students' }, { status: 403 })
  }
  const body = await req.json()
  const { students } = body as { students: Array<{ name: string; email: string; matric?: string; phone?: string }> }
  if (!Array.isArray(students)) return NextResponse.json({ error: 'students array required' }, { status: 400 })

  let created = 0
  let skipped = 0
  for (const s of students) {
    if (!s.name || !s.email) { skipped++; continue }
    const exists = await db.user.findUnique({ where: { email: s.email.toLowerCase() } })
    if (exists) { skipped++; continue }
    await db.user.create({
      data: {
        name: s.name,
        email: s.email.toLowerCase(),
        password: hashPassword('student123'),
        role: 'STUDENT',
        matricNumber: s.matric?.toUpperCase() || null,
        phone: s.phone,
        department: 'Economics',
      }
    })
    created++
  }
  return NextResponse.json({ created, skipped })
}
