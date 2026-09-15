import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getAiConfig } from '@/lib/ai'

// AI provider configuration for the staff AI (question generation, essay
// marking, lecturer assistant). Only ADMIN can read or change it.
// The stored key is never returned in full — only its last 4 characters.

function maskKey(key: string) {
  if (!key) return ''
  return key.length <= 4 ? '••••' : `${'•'.repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const cfg = await getAiConfig()
  return NextResponse.json({
    settings: {
      apiBase: cfg.apiBase,
      model: cfg.model,
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
      apiKeyMasked: maskKey(cfg.apiKey),
      hasKey: cfg.keySource !== 'none',
      keySource: cfg.keySource,
    },
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { apiBase, model, apiKey, temperature, maxTokens } = body as {
    apiBase?: string
    model?: string
    apiKey?: string
    temperature?: number
    maxTokens?: number
  }

  const existing = await db.aiSetting.findUnique({ where: { id: 'default' } })

  // An empty apiKey field means "keep what is stored" — clearing it is explicit
  // via apiKey: null.
  const nextKey =
    apiKey === undefined
      ? (existing?.apiKey ?? '')
      : apiKey === null
        ? ''
        : String(apiKey).trim()

  const data = {
    apiBase: (apiBase ?? existing?.apiBase ?? 'https://api.openai.com/v1').toString().trim().replace(/\/+$/, ''),
    model: (model ?? existing?.model ?? 'gpt-4o-mini').toString().trim(),
    apiKey: nextKey,
    temperature: temperature === undefined ? (existing?.temperature ?? 0.3) : Number(temperature),
    maxTokens: maxTokens === undefined ? (existing?.maxTokens ?? 3000) : Number(maxTokens),
    updatedById: user.id,
  }

  if (Number.isNaN(data.temperature) || data.temperature < 0 || data.temperature > 2) {
    return NextResponse.json({ error: 'Temperature must be between 0 and 2' }, { status: 400 })
  }
  if (Number.isNaN(data.maxTokens) || data.maxTokens < 200 || data.maxTokens > 32000) {
    return NextResponse.json({ error: 'Max tokens must be between 200 and 32000' }, { status: 400 })
  }
  if (!data.model) return NextResponse.json({ error: 'Model is required' }, { status: 400 })

  const saved = await db.aiSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  })

  const cfg = await getAiConfig()
  return NextResponse.json({
    settings: {
      apiBase: saved.apiBase,
      model: saved.model,
      temperature: saved.temperature,
      maxTokens: saved.maxTokens,
      apiKeyMasked: maskKey(saved.apiKey),
      hasKey: cfg.keySource !== 'none',
      keySource: cfg.keySource,
    },
  })
}
