import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStaffUser } from '@/lib/auth'
import { visibleDocsWhere } from '@/lib/ai-docs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const doc = await db.aiDocument.findFirst({
    where: { id, AND: [await visibleDocsWhere(user)] },
    include: { course: { select: { id: true, code: true, title: true } }, owner: { select: { id: true, name: true } } },
  })
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  return NextResponse.json({ document: doc })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const doc = await db.aiDocument.findFirst({ where: { id, AND: [await visibleDocsWhere(user)] } })
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (user.role !== 'ADMIN' && doc.ownerId !== user.id) {
    return NextResponse.json({ error: 'Only the lecturer who uploaded this document can delete it' }, { status: 403 })
  }

  await db.aiDocument.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
