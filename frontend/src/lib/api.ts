const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T = any>(path: string) => req<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    req<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T = any>(path: string, body?: unknown) =>
    req<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T = any>(path: string) => req<T>(path, { method: 'DELETE' }),
}
