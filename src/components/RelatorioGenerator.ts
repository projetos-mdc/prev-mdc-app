'use client'
import PptxGenJS from 'pptxgenjs'

const G='#069E6E', N='#2D2E47', S='#3E7996', C='#00BAB4'

const STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando contato',
  agendado:   'Agendado',
  avaliado:   'Avaliação realizada',
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

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return { r, g, b }
}

export async function gerarRelatorio(opts: ReportOptions) {
  const { indicacoes, parceiros, unidadeNome, dataIni, dataFim, parceiroFiltro } = opts

  // Filtra
  let inds = indicacoes.filter(i => {
    const d = i.data_indicacao.split('T')[0]
    return d >= dataIni && d <= dataFim
  })
  if (parceiroFiltro) inds = inds.filter(i => i.parceiros?.nome === parceiroFiltro)

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Meu Dentista em Casa'
  pptx.subject = 'Relatório de Indicações'

  const fmtDate = (d: string) => new Date(d+'T12:00:00').toLocaleDateString('pt-BR')
  const periodo = `${fmtDate(dataIni)} a ${fmtDate(dataFim)}`

  // ── SLIDE 1: CAPA ──────────────────────────────────────
  const s1 = pptx.addSlide()
  s1.background = { color: N.replace('#','') }

  // Logo placeholder (colored rect)
  s1.addShape(pptx.ShapeType.rect, { x:0.5, y:0.4, w:1.2, h:1.2, fill:{ color: G.replace('#','') }, line:{ color: G.replace('#',''), width:0 } })
  s1.addText('MDC', { x:0.5, y:0.4, w:1.2, h:1.2, fontSize:28, bold:true, color:'FFFFFF', align:'center', valign:'middle' })

  s1.addText('Meu Dentista em Casa', { x:2, y:0.45, w:8, h:0.5, fontSize:16, color:'B0E8E6', bold:false })
  s1.addText('Relatório de Indicações', { x:2, y:0.95, w:8, h:0.8, fontSize:36, color:'FFFFFF', bold:true })
  s1.addText(unidadeNome, { x:2, y:1.75, w:8, h:0.45, fontSize:18, color:C.replace('#',''), bold:true })
  s1.addText(`Período: ${periodo}`, { x:2, y:2.3, w:6, h:0.4, fontSize:14, color:'94A3B8' })
  if (parceiroFiltro) s1.addText(`Parceiro: ${parceiroFiltro}`, { x:2, y:2.7, w:6, h:0.4, fontSize:14, color:'94A3B8' })

  // linha decorativa
  s1.addShape(pptx.ShapeType.rect, { x:2, y:3.3, w:8.5, h:0.04, fill:{ color: G.replace('#','') }, line:{ color: G.replace('#',''), width:0 } })

  s1.addText(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, { x:2, y:4.2, w:4, h:0.35, fontSize:11, color:'475569' })
  s1.addText(`Total de indicações no período: ${inds.length}`, { x:6, y:4.2, w:4.5, h:0.35, fontSize:11, color:'B0E8E6', align:'right' })

  // ── SLIDE 2: RESUMO EXECUTIVO ──────────────────────────
  const s2 = pptx.addSlide()
  s2.background = { color: 'F8FAFC' }

  s2.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.9, fill:{ color: N.replace('#','') }, line:{ color: N.replace('#',''), width:0 } })
  s2.addText('Resumo Executivo', { x:0.4, y:0.1, w:12, h:0.7, fontSize:26, bold:true, color:'FFFFFF' })

  const totalInds = inds.length
  const avaliados = inds.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length
  const tratamento = inds.filter(i=>i.status==='tratamento').length
  const finalizados = inds.filter(i=>i.status==='finalizado').length
  const consultoria = inds.filter(i=>!i.valor_repasse).length
  const avaliacao  = inds.filter(i=>!!i.valor_repasse).length
  const taxa = totalInds ? Math.round(avaliados/totalInds*100) : 0

  const kpis = [
    { label:'Total de Indicações', value:String(totalInds), color:N },
    { label:'Avaliações Realizadas', value:String(avaliados), color:G },
    { label:'Em Tratamento', value:String(tratamento), color:S },
    { label:'Finalizados', value:String(finalizados), color:C },
    { label:'Taxa de Conversão', value:`${taxa}%`, color:G },
    { label:'Parceiros Envolvidos', value:String(new Set(inds.map(i=>i.parceiros?.nome).filter(Boolean)).size), color:N },
  ]

  kpis.forEach((k,i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.4 + col * 4.2
    const y = 1.1 + row * 1.7
    s2.addShape(pptx.ShapeType.rect, { x, y, w:3.9, h:1.4, fill:{ color:'FFFFFF' }, line:{ color:'E2E8F0', width:1 }, shadow:{ type:'outer', blur:4, offset:2, angle:90, color:'E2E8F0', opacity:0.5 } })
    s2.addText(k.value, { x, y:y+0.1, w:3.9, h:0.75, fontSize:38, bold:true, color:k.color.replace('#',''), align:'center' })
    s2.addText(k.label, { x, y:y+0.85, w:3.9, h:0.4, fontSize:12, color:'475569', align:'center' })
  })

  // Tipos de indicação
  s2.addShape(pptx.ShapeType.rect, { x:0.4, y:4.55, w:5.8, h:0.9, fill:{ color:'E4F5F3' }, line:{ color:'069E6E', width:1 } })
  s2.addText(`Consultoria em Domicílio: ${consultoria} indicações`, { x:0.6, y:4.65, w:5.4, h:0.4, fontSize:13, color:'2D2E47', bold:true })
  s2.addShape(pptx.ShapeType.rect, { x:6.6, y:4.55, w:5.8, h:0.9, fill:{ color:'EFF6FF' }, line:{ color:'3E7996', width:1 } })
  s2.addText(`Avaliacao em Parceria: ${avaliacao} indicacoes`, { x:6.8, y:4.65, w:5.4, h:0.4, fontSize:13, color:'2D2E47', bold:true })

  // ── SLIDE 3: STATUS DAS INDICAÇÕES ────────────────────
  const s3 = pptx.addSlide()
  s3.background = { color: 'FFFFFF' }
  s3.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.9, fill:{ color: G.replace('#','') }, line:{ color: G.replace('#',''), width:0 } })
  s3.addText('Status das Indicações', { x:0.4, y:0.1, w:12, h:0.7, fontSize:26, bold:true, color:'FFFFFF' })
  s3.addText(periodo, { x:0.4, y:0.95, w:12, h:0.35, fontSize:12, color:'64748B' })

  const statusOrder = ['aguardando','agendado','avaliado','tratamento','finalizado']
  const statusColors = ['F59E0B','1E40AF','166534',G.replace('#',''),'7C3AED']

  statusOrder.forEach((st, i) => {
    const count = inds.filter(ind=>ind.status===st).length
    const pct = totalInds ? Math.round(count/totalInds*100) : 0
    const y = 1.45 + i * 0.65
    s3.addText(STATUS_LABELS[st], { x:0.4, y, w:3.8, h:0.45, fontSize:13, color:'334155', bold:false })
    s3.addText(String(count), { x:4.3, y, w:0.8, h:0.45, fontSize:15, bold:true, color:statusColors[i], align:'center' })
    // barra de fundo
    s3.addShape(pptx.ShapeType.rect, { x:5.2, y:y+0.1, w:6.5, h:0.25, fill:{ color:'F1F5F9' }, line:{ color:'E2E8F0', width:0 } })
    if (pct > 0) s3.addShape(pptx.ShapeType.rect, { x:5.2, y:y+0.1, w: Math.max(0.05, 6.5*pct/100), h:0.25, fill:{ color:statusColors[i] }, line:{ color:statusColors[i], width:0 } })
    s3.addText(`${pct}%`, { x:11.9, y, w:1, h:0.45, fontSize:12, color:'94A3B8', align:'right' })
  })

  // ── SLIDES 4+: LISTA DE INDICAÇÕES ────────────────────
  const pageSize = 12
  const totalPages = Math.ceil(inds.length / pageSize) || 1

  for (let page = 0; page < totalPages; page++) {
    const sl = pptx.addSlide()
    sl.background = { color: 'FFFFFF' }
    sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:0.9, fill:{ color: S.replace('#','') }, line:{ color: S.replace('#',''), width:0 } })
    sl.addText(`Lista de Indicações${totalPages>1 ? ` (${page+1}/${totalPages})` : ''}`, { x:0.4, y:0.1, w:9, h:0.7, fontSize:24, bold:true, color:'FFFFFF' })
    sl.addText(periodo, { x:9.5, y:0.25, w:3.5, h:0.4, fontSize:11, color:'B0E8E6', align:'right' })

    // cabeçalho da tabela
    sl.addShape(pptx.ShapeType.rect, { x:0.3, y:0.95, w:12.7, h:0.38, fill:{ color: N.replace('#','') }, line:{ color: N.replace('#',''), width:0 } })
    const headers = ['Paciente','Data','Parceiro','Tipo','Status']
    const colX    = [0.35, 3.5, 5.2, 7.9, 9.8]
    const colW    = [3.1, 1.6, 2.6, 1.8, 2.8]
    headers.forEach((h,i) => sl.addText(h, { x:colX[i], y:0.97, w:colW[i], h:0.32, fontSize:10, bold:true, color:'FFFFFF' }))

    // linhas
    const pageInds = inds.slice(page*pageSize, (page+1)*pageSize)
    pageInds.forEach((ind, ri) => {
      const y = 1.38 + ri * 0.31
      const bg = ri%2===0 ? 'F8FAFC' : 'FFFFFF'
      sl.addShape(pptx.ShapeType.rect, { x:0.3, y, w:12.7, h:0.29, fill:{ color:bg }, line:{ color:'E2E8F0', width:0 } })
      const d = new Date(ind.data_indicacao).toLocaleDateString('pt-BR')
      const tipo = ind.valor_repasse ? 'Avaliação' : 'Consultoria'
      const st = STATUS_LABELS[ind.status] || ind.status
      const vals = [ind.paciente_nome, d, ind.parceiros?.nome||'—', tipo, st]
      vals.forEach((v,i) => sl.addText(v, { x:colX[i], y:y+0.03, w:colW[i], h:0.24, fontSize:9.5, color:'334155', shrinkText:true }))
    })

    // rodapé
    sl.addText(`Meu Dentista em Casa · ${unidadeNome} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`, {
      x:0.3, y:7.0, w:12.7, h:0.3, fontSize:9, color:'94A3B8', align:'center'
    })
  }

  // ── SLIDE FINAL: AGRADECIMENTO ───────────────────────
  const sFinal = pptx.addSlide()
  sFinal.background = { color: '2D2E47' }

  // faixa verde decorativa
  sFinal.addShape(pptx.ShapeType.rect, { x:0, y:2.8, w:13.33, h:0.08, fill:{ color:'069E6E' }, line:{ color:'069E6E', width:0 } })

  sFinal.addText('Meu Dentista em Casa', { x:0.6, y:0.5, w:12, h:0.5, fontSize:14, color:'B0E8E6', bold:false, align:'center' })
  sFinal.addText('Obrigado pela parceria!', { x:0.6, y:1.1, w:12, h:1.2, fontSize:44, bold:true, color:'FFFFFF', align:'center' })
  sFinal.addText('Juntos levamos o cuidado odontologico a todos os lugares.', { x:1, y:2.4, w:11.3, h:0.55, fontSize:16, color:'94A3B8', align:'center', italic:true })
  sFinal.addText(unidadeNome, { x:0.6, y:3.2, w:12, h:0.5, fontSize:18, color:'00BAB4', bold:true, align:'center' })
  sFinal.addText(periodo, { x:0.6, y:3.75, w:12, h:0.4, fontSize:13, color:'475569', align:'center' })

  // logo placeholder
  sFinal.addShape(pptx.ShapeType.rect, { x:5.67, y:4.5, w:2, h:2, fill:{ color:'069E6E' }, line:{ color:'069E6E', width:0 }, rectRadius:0.2 })
  sFinal.addText('MDC', { x:5.67, y:4.5, w:2, h:2, fontSize:32, bold:true, color:'FFFFFF', align:'center', valign:'middle' })

  // Gera e baixa
  const nomeParceiro = parceiroFiltro ? `_${parceiroFiltro.split(' ')[0]}` : ''
  await pptx.writeFile({ fileName: `MDC_Relatorio_${dataIni}_${dataFim}${nomeParceiro}.pptx` })
}
