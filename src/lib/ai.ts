import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// Shared AI client for the staff (admin/lecturer) AI features: assessment
// generation, essay marking and the lecturer assistant chat.
//
// Configuration order:
//   1. AiSetting row (id = "default"), set by an admin in the portal
//   2. OPENAI_API_KEY / AI_API_KEY, AI_API_BASE_URL, AI_MODEL environment vars
// The endpoint is OpenAI-compatible, so Gemini, OpenAI, Together, OpenRouter etc.
// all work by changing apiBase + model.
// ─────────────────────────────────────────────────────────────────────────────

export interface AiConfig {
  apiBase: string
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
  /** where the active API key came from, shown in the settings UI */
  keySource: 'settings' | 'env' | 'none'
}

const DEFAULT_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai'
const DEFAULT_MODEL = 'gemini-3.8-flash'

export async function getAiConfig(): Promise<AiConfig> {
  const row = await db.aiSetting.findUnique({ where: { id: 'default' } }).catch(() => null)

  const envKey = (process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '').trim()
  const dbKey = (row?.apiKey || '').trim()
  const apiKey = dbKey || envKey

  return {
    apiBase: (row?.apiBase?.trim() || process.env.AI_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, ''),
    model: row?.model?.trim() || process.env.AI_MODEL || DEFAULT_MODEL,
    apiKey,
    temperature: typeof row?.temperature === 'number' ? row.temperature : 0.3,
    maxTokens: typeof row?.maxTokens === 'number' ? row.maxTokens : 3000,
    keySource: dbKey ? 'settings' : envKey ? 'env' : 'none',
  }
}

export function isAiConfigured(cfg: AiConfig) {
  return cfg.keySource !== 'none'
}

export class AiError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = 'AiError'
    this.status = status
  }
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  temperature?: number
  maxTokens?: number
  /** ask the provider for a JSON object reply (ignored by providers without support) */
  json?: boolean
  signal?: AbortSignal
}

/** Plain-text completion. Throws AiError with a message safe to show staff. */
export async function aiChat(messages: AiMessage[], opts: ChatOptions = {}): Promise<string> {
  const cfg = await getAiConfig()
  if (!isAiConfigured(cfg)) {
    throw new AiError(
      'No AI API key is configured. Ask an administrator to add one under AI Assistant → Settings (or set OPENAI_API_KEY on the server).',
      503
    )
  }

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: opts.temperature ?? cfg.temperature,
    max_tokens: opts.maxTokens ?? cfg.maxTokens,
  }
  if (opts.json) body.response_format = { type: 'json_object' }

  let res: Response
  try {
    res = await fetch(`${cfg.apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: opts.signal,
    })
  } catch (e: any) {
    console.error('[ai] request failed:', e?.message)
    throw new AiError('Could not reach the AI provider. Check the API base URL in AI settings.')
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    console.error(`[ai] provider returned ${res.status}:`, detail)
    if (res.status === 401 || res.status === 403) {
      throw new AiError('The AI provider rejected the API key. Update it under AI Assistant → Settings.', 503)
    }
    throw new AiError(`The AI provider returned an error (${res.status}). Please try again.`)
  }

  const data = await res.json().catch(() => null)
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiError('The AI provider returned an empty response. Please try again.')
  }
  return content
}

/**
 * Completion that must return JSON. Uses the provider's JSON mode when asked and
 * then parses defensively, because models occasionally wrap JSON in ```json fences or
 * add a preamble, and a failed mark should never lose a student's submission.
 */
export async function aiChatJson<T>(messages: AiMessage[], opts: ChatOptions = {}): Promise<T> {
  const raw = await aiChat(messages, { ...opts, json: true })
  const parsed = extractJson(raw)
  if (parsed === undefined) {
    console.error('[ai] could not parse JSON from model reply:', raw.slice(0, 400))
    throw new AiError('The AI returned a response that could not be read. Please try again.')
  }
  return parsed as T
}

export function extractJson(raw: string): unknown | undefined {
  const text = raw.trim()
  const attempts: string[] = [text]

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) attempts.push(fenced[1].trim())

  // First balanced object or array in the string
  const start = text.search(/[[{]/)
  if (start >= 0) attempts.push(sliceBalanced(text, start))

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate)
    } catch {
      /* try the next candidate */
    }
  }
  return undefined
}

function sliceBalanced(text: string, start: number): string {
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return text.slice(start)
}

/** Collapse whitespace so document text does not waste tokens. */
export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Build a source-text context block from documents, spreading a character budget
 * across them (head of each document first, then a slice from the middle so both
 * the introduction and the body of a long handout are represented).
 */
export function buildSourceContext(
  docs: Array<{ title: string; content: string }>,
  totalBudget = 24000
): string {
  if (!docs.length) return ''
  const perDoc = Math.max(1200, Math.floor(totalBudget / docs.length))

  return docs
    .map((d) => {
      const text = normalizeText(d.content || '')
      let excerpt = text
      if (text.length > perDoc) {
        const head = text.slice(0, Math.floor(perDoc * 0.7))
        const tailStart = Math.max(0, text.length - Math.floor(perDoc * 0.3))
        excerpt = `${head}\n…[middle of document omitted]…\n${text.slice(tailStart)}`
      }
      return `SOURCE DOCUMENT: ${d.title}\n"""\n${excerpt}\n"""`
    })
    .join('\n\n')
}
