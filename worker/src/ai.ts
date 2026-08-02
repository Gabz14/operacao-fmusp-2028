import type { Env } from './router'
import type { UserRow } from './db'

const MODEL = 'gemini-2.0-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 25000

const SYSTEM_PROMPT = `Você é a operadora central da "Operação FMUSP 2028", um sistema de estudos
de uma estudante brasileira (Gabi) rumo à aprovação em Medicina na FMUSP (ENEM 2028 e FUVEST 2028).
Estilo: direto, técnico e motivador, em português brasileiro, sem frases genéricas.
Use linguagem de "cidade/operação" (distritos, missões, mapa) só quando natural.
Responda com profundidade, clareza e passo a passo quando pedido.`

function settings(user: UserRow): Record<string, string> {
  try {
    return JSON.parse(user.settings_json || '{}')
  } catch {
    return {}
  }
}

async function getUserKey(env: Env): Promise<string> {
  const user = (await env.DB.prepare('SELECT settings_json FROM users ORDER BY id LIMIT 1').first()) as any
  return settings(user).gemini_key ?? ''
}

export async function aiAvailable(env: Env): Promise<boolean> {
  return Boolean(await getUserKey(env))
}

export async function setAiKey(env: Env, key: string): Promise<void> {
  const user = (await env.DB.prepare('SELECT settings_json FROM users ORDER BY id LIMIT 1').first()) as any
  const s = settings(user)
  s.gemini_key = key.trim()
  await env.DB.prepare('UPDATE users SET settings_json = ?').bind(JSON.stringify(s)).run()
}

export function noKeyMessage() {
  return {
    ok: false,
    message: 'O Assistente IA precisa de uma chave gratuita do Google AI Studio.\n\n'
      + '1. Acesse aistudio.google.com/apikey\n'
      + '2. Crie uma API key (camada gratuita)\n'
      + '3. Configure em Perfil → configurar IA (ou envie GEMINI_API_KEY no servidor).\n\n'
      + 'Sem a chave, todo o resto da operação continua funcionando.',
  }
}

async function callGemini(env: Env, prompt: string, temperature = 0.6, jsonMode = false): Promise<string> {
  const key = await getUserKey(env)
  if (!key) return ''
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 8192 },
  }
  if (jsonMode) {
    body.generationConfig = { ...(body.generationConfig as object), responseMimeType: 'application/json' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      throw new Error(`IA indisponível (${res.status}): ${detail}`)
    }
    const data = (await res.json()) as any
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    return parts.map((p: any) => p.text ?? '').join('').trim()
  } catch (e) {
    throw new Error(`Falha de conexão com a IA: ${e instanceof Error ? e.message : e}`)
  } finally {
    clearTimeout(timer)
  }
}

async function jsonResponse(env: Env, prompt: string): Promise<any> {
  const text = await callGemini(env, prompt, 0.4, true)
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\{.*\}/s)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        return { raw: text }
      }
    }
    return { raw: text }
  }
}

