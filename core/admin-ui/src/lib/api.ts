// Централизованный API-клиент для Admin UI
const GW = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100'

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
  revalidate = 30
): Promise<T | null> {
  try {
    const res = await fetch(`${GW}${path}`, {
      ...options,
      next: { revalidate },
    })
    if (!res.ok) {
      console.error(`[API] ${path} → ${res.status} ${res.statusText}`)
      return null
    }
    return res.json() as Promise<T>
  } catch (e) {
    console.error(`[API] ${path} failed:`, (e as Error).message)
    return null
  }
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${GW}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`${res.status}: ${err}`)
    }
    return res.json() as Promise<T>
  } catch (e) {
    console.error(`[API] POST ${path} failed:`, (e as Error).message)
    return null
  }
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${GW}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}
