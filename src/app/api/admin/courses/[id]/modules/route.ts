import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const { title, description, position } = body
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const newModule = await db.module.create({ data: { courseId: id, title, description: description || '', position: Number(position) || 0 } })
  return NextResponse.json({ module: newModule })
}
