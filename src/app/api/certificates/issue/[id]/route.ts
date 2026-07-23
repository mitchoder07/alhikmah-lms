import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// DELETE — revoke/unissue a certificate (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only administrators can revoke certificates' }, { status: 403 })
  }

  const cert = await db.certificate.findUnique({ where: { id } })
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  // Delete the certificate — the student will need to repay to get a new one
  await db.certificate.delete({ where: { id } })

  // Also reset the enrollment so the student can re-qualify
  await db.enrollment.updateMany({
    where: { id: cert.enrollmentId },
    data: { lecturerApproved: false },
  })

  return NextResponse.json({ ok: true })
}
