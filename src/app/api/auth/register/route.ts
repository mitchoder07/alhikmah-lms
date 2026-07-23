import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, password, matricNumber, phone } = body
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 })
  }
  const exists = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

  // Matric number is OPTIONAL. Only Al-Hikmah students should provide it.
  // Format: YY/FFDEPTNNN where YY=year, FF=faculty code, DEPT=department letters, NNN=student number
  // Example: 20/03ECO002 (Year 2020, Faculty 03, Economics, student 002)
  let cleanMatric: string | null = null
  if (matricNumber && String(matricNumber).trim()) {
    cleanMatric = String(matricNumber).trim().toUpperCase()
    if (!/^\d{2}\/\d{2}[A-Z]{3}\d{3,5}$/.test(cleanMatric)) {
      return NextResponse.json({ error: 'Matric number must follow format 20/03ECO002 (year/faculty+department+number). Leave blank if you are not an Al-Hikmah student.' }, { status: 400 })
    }
    const dup = await db.user.findUnique({ where: { matricNumber: cleanMatric } })
    if (dup) return NextResponse.json({ error: 'Matric number already registered' }, { status: 400 })
  }

  const user = await db.user.create({
    data: {
      name,
      email: String(email).toLowerCase(),
      password: hashPassword(password),
      role: 'STUDENT',
      matricNumber: cleanMatric,
      phone,
      department: 'Economics',
    },
  })
  await createSession(user.id)
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      matricNumber: user.matricNumber,
      department: user.department,
    }
  })
}
