import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'

// PATCH — update lecturer (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, department, password, role } = body

  const updateData: any = {}
  if (name) updateData.name = name
  if (email) updateData.email = String(email).toLowerCase()
  if (department) updateData.department = department
  if (role) updateData.role = role
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    updateData.password = hashPassword(password)
  }

  const updated = await db.user.update({ where: { id }, data: updateData })
  return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email } })
}

// DELETE — remove lecturer (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Don't allow admin to delete themselves
  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
