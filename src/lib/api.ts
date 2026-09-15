'use client'

import { useEffect, useState, useCallback } from 'react'

export function useApi<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    if (!url) {
      // Use a microtask to avoid setState-in-effect lint
      Promise.resolve().then(() => {
        if (!cancelled) {
          setData(null)
          setLoading(false)
        }
      })
      return
    }
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url, refetchKey, ...deps])

  return { data, loading, error, refetch }
}

export async function apiPost(url: string, body?: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!text) return { ok: true }
  try {
    const json = JSON.parse(text)
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    return json
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('HTTP')) throw e
    if (e instanceof Error && e.message.includes('Unexpected')) throw new Error(`Server error (${res.status}). Please try again.`)
    throw e
  }
}

export async function apiPatch(url: string, body?: any) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!text) return { ok: true }
  try {
    const json = JSON.parse(text)
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    return json
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('HTTP')) throw e
    if (e instanceof Error && e.message.includes('Unexpected')) throw new Error(`Server error (${res.status}). Please try again.`)
    throw e
  }
}

export async function apiDelete(url: string) {
  const res = await fetch(url, { method: 'DELETE' })
  const text = await res.text()
  if (!text) return { ok: true }
  try {
    const json = JSON.parse(text)
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    return json
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('HTTP')) throw e
    if (e instanceof Error && e.message.includes('Unexpected')) throw new Error(`Server error (${res.status}). Please try again.`)
    throw e
  }
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

/**
 * A route can die before it writes a body, which leaves the client holding an empty
 * response. Turn that into something a person can act on instead of a JSON parse error.
 */
export function readableHttpError(status: number, bodyText?: string): string {
  if (status === 413) return 'That file is too large for the server. Try a smaller one.'
  if (status === 429) return 'Too many requests. Give it a minute and try again.'
  if (status >= 500) {
    return 'The server hit a problem while handling that. Please try again, and check the server logs if it keeps happening.'
  }
  const snippet = (bodyText || '').replace(/\s+/g, ' ').trim().slice(0, 160)
  return snippet || `Request failed (HTTP ${status})`
}
