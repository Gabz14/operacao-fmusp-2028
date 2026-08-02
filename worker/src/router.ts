export interface Env {
  DB: D1Database
}

export type Ctx = { params: Record<string, string>; body: unknown }

export type Handler = (env: Env, req: Request, ctx: Ctx) => Promise<Response>

export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  pattern: RegExp
  handler: Handler
}

export const routes: Route[] = []

export function define(method: Route['method'], pattern: RegExp, handler: Handler) {
  routes.push({ method, pattern, handler })
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export const ok = (data: unknown) => json({ ok: true, ...(data as object) })

export function err(msg: string, status = 400) {
  return json({ error: msg }, status)
}

async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

export async function dispatch(env: Env, req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname

  for (const r of routes) {
    if (r.method !== req.method) continue
    const m = path.match(r.pattern)
    if (!m) continue
    const params: Record<string, string> = {}
    for (let i = 1; i < m.length; i++) params[String(i - 1)] = m[i] ?? ''
    const body = r.method === 'GET' ? {} : await readBody(req)
    try {
      return await r.handler(env, req, { params, body })
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'erro interno' }, 500)
    }
  }
  return err('rota não encontrada', 404)
}
