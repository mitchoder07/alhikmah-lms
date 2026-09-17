import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStaffUser } from '@/lib/auth'
import { extractDocumentText, DocumentError, MAX_DOC_BYTES } from '@/lib/documents'
import { visibleDocsWhere } from '@/lib/ai-docs'
import { describeDbError } from '@/lib/db-errors'

export const runtime = 'nodejs'
export const maxDuration = 60

// Documents the staff AI digests before generating questions or marking essays.
// Text is extracted on upload (PDF / DOCX / TXT / MD) and stored on the row.

export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // This list is the first thing to touch the table, so report a missing table here
  // instead of leaving the Documents tab looking quietly empty.
  try {
    const docs = await db.aiDocument.findMany({
      where: await visibleDocsWhere(user),
      select: {
        id: true,
        title: true,
        filename: true,
        fileType: true,
        fileSize: true,
        charCount: true,
        courseId: true,
        createdAt: true,
        course: { select: { id: true, code: true, title: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documents: docs, maxBytes: MAX_DOC_BYTES })
  } catch (e) {
    const { error, code } = describeDbError(e, 'The documents could not be loaded. Please try again.')
    console.error('[ai/documents] list error:', code ?? '', e)
    return NextResponse.json({ error, code }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Upload failed. The file may be larger than the server limit.' }, { status: 413 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const courseId = (formData.get('courseId') as string | null)?.trim() || null
  const titleOverride = (formData.get('title') as string | null)?.trim() || null

  if (courseId) {
    const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, lecturerId: true } })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (user.role !== 'ADMIN' && course.lecturerId !== user.id) {
      return NextResponse.json({ error: 'You can only attach documents to your own courses' }, { status: 403 })
    }
  }

  if (file.size > MAX_DOC_BYTES) {
    return NextResponse.json({ error: `File is too large. Maximum size is ${Math.round(MAX_DOC_BYTES / 1024 / 1024)}MB.` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let extracted
  try {
    extracted = await extractDocumentText(file.name, buffer, file.type)
  } catch (e) {
    if (e instanceof DocumentError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[ai/documents] extraction error:', e)
    return NextResponse.json({ error: 'Could not read that file. Please try another format.' }, { status: 500 })
  }

  // Never let an unexpected failure reach the client as an empty body, which shows up
  // in the browser as a JSON parse error instead of a message the lecturer can act on.
  try {
    const doc = await db.aiDocument.create({
      data: {
        ownerId: user.id,
        courseId,
        title: titleOverride || file.name.replace(/\.[^.]+$/, ''),
        filename: file.name,
        fileType: extracted.type,
        fileSize: file.size,
        content: extracted.content,
        charCount: extracted.charCount,
      },
      select: {
        id: true,
        title: true,
        filename: true,
        fileType: true,
        fileSize: true,
        charCount: true,
        courseId: true,
        createdAt: true,
        course: { select: { id: true, code: true, title: true } },
        owner: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ document: doc, truncated: extracted.truncated })
  } catch (e) {
    const { error, code } = describeDbError(e, 'The file was read but could not be saved. Please try again.')
    console.error('[ai/documents] save error:', code ?? '', e)
    return NextResponse.json({ error, code }, { status: 500 })
  }
}
