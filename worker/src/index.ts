import './routes-core'
import './routes-content'
import './routes-misc'
import { dispatch, json } from './router'
import type { Env } from './router'

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    const url = new URL(req.url)
    if (url.pathname === '/api/health') {
      return json({ status: 'operacao-ativa', nome: 'Operação FMUSP 2028' })
    }
    return dispatch(env, req)
  },
}
