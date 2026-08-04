import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/auth/upload-signature
//
// Accepts a signature image (PNG with transparent background, OR a JPG/PNG of a
// signature on white paper — we will try to make near-white pixels transparent
// on the client before uploading, but accept whatever arrives here too).
//
// Stores the image as a base64 data URL in user.signatureUrl. This works on
// Vercel serverless (no filesystem writes) and survives across instances.
//
// Body: FormData with field "file" (image/png, image/jpeg, or image/webp).
// Max size: 2MB (signatures are small — please compress before uploading).
//
// Returns: { signatureUrl: string }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Only lecturers and admins need a signature on certificates/transcripts.
  if (user.role !== 'ADMIN' && user.role !== 'LECTURER') {
    return NextResponse.json({ error: 'Only lecturers and admins can upload a signature.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  // Validate MIME type — only accept images
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Please upload a PNG, JPEG, or WebP image of your signature.' },
      { status: 400 },
    )
  }

  // Max 2MB — signatures should be small. A scanned A4 page can be huge; please crop first.
  const MAX_SIZE = 2 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Image is too large. Maximum 2MB. Please crop to just the signature area before uploading.' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  // Normalize to PNG data URL — the client side is expected to have already
  // removed the background, so we trust whatever MIME the browser sent.
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
