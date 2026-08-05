import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/auth/upload-signature
//
// Accepts a signature image (the frontend removes the white background before
// uploading, so we receive a PNG with alpha). Stores as a base64 data URL in
// user.signatureUrl. Works on Vercel serverless (no filesystem writes).
//
// Body: FormData with field "file" (image/png, image/jpeg, or image/webp).
// Max size: 2MB (signatures should be small — please crop before uploading).
//
// Returns: { signatureUrl: string }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Only lecturers and admins need a signature on the transcript.
  if (user.role !== 'ADMIN' && user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Only lecturers and admins can upload a signature.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  // Validate MIME type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Please upload a PNG, JPEG, or WebP image of your signature.' },
      { status: 400 },
    )
  }

  // Max 2MB
  const MAX_SIZE = 2 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Image is too large. Maximum 2MB. Please crop to just the signature area before uploading.' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${file.type};base64,${base64}`

  await db.user.update({
    where: { id: user.id },
    data: { signatureUrl: dataUrl },
  })

  return NextResponse.json({ signatureUrl: dataUrl })
}

// DELETE /api/auth/upload-signature
// Removes the signature (sets signatureUrl to null).
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Only lecturers and admins can manage a signature.' }, { status: 403 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { signatureUrl: null },
  })

  return NextResponse.json({ ok: true })
}