function hashText(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export async function chat(env: Env, message: string, context: string): Promise<string> {
  const prompt = `${SYSTEM_PROMPT}\n\nCONTEXTO DA OPERAÇÃO (dados atuais):\n${context.slice(0, 2000)}\n\nGABI PERGUNTOU: ${message}`
  return (await callGemini(env, prompt, 0.7)) || '...'
}

export async function explainTopic(env: Env, subject: string, topic: string): Promise<string> {
  const prompt = `${SYSTEM_PROMPT}\n\nExplique de forma clara e completa o conteúdo: ${topic} (matéria: ${subject}),\nno nível do ENEM e da FUVEST. Inclua:\n- ideia central em 1 frase\n- explicação detalhada com exemplos\n- o que mais cai em prova\n- 2 exercícios rápidos com resolução passo a passo`
  return (await callGemini(env, prompt)) || '...'
}

export async function solveStepByStep(env: Env, question: string): Promise<string> {
  const prompt = `${SYSTEM_PROMPT}\n\nResolva passo a passo a questão abaixo, explicando o raciocínio em cada etapa\ne indicando a resposta final. Se houver alternativas, mostre por que as erradas são erradas.\n\nQUESTÃO: ${question}`
  return (await callGemini(env, prompt)) || '...'
}

export async function generateExercises(env: Env, subject: string, topic: string, qty = 5): Promise<any> {
  const data = await jsonResponse(env, `${SYSTEM_PROMPT}\nGere ${qty} questões de múltipla escolha estilo ENEM/FUVEST sobre "${topic}" (matéria: ${subject}).\nRetorne APENAS JSON no formato:\n{"questions": [{"topic": "...", "text": "...", "options": ["A", "B", "C", "D", "E"], "answer": "A", "explanation": "..."}]}\nTodas as opções corretas e plausíveis; answer deve ser a letra correta.`)
  const qs = (data.questions ?? []).map((q: any) => ({ subject, ...q }))
  return { ok: true, questions: qs }
}

export async function generateFlashcards(env: Env, subject: string, topic: string, qty = 8): Promise<any[]> {
  const data = await jsonResponse(env, `${SYSTEM_PROMPT}\nCrie ${qty} flashcards de estudo de alta qualidade sobre "${topic}" (matéria: ${subject}).\nRegra: frente = pergunta/conceito curto; verso = resposta precisa e completa.\nRetorne APENAS JSON: {"cards": [{"front": "...", "back": "..."}]}`)
  return data.cards ?? []
}

export async function generateExam(env: Env, subject: string, qty = 10): Promise<any> {
  const data = await jsonResponse(env, `${SYSTEM_PROMPT}\nCrie um minisimulado estilo ENEM/FUVEST com ${qty} questões de "${subject}".\nRetorne APENAS JSON:\n{"name": "título", "questions": [{"topic": "...", "text": "...", "options": ["A","B","C","D","E"], "answer": "A"}]}`)
  const questions = (data.questions ?? []).map((q: any) => ({ ...q, subject, id: q.id ?? hashText(q.text) % 10_000_000 }))
  return { ok: true, name: data.name ?? `Simulado IA — ${subject}`, questions }
}

export async function buildReviewPlan(env: Env, wrongTopics: any[]): Promise<string> {
  const prompt = `${SYSTEM_PROMPT}\n\nMonte um plano de revisão de 7 dias para recuperar os assuntos abaixo (errados em simulado):\n${JSON.stringify(wrongTopics.slice(0, 15))}\nPara cada assunto: técnica de estudo sugerida, quantas questões por dia, quando revisar (dia X).\nFormato: lista simples e prática, direta.`
  return (await callGemini(env, prompt)) || '...'
}

export async function correctRedacao(env: Env, tema: string, texto: string): Promise<any> {
  const data = await jsonResponse(env, `${SYSTEM_PROMPT}\nVocê é corretor oficial da redação do ENEM. Corrija a redação abaixo sobre: "${tema}"\n\nREDAÇÃO:\n${texto.slice(0, 4500)}\n\nAvalie cada competência de 0 a 200 e retorne APENAS JSON:\n{"comp1": 0-200, "comp2": 0-200, "comp3": 0-200, "comp4": 0-200, "comp5": 0-200,\n "nota": soma, "feedback": "análise detalhada: pontos fortes, problemas por competência, o que fazer para subir a nota"}`)
  const comps = [data.comp1, data.comp2, data.comp3, data.comp4, data.comp5]
  if (comps.every((c) => typeof c === 'number')) {
    return { ok: true, comp1: data.comp1, comp2: data.comp2, comp3: data.comp3, comp4: data.comp4, comp5: data.comp5, nota: data.nota ?? comps.reduce((a, b) => a + b, 0), feedback: data.feedback ?? '' }
  }
  return { ok: false, message: 'A IA não conseguiu avaliar esta redação. Tente novamente.', nota: 0 }
}

export async function scanImage(env: Env, b64Image: string, intent = 'resumo'): Promise<any> {
  const key = await getUserKey(env)
  if (!key) return noKeyMessage()
  const prompt = `${SYSTEM_PROMPT}\nA imagem abaixo é uma foto de material de estudo (caderno, livro ou quadro).\nConverta o conteúdo em: ${intent === 'resumo' ? 'um resumo organizado por tópicos' : '10 flashcards de estudo'}.\nResponda em português, mantendo fidelidade ao conteúdo da imagem.`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: b64Image } }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) return { ok: false, message: `IA indisponível (${res.status})` }
    const data = (await res.json()) as any
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const text = parts.map((p: any) => p.text ?? '').join('').trim()
    return { ok: true, text }
  } catch (e) {
    return { ok: false, message: `Falha: ${e instanceof Error ? e.message : e}` }
  } finally {
    clearTimeout(timer)
  }
}
