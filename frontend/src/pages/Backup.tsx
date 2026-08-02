import { useState } from 'react'
import { Download, Upload, FileDown, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { useApp } from '../store'
import { Glass } from '../components/ui'

export default function Backup() {
  const toast = useApp((s) => s.toast)
  const [restoring, setRestoring] = useState(false)

  const exportJson = async () => {
    const data = await api.get('/api/backup/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operacao-fmusp-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Backup exportado', kind: 'gold' })
  }

  const importJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    const text = await file.text()
    const r = await api.post<{ ok: boolean; message?: string }>('/api/backup/import', { data: text })
    setRestoring(false)
    if (r.ok) toast({ title: 'Backup restaurado', body: 'Seus dados voltaram. A cidade está exatamente como você deixou.', kind: 'gold' })
    else toast({ title: 'Falha na restauração', body: r.message ?? '', kind: 'alert' })
  }

  const exportPdf = async () => {
    const data = await api.get('/api/backup/relatorio')
    const html = `
      <html><head><meta charset="utf-8"><style>
        body{font-family:sans-serif;padding:32px;color:#111}
        h1{color:#b8860b} table{width:100%;border-collapse:collapse}
        td,th{border:1px solid #ddd;padding:6px 10px;font-size:13px;text-align:left}
        .gold{color:#b8860b;font-weight:bold}
      </style></head><body>
      <h1>Operação FMUSP 2028 — Relatório</h1>
      <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      ${data.html}
      </body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-operacao-fmusp.html`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Relatório gerado', body: 'Abra o arquivo no navegador e use "Imprimir → salvar como PDF".', kind: 'info' })
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Backup da <span className="gold-text">Operação</span></h1>
        <p className="text-mist text-sm mt-1">Seus 3 anos de jornada merecem redundância.</p>
      </header>

      <Glass strong className="p-4 space-y-3">
        <button onClick={exportJson} className="w-full rounded-xl bg-gold/15 border border-gold/40 text-gold font-bold py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-gold/20">
          <Download className="w-4 h-4" /> Exportar backup (JSON)
        </button>
        <button onClick={exportPdf} className="w-full rounded-xl bg-white/5 border border-white/15 text-white/90 font-bold py-3.5 text-sm flex items-center justify-center gap-2 hover:border-white/30">
          <FileDown className="w-4 h-4" /> Relatório para PDF
        </button>
        <label className="w-full rounded-xl bg-white/5 border border-dashed border-white/20 text-mist font-bold py-3.5 text-sm flex items-center justify-center gap-2 cursor-pointer hover:border-gold/40 hover:text-white">
          <Upload className="w-4 h-4" /> {restoring ? 'Restaurando…' : 'Restaurar backup'}
          <input type="file" accept="application/json" className="hidden" onChange={importJson} />
        </label>
      </Glass>

      <Glass className="p-4 text-xs text-mist leading-relaxed space-y-2">
        <div className="flex items-center gap-2 text-gold-soft font-bold"><CheckCircle2 className="w-4 h-4" /> Dicas de segurança</div>
        <p>• Exporte semanalmente e guarde em dois lugares (nuvem + pendrive).</p>
        <p>• O app roda 100% offline — o backup é o único fio que conecta seus dispositivos.</p>
        <p>• No Google Drive: basta fazer o upload do arquivo JSON exportado.</p>
      </Glass>
    </div>
  )
}
