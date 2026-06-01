'use client'
import PptxGenJS from 'pptxgenjs'

// Cores do app
const VERDE  = '069E6E'
const AZUL   = '2D2E47'
const TEAL   = '3E7996'
const CYAN   = '00BAB4'
const CINZA  = '475569'
const CINZA_CLARO = 'F1F5F9'
const BORDA  = 'E2E8F0'

const STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando contato',
  agendado:   'Agendado',
  avaliado:   'Avaliacao realizada',
  tratamento: 'Em tratamento',
  finalizado: 'Finalizado',
}

type Indicacao = {
  id:string; paciente_nome:string; paciente_telefone:string;
  observacoes:string|null; status:string; data_indicacao:string;
  pdf_url:string|null; valor_repasse:number|null;
  parceiros:{nome:string;especialidade:string}|null
}
type Parceiro = { id:string; nome:string; especialidade:string }

interface ReportOptions {
  indicacoes: Indicacao[]
  parceiros: Parceiro[]
  unidadeNome: string
  dataIni: string
  dataFim: string
  parceiroFiltro: string
}

function fmtDate(d: string) {
  return new Date(d+'T12:00:00').toLocaleDateString('pt-BR')
}

// Fetch logo as base64 for embedding
async function getLogoBase64(): Promise<string|null> {
  try {
    const res = await fetch('/logo-mdc.png')
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(',')[1])
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function gerarRelatorio(opts: ReportOptions) {
  const { indicacoes, parceiros, unidadeNome, dataIni, dataFim, parceiroFiltro } = opts

  let inds = indicacoes.filter(i => {
    const d = i.data_indicacao.split('T')[0]
    return d >= dataIni && d <= dataFim
  })
  if (parceiroFiltro) inds = inds.filter(i => i.parceiros?.nome === parceiroFiltro)

  const logoBase64 = await getLogoBase64()
  const periodo = `${fmtDate(dataIni)} a ${fmtDate(dataFim)}`

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Meu Dentista em Casa'

  // ── SLIDE 1: CAPA ──────────────────────────────────────
  const s1 = pptx.addSlide()
  s1.background = { color: 'FFFFFF' }

  // Barra superior verde
  s1.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:1.4, fill:{ color:VERDE }, line:{ color:VERDE, width:0 } })

  // Logo na barra superior
  if (logoBase64) {
    s1.addImage({ data: `image/png;base64,${logoBase64}`, x:0.4, y:0.15, w:1.0, h:1.0 })
  } else {
    s1.addText('MDC', { x:0.4, y:0.2, w:1.0, h:1.0, fontSize:22, bold:true, color:'FFFFFF', align:'center', valign:'middle' })
  }

  s1.addText('Meu Dentista em Casa', { x:1.6, y:0.2, w:10, h:0.5, fontSize:13, color:'FFFFFF', bold:false })
  s1.addText('Relatorio de Indicacoes', { x:1.6, y:0.65, w:10, h:0.55, fontSize:22, bold:true, color:'FFFFFF' })

  // Conteúdo central
  s1.addText(unidadeNome, { x:0.6, y:1.8, w:12, h:0.7, fontSize:32, bold:true, color:AZUL, align:'center' })
  s1.addShape(pptx.ShapeType.rect, { x:4, y:2.6, w:5.33, h:0.04, fill:{ color:VERDE }, line:{ color:VERDE, width:0 } })
  s1.addText(`Periodo: ${periodo}`, { x:0.6, y:2.8, w:12, h:0.45, fontSize:16, color:CINZA, align:'center' })
  if (parceiroFiltro) s1.addText(`Parceiro: ${parceiroFiltro}`, { x:0.6, y:3.3, w:12, h:0.4, fontSize:14, color:TEAL, align:'center', italic:true })

  s1.addText(`Total de indicacoes no periodo: ${inds.length}`, { x:0.6, y:4.5, w:12, h:0.4, fontSize:14, bold:true, color:VERDE, align:'center' })
  s1.addText(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, { x:0.6, y:5.0, w:12, h:0.35, fontSize:11, color:'94A3B8', align:'center' })

  // Barra inferior
  s1.addShape(pptx.ShapeType.rect, { x:0, y:7.1, w:13.33, h:0.4, fill:{ color:CINZA_CLARO }, line:{ color:BORDA, width:0 } })

  // ── SLIDE 2: RESUMO EXECUTIVO ──────────────────────────
  const s2 = pptx.addSlide()
  s2.background = { color: 'FFFFFF' }

  // Header
  s2.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.85, fill:{ color:AZUL }, line:{ color:AZUL, width:0 } })
  s2.addText('Resumo Executivo', { x:0.4, y:0.1, w:10, h:0.65, fontSize:24, bold:true, color:'FFFFFF' })
  s2.addText(periodo, { x:10, y:0.22, w:3, h:0.4, fontSize:11, color:CYAN, align:'right' })

  const totalInds = inds.length
  const avaliados = inds.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length
  const tratamento = inds.filter(i=>i.status==='tratamento').length
  const finalizados = inds.filter(i=>i.status==='finalizado').length
  const consultoria = inds.filter(i=>!i.valor_repasse).length
  const avaliacao  = inds.filter(i=>!!i.valor_repasse).length
  const taxa = totalInds ? Math.round(avaliados/totalInds*100) : 0

  const kpis = [
    { label:'Total de Indicacoes', value:String(totalInds),    color:AZUL  },
    { label:'Avaliacoes Realizadas', value:String(avaliados),  color:VERDE },
    { label:'Em Tratamento',         value:String(tratamento), color:TEAL  },
    { label:'Finalizados',           value:String(finalizados),color:CYAN  },
    { label:'Taxa de Conversao',     value:`${taxa}%`,         color:VERDE },
    { label:'Parceiros Envolvidos',  value:String(new Set(inds.map(i=>i.parceiros?.nome).filter(Boolean)).size), color:TEAL },
  ]

  kpis.forEach((k,i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.35 + col * 4.2
    const y = 1.05 + row * 1.65
    s2.addShape(pptx.ShapeType.rect, { x, y, w:3.9, h:1.4, fill:{ color:'F8FAFC' }, line:{ color:BORDA, width:1 } })
    s2.addShape(pptx.ShapeType.rect, { x, y, w:0.08, h:1.4, fill:{ color:k.color }, line:{ color:k.color, width:0 } })
    s2.addText(k.value, { x:x+0.18, y:y+0.15, w:3.5, h:0.75, fontSize:34, bold:true, color:k.color })
    s2.addText(k.label, { x:x+0.18, y:y+0.9, w:3.5, h:0.4, fontSize:11, color:CINZA })
  })

  // Tipos
  s2.addShape(pptx.ShapeType.rect, { x:0.35, y:4.45, w:5.9, h:0.85, fill:{ color:'F0FDF4' }, line:{ color:VERDE, width:1 } })
  s2.addText(`Consultoria em Domicilio: ${consultoria}`, { x:0.55, y:4.6, w:5.5, h:0.5, fontSize:13, color:AZUL, bold:true })
  s2.addShape(pptx.ShapeType.rect, { x:6.7, y:4.45, w:5.9, h:0.85, fill:{ color:'EFF6FF' }, line:{ color:TEAL, width:1 } })
  s2.addText(`Avaliacao em Parceria: ${avaliacao}`, { x:6.9, y:4.6, w:5.5, h:0.5, fontSize:13, color:AZUL, bold:true })

  // ── SLIDE 3: STATUS ────────────────────────────────────
  const s3 = pptx.addSlide()
  s3.background = { color: 'FFFFFF' }
  s3.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.85, fill:{ color:VERDE }, line:{ color:VERDE, width:0 } })
  s3.addText('Status das Indicacoes', { x:0.4, y:0.1, w:10, h:0.65, fontSize:24, bold:true, color:'FFFFFF' })
  s3.addText(periodo, { x:10, y:0.22, w:3, h:0.4, fontSize:11, color:'FFFFFF', align:'right' })

  const statusOrder = ['aguardando','agendado','avaliado','tratamento','finalizado']
  const statusColors = ['F59E0B', '1E40AF', VERDE, TEAL, '7C3AED']

  statusOrder.forEach((st, i) => {
    const count = inds.filter(ind=>ind.status===st).length
    const pct = totalInds ? Math.round(count/totalInds*100) : 0
    const y = 1.15 + i * 1.05
    s3.addShape(pptx.ShapeType.rect, { x:0.35, y, w:12.6, h:0.85, fill:{ color:i%2===0?'F8FAFC':'FFFFFF' }, line:{ color:BORDA, width:1 } })
    s3.addText(STATUS_LABELS[st], { x:0.55, y:y+0.18, w:3.5, h:0.5, fontSize:13, color:AZUL, bold:false })
    s3.addText(String(count), { x:4.2, y:y+0.1, w:0.8, h:0.65, fontSize:20, bold:true, color:statusColors[i], align:'center' })
    s3.addShape(pptx.ShapeType.rect, { x:5.2, y:y+0.28, w:6.5, h:0.28, fill:{ color:CINZA_CLARO }, line:{ color:BORDA, width:0 } })
    if (pct > 0) s3.addShape(pptx.ShapeType.rect, { x:5.2, y:y+0.28, w:Math.max(0.05,6.5*pct/100), h:0.28, fill:{ color:statusColors[i] }, line:{ color:statusColors[i], width:0 } })
    s3.addText(`${pct}%`, { x:11.85, y:y+0.18, w:0.9, h:0.5, fontSize:12, color:CINZA, align:'right' })
  })

  // ── SLIDES 4+: LISTA ──────────────────────────────────
  const pageSize = 12
  const totalPages = Math.ceil(inds.length / pageSize) || 1

  for (let page = 0; page < totalPages; page++) {
    const sl = pptx.addSlide()
    sl.background = { color: 'FFFFFF' }
    sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.85, fill:{ color:TEAL }, line:{ color:TEAL, width:0 } })
    sl.addText(`Lista de Indicacoes${totalPages>1?` (${page+1}/${totalPages})`:''}`, { x:0.4, y:0.1, w:9, h:0.65, fontSize:24, bold:true, color:'FFFFFF' })
    sl.addText(periodo, { x:9.5, y:0.22, w:3.5, h:0.4, fontSize:11, color:'FFFFFF', align:'right' })

    // Header tabela
    sl.addShape(pptx.ShapeType.rect, { x:0.3, y:0.95, w:12.7, h:0.38, fill:{ color:AZUL }, line:{ color:AZUL, width:0 } })
    const headers = ['Paciente','Data','Parceiro','Tipo','Status']
    const colX    = [0.35, 3.5, 5.2, 7.9, 9.8]
    const colW    = [3.1, 1.6, 2.6, 1.8, 2.8]
    headers.forEach((h,i) => sl.addText(h, { x:colX[i], y:0.97, w:colW[i], h:0.32, fontSize:10, bold:true, color:'FFFFFF' }))

    const pageInds = inds.slice(page*pageSize, (page+1)*pageSize)
    pageInds.forEach((ind, ri) => {
      const y = 1.38 + ri * 0.3
      sl.addShape(pptx.ShapeType.rect, { x:0.3, y, w:12.7, h:0.28, fill:{ color:ri%2===0?'F8FAFC':'FFFFFF' }, line:{ color:BORDA, width:0 } })
      const d = new Date(ind.data_indicacao).toLocaleDateString('pt-BR')
      const tipo = ind.valor_repasse ? 'Avaliacao' : 'Consultoria'
      const vals = [ind.paciente_nome, d, ind.parceiros?.nome||'—', tipo, STATUS_LABELS[ind.status]||ind.status]
      vals.forEach((v,i) => sl.addText(v, { x:colX[i], y:y+0.03, w:colW[i], h:0.22, fontSize:9.5, color:'334155', shrinkText:true }))
    })

    sl.addText(`Meu Dentista em Casa · ${unidadeNome}`, { x:0.3, y:7.0, w:12.7, h:0.3, fontSize:9, color:'94A3B8', align:'center' })
  }

  // ── SLIDE FINAL: AGRADECIMENTO ─────────────────────────
  const sFinal = pptx.addSlide()
  sFinal.background = { color: 'FFFFFF' }

  // Barra topo
  sFinal.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:1.4, fill:{ color:VERDE }, line:{ color:VERDE, width:0 } })
  sFinal.addText('Meu Dentista em Casa', { x:0.5, y:0.2, w:12, h:0.4, fontSize:13, color:'FFFFFF' })
  sFinal.addText(unidadeNome, { x:0.5, y:0.6, w:12, h:0.6, fontSize:22, bold:true, color:'FFFFFF' })

  // Logo centralizada
  if (logoBase64) {
    sFinal.addImage({ data: `image/png;base64,${logoBase64}`, x:5.17, y:1.7, w:3, h:1.5 })
  }

  sFinal.addText('Obrigado pela parceria!', { x:0.5, y:3.4, w:12, h:1.0, fontSize:40, bold:true, color:AZUL, align:'center' })
  sFinal.addShape(pptx.ShapeType.rect, { x:3.5, y:4.5, w:6.33, h:0.05, fill:{ color:VERDE }, line:{ color:VERDE, width:0 } })
  sFinal.addText('Juntos levamos o cuidado odontologico a todos os lugares.', { x:0.5, y:4.7, w:12, h:0.6, fontSize:16, color:CINZA, align:'center', italic:true })
  sFinal.addText(periodo, { x:0.5, y:5.5, w:12, h:0.4, fontSize:13, color:'94A3B8', align:'center' })

  // Barra rodapé
  sFinal.addShape(pptx.ShapeType.rect, { x:0, y:7.1, w:13.33, h:0.4, fill:{ color:CINZA_CLARO }, line:{ color:BORDA, width:0 } })
  sFinal.addText('prev-mdc-app.vercel.app', { x:0, y:7.13, w:13.33, h:0.3, fontSize:9, color:'94A3B8', align:'center' })

  const nomeParceiro = parceiroFiltro ? `_${parceiroFiltro.split(' ')[0]}` : ''
  await pptx.writeFile({ fileName: `MDC_Relatorio_${dataIni}_${dataFim}${nomeParceiro}.pptx` })
}
