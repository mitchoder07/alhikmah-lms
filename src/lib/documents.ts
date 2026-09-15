// ─────────────────────────────────────────────────────────────────────────────
// Server-side text extraction for documents a lecturer/admin uploads to the AI.
// PDF and DOCX are parsed here; plain text and markdown are read as UTF-8.
// Only the extracted text is persisted (AiDocument.content) — this repo has no
// object storage service, and text is all the model needs.
// ─────────────────────────────────────────────────────────────────────────────

export type SupportedDocType = 'pdf' | 'docx' | 'txt' | 'md'

export const SUPPORTED_EXTENSIONS: SupportedDocType[] = ['pdf', 'docx', 'txt', 'md']

/** Largest upload we accept (bytes). */
export const MAX_DOC_BYTES = 15 * 1024 * 1024
/** Most characters of extracted text we keep per document. */
export const MAX_DOC_CHARS = 200_000

export class DocumentError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'DocumentError'
    this.status = status
  }
}

export function detectDocType(filename: string, mimeType?: string): SupportedDocType {
  const ext = filename.toLowerCase().split('.').pop() || ''
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (ext === 'md' || ext === 'markdown' || mimeType === 'text/markdown') return 'md'
  if (ext === 'txt' || mimeType === 'text/plain') return 'txt'
  throw new DocumentError(
    'Unsupported file type. Upload a PDF (.pdf), Word document (.docx) or plain text (.txt / .md).'
  )
}

export interface ExtractedDocument {
  type: SupportedDocType
  /** extracted plain text, truncated to MAX_DOC_CHARS */
  content: string
  /** characters of text found in the file before truncation */
  charCount: number
  truncated: boolean
}

export async function extractDocumentText(
  filename: string,
  buffer: Buffer,
  mimeType?: string
): Promise<ExtractedDocument> {
  if (buffer.length > MAX_DOC_BYTES) {
    throw new DocumentError(`File is too large (${Math.round(buffer.length / 1024 / 1024)}MB). Maximum is 15MB.`)
  }
  if (!buffer.length) throw new DocumentError('The uploaded file is empty.')

  const type = detectDocType(filename, mimeType)
  let raw: string

  try {
    if (type === 'pdf') raw = await extractPdf(buffer)
    else if (type === 'docx') raw = await extractDocx(buffer)
    else raw = buffer.toString('utf8')
  } catch (e: any) {
    if (e instanceof DocumentError) throw e
    console.error(`[documents] failed to parse ${filename}:`, e?.message)
    throw new DocumentError(`Could not read text from "${filename}". If it is a scanned PDF, upload a text-based PDF or paste the text instead.`)
  }

  // Strip null bytes / control characters that break JSON payloads and prompts
  const cleaned = raw.replace(/\u0000/g, '').replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim()
  if (!cleaned) {
    throw new DocumentError(`No readable text found in "${filename}". Scanned/image-only PDFs cannot be read — upload a text-based PDF or paste the text.`)
  }

  return {
    type,
    content: cleaned.length > MAX_DOC_CHARS ? cleaned.slice(0, MAX_DOC_CHARS) : cleaned,
    charCount: cleaned.length,
    truncated: cleaned.length > MAX_DOC_CHARS,
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // unpdf runs pdf.js without a worker thread, which is what a Next.js serverless
  // function needs. Imported lazily so the pdf.js bundle is only loaded by the
  // routes that actually parse documents.
  const { extractText } = await import('unpdf')
  const result = await extractText(new Uint8Array(buffer), { mergePages: true })
  const text = result?.text
  return Array.isArray(text) ? text.join('\n') : (text ?? '')
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result?.value ?? ''
}
