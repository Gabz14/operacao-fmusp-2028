const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const usingDemo = !import.meta.env.VITE_API_URL

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${text.slice(0, 200)}`)
  }
  try {
    return (await res.json()) as T
  } catch {
    if (!usingDemo || (options?.method && options.method !== 'GET')) throw new Error('Falha ao ler resposta do servidor')
    try {
      const { DEMO_API } = await import('./demo')
      const demo = DEMO_API[path]
      if (demo === undefined) throw new Error('Falha ao ler resposta do servidor')
      return demo as T
    } catch {
      throw new Error('Falha ao ler resposta do servidor')
    }
  }
}

export const api = {
  get: <T = any>(path: string) => req<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    req<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T = any>(path: string, body?: unknown) =>
    req<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T = any>(path: string) => req<T>(path, { method: 'DELETE' }),
}
