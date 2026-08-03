'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://prev-mdc-app.vercel.app'

function qrSrc(parceiroId: string, beneficio: 'consultoria' | 'avaliacao') {
  const target = `${BASE_URL}/indicar/${parceiroId}?beneficio=${beneficio}`
  return `/api/qr?url=${encodeURIComponent(target)}`
}
function qrDownloadHref(parceiroId: string, beneficio: 'consultoria' | 'avaliacao', nome: string) {
  const target = `${BASE_URL}/indicar/${parceiroId}?beneficio=${beneficio}`
  const filename = `qr-${nome.replace(/\s+/g, '-').toLowerCase()}-${beneficio}.png`
  return `/api/qr?url=${encodeURIComponent(target)}&download=1&filename=${encodeURIComponent(filename)}`
}

export const dynamic = 'force-dynamic'

const G='#069E6E', N='#2D2E47', S='#3E7996', C='#00BAB4'
const COLORS = [G, S, C, '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1']

const STATUS_CFG: Record<string, {label:string, color:string, bg:string}> = {
  aguardando: {label:'Aguardando contato',  color:'#92400E', bg:'#FEF3C7'},
  agendado:   {label:'Agendado',            color:'#1E40AF', bg:'#EFF6FF'},
  avaliado:   {label:'Avaliação realizada', color:'#166534', bg:'#DCFCE7'},
  tratamento: {label:'Em tratamento',       color:'#065F46', bg:'#CCFBF1'},
  finalizado: {label:'Finalizado',          color:'#4C1D95', bg:'#EDE9FE'},
}

type Tab = 'dashboard' | 'indicacoes' | 'parceiros'
type Gestor = {id:string; nome:string; email:string; role:string; unidade_id:string; unidades:{nome:string}|null}
type Indicacao = {
  id:string; paciente_nome:string; paciente_telefone:string;
  observacoes:string|null; status:string; data_indicacao:string;
  pdf_url:string|null; valor_repasse:number|null;
  parceiros:{nome:string; especialidade:string}|null
}
type Parceiro = {
  id:string; nome:string; email:string; whatsapp:string;
  tipo:string; especialidade:string; segmento:string;
  status:string; data_cadastro:string
}

/* ── Componentes visuais ── */
function KpiCard({ label, value, sub, color, alert }: { label:string; value:string|number; sub?:string; color:string; alert?:boolean }) {
  return (
    <div style={{ background:'#fff', borderRadius:13, border:`1px solid ${alert ? '#FDE68A' : '#E2E8F0'}`, padding:'16px 18px', position:'relative' }}>
      {alert && <div style={{ position:'absolute', top:10, right:12, width:8, height:8, borderRadius:'50%', background:'#F59E0B' }} />}
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'#334155', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>{children}</div>
}

/* Gráfico de barras CSS horizontal */
function HBarChart({ data, colorFn }: { data:{label:string; value:number; color?:string}[]; colorFn?:(i:number)=>string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:110, fontSize:11, color:'#475569', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={d.label}>{d.label}</div>
          <div style={{ flex:1, background:'#F1F5F9', borderRadius:4, height:20, overflow:'hidden' }}>
            <div style={{
              width: `${(d.value/max)*100}%`, height:'100%',
              background: d.color || (colorFn ? colorFn(i) : COLORS[i % COLORS.length]),
              borderRadius:4, transition:'width .4s ease',
              display:'flex', alignItems:'center', paddingLeft:6,
            }}>
              {d.value > 0 && <span style={{ fontSize:10, color:'#fff', fontWeight:700 }}>{d.value}</span>}
            </div>
          </div>
          <div style={{ width:24, fontSize:11, color:'#64748B', fontWeight:600 }}>{d.value}</div>
        </div>
      ))}
      {data.length === 0 && <div style={{ fontSize:12, color:'#CBD5E1', textAlign:'center', padding:'12px 0' }}>Sem dados no período</div>}
    </div>
  )
}

/* Gráfico de barras verticais (por mês) */
function VBarChart({ data }: { data:{mes:string; total:number}[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120, paddingBottom:24, position:'relative' }}>
      {data.length === 0 && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#CBD5E1' }}>Sem dados</div>}
      {data.map((d, i) => (
        <div key={d.mes} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
          <div style={{ fontSize:10, color:N, fontWeight:700, marginBottom:3 }}>{d.total > 0 ? d.total : ''}</div>
          <div style={{
            width:'100%', background: COLORS[i % COLORS.length],
            height: `${(d.total/max)*80}%`, minHeight: d.total > 0 ? 4 : 0,
            borderRadius:'4px 4px 0 0', transition:'height .4s ease',
          }} />
          <div style={{ fontSize:9, color:'#94A3B8', marginTop:4, textAlign:'center', whiteSpace:'nowrap' }}>{d.mes}</div>
        </div>
      ))}
    </div>
  )
}

/* Mini donut SVG */
function DonutChart({ data }: { data:{name:string; value:number; color:string}[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ fontSize:12, color:'#CBD5E1', textAlign:'center', padding:'20px 0' }}>Sem dados</div>
  const r = 40, cx = 50, cy = 50, stroke = 20
  const circumference = 2 * Math.PI * r
  let offset = 0
  const slices = data.map(d => {
    const pct = d.value / total
    const dash = pct * circumference
    const gap = circumference - dash
    const s = { ...d, strokeDasharray: `${dash} ${gap}`, strokeDashoffset: -offset * circumference }
    offset += pct
    return s
  })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width={100} height={100} style={{ flexShrink:0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.strokeDasharray}
            strokeDashoffset={s.strokeDashoffset}
            style={{ transformOrigin:'50% 50%', transform:'rotate(-90deg)' }}
          />
        ))}
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={800} fill={N}>{total}</text>
        <text x={cx} y={cy+14} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#94A3B8">total</text>
      </svg>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
        {slices.map(s => (
          <div key={s.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
            <div style={{ fontSize:11, color:'#475569', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
            <div style={{ fontSize:11, fontWeight:700, color:N }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#94A3B8' }}>({Math.round(s.value/total*100)}%)</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GestorDashboard() {
  const router = useRouter()
  const [gestor, setGestor] = useState<Gestor|null>(null)
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)

  // Filtros de data
  const hoje = new Date()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const [dataIni, setDataIni] = useState(primeiroDia)
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0])

  // Modals
  const [pdfModal, setPdfModal] = useState<{id:string; url:string}|null>(null)
  const [pdfInput, setPdfInput] = useState('')
  const [pdfSaving, setPdfSaving] = useState(false)
  const [qrModal, setQrModal] = useState<Parceiro|null>(null)
  const [copied, setCopied] = useState<string|null>(null)

  function copyLink(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const loadData = useCallback(async (g: Gestor) => {
    const [{ data: inds }, { data: parts }] = await Promise.all([
      supabase.from('indicacoes').select('*, parceiros(nome, especialidade)')
        .eq('unidade_id', g.unidade_id).order('data_indicacao', { ascending: false }),
      supabase.from('parceiros').select('*')
        .eq('unidade_id', g.unidade_id).order('data_cadastro', { ascending: false }),
    ])
    setIndicacoes(inds || [])
    setParceiros(parts || [])
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('gestor_session')
    if (!raw) { router.push('/login'); return }
    const g = JSON.parse(raw) as Gestor
    setGestor(g)
    loadData(g).finally(() => setLoading(false))
  }, [router, loadData])

  /* ── Dados derivados para o Dashboard ── */
  const indsFiltradas = indicacoes.filter(i => {
    const d = i.data_indicacao.split('T')[0]
    return d >= dataIni && d <= dataFim
  })

  const indsPorMes = (() => {
    const map: Record<string, number> = {}
    indicacoes.forEach(i => {
      const d = new Date(i.data_indicacao)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = (map[key]||0) + 1
    })
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return Object.entries(map).sort().slice(-6).map(([k, v]) => {
      const [y, m] = k.split('-')
      return { mes: meses[parseInt(m)-1]+'/'+y.slice(2), total: v }
    })
  })()

  const parcsPorMes = (() => {
    const map: Record<string, number> = {}
    parceiros.forEach(p => {
      const d = new Date(p.data_cadastro)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = (map[key]||0) + 1
    })
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return Object.entries(map).sort().slice(-6).map(([k, v]) => {
      const [y, m] = k.split('-')
      return { mes: meses[parseInt(m)-1]+'/'+y.slice(2), total: v }
    })
  })()

  const parceirosPorEsp = (() => {
    const map: Record<string, number> = {}
    parceiros.forEach(p => { map[p.especialidade] = (map[p.especialidade]||0)+1 })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([label, value]) => ({ label, value }))
  })()

  const statusData = Object.entries(STATUS_CFG).map(([key, cfg]) => ({
    name: cfg.label, value: indsFiltradas.filter(i => i.status===key).length, color: cfg.color,
  })).filter(d => d.value > 0)

  const topParceiros = (() => {
    const map: Record<string, {nome:string; esp:string; total:number}> = {}
    indicacoes.forEach(i => {
      if (!i.parceiros) return
      const k = i.parceiros.nome
      if (!map[k]) map[k] = { nome:k, esp:i.parceiros.especialidade, total:0 }
      map[k].total++
    })
    return Object.values(map).sort((a,b) => b.total-a.total).slice(0,5)
  })()

  const pendentes = parceiros.filter(p => p.status === 'pendente')
  const ativos    = parceiros.filter(p => p.status === 'ativo')
  const totalRepasse = indicacoes.reduce((s, i) => s + (i.valor_repasse||0), 0)

  /* ── Ações ── */
  async function updateStatus(id: string, novoStatus: string) {
    await supabase.from('indicacoes').update({ status: novoStatus }).eq('id', id)
    setIndicacoes(prev => prev.map(i => i.id===id ? {...i, status:novoStatus} : i))
  }

  async function aprovarParceiro(id: string, novoStatus: 'ativo'|'rejeitado') {
    await supabase.from('parceiros').update({ status: novoStatus }).eq('id', id)
    setParceiros(prev => prev.map(p => p.id===id ? {...p, status:novoStatus} : p))
  }

  async function salvarPdf() {
    if (!pdfModal) return
    setPdfSaving(true)
    await supabase.from('indicacoes').update({ pdf_url: pdfInput.trim()||null }).eq('id', pdfModal.id)
    setIndicacoes(prev => prev.map(i => i.id===pdfModal.id ? {...i, pdf_url:pdfInput.trim()||null} : i))
    setPdfSaving(false); setPdfModal(null)
  }

  function sair() { localStorage.removeItem('gestor_session'); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#64748B' }}>Carregando...</p>
    </div>
  )
  if (!gestor) return null

  const unidadeNome = gestor.unidades?.nome || 'Minha Unidade'

  const TABS: {id:Tab; label:string}[] = [
    { id:'dashboard',  label:'📊 Dashboard' },
    { id:'indicacoes', label:'📋 Indicações' },
    { id:'parceiros',  label:`👥 Parceiros${pendentes.length > 0 ? ` (${pendentes.length}⚡)` : ''}` },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>

      {/* HEADER */}
      <header style={{ background:N, padding:'0 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo-mdc.png" alt="MDC" style={{ height:32, filter:'brightness(0) invert(1)' }} />
            <div>
              <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>Painel do Gestor</div>
              <div style={{ color:C, fontSize:11 }}>{unidadeNome}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ color:'#fff', fontSize:13 }}>{gestor.nome}</div>
            <button onClick={sair} style={{ background:'none', border:'1px solid #2F6C82', color:'#B0E8E6', padding:'5px 12px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Sair</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1100, margin:'0 auto', padding:'20px 16px' }}>

        {/* TABS */}
        <div style={{ display:'flex', gap:4, background:'#fff', borderRadius:10, padding:3, border:'1px solid #E2E8F0', width:'fit-content', marginBottom:20 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              background: tab===t.id ? G : 'transparent',
              color: tab===t.id ? '#fff' : '#64748B',
              fontWeight: tab===t.id ? 600 : 400,
              position:'relative',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══════════════ TAB: DASHBOARD ═══════════════ */}
        {tab === 'dashboard' && (
          <div>
            {/* Filtro de data */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'12px 16px', width:'fit-content' }}>
              <span style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>Período</span>
              <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)}
                style={{ border:'1.5px solid #E2E8F0', borderRadius:8, padding:'4px 10px', fontSize:12, color:N, outline:'none' }} />
              <span style={{ fontSize:12, color:'#94A3B8' }}>até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                style={{ border:'1.5px solid #E2E8F0', borderRadius:8, padding:'4px 10px', fontSize:12, color:N, outline:'none' }} />
              <button onClick={() => { setDataIni(primeiroDia); setDataFim(hoje.toISOString().split('T')[0]) }}
                style={{ fontSize:11, color:S, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Este mês</button>
            </div>

            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
              <KpiCard label="Indicações no período" value={indsFiltradas.length} color={N} sub={`de ${indicacoes.length} no total`} />
              <KpiCard label="Aguardando contato"    value={indsFiltradas.filter(i=>i.status==='aguardando').length} color='#92400E' />
              <KpiCard label="Avaliações realizadas" value={indsFiltradas.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length} color={G} />
              <KpiCard label="Repasse acumulado"     value={totalRepasse > 0 ? `R$ ${totalRepasse.toLocaleString('pt-BR')}` : '—'} color={G} sub="total geral" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
              <KpiCard label="Parceiros ativos"      value={ativos.length}    color={S} />
              <KpiCard label="Aguard. aprovação"     value={pendentes.length} color={pendentes.length>0?'#D97706':'#94A3B8'} alert={pendentes.length>0} />
              <KpiCard label="Em tratamento"         value={indsFiltradas.filter(i=>i.status==='tratamento').length} color='#065F46' />
              <KpiCard label="Finalizados"           value={indsFiltradas.filter(i=>i.status==='finalizado').length} color='#4C1D95' />
            </div>

            {/* Gráficos linha 1 */}
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:14, marginBottom:14 }}>

              {/* Indicações por mês */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <SectionTitle>Indicações por mês (últimos 6)</SectionTitle>
                <VBarChart data={indsPorMes} />
              </div>

              {/* Status das indicações filtradas */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <SectionTitle>Status das indicações — período</SectionTitle>
                <DonutChart data={statusData} />
              </div>
            </div>

            {/* Gráficos linha 2 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

              {/* Parceiros por especialidade */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <SectionTitle>Parceiros por especialidade</SectionTitle>
                <HBarChart data={parceirosPorEsp} />
              </div>

              {/* Crescimento de parceiros por mês */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <SectionTitle>Novos parceiros por mês (últimos 6)</SectionTitle>
                <VBarChart data={parcsPorMes} />
              </div>
            </div>

            {/* Top parceiros */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
              <SectionTitle>Top 5 parceiros por indicações</SectionTitle>
              {topParceiros.length === 0 && (
                <div style={{ fontSize:13, color:'#CBD5E1', textAlign:'center', padding:'20px 0' }}>Nenhuma indicação registrada ainda.</div>
              )}
              {topParceiros.map((p, i) => {
                const maxTotal = topParceiros[0]?.total || 1
                return (
                  <div key={p.nome} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background: i===0?'#F59E0B':i===1?'#CBD5E1':i===2?'#D97706':'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: i<3?'#fff':'#64748B', flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>{p.esp}</div>
                    </div>
                    <div style={{ width:200 }}>
                      <div style={{ background:'#F1F5F9', borderRadius:4, height:16, overflow:'hidden' }}>
                        <div style={{ width:`${(p.total/maxTotal)*100}%`, height:'100%', background:COLORS[i % COLORS.length], borderRadius:4 }} />
                      </div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:N, width:24, textAlign:'right' }}>{p.total}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: INDICAÇÕES ═══════════════ */}
        {tab === 'indicacoes' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.2fr 1fr 1.6fr 100px 90px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
              {['Paciente','Parceiro','Data','Status','Repasse','PDF'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>
            {indicacoes.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>Nenhuma indicação ainda para esta unidade.</div>
            )}
            {indicacoes.map((ind, i) => {
              const st = STATUS_CFG[ind.status] || STATUS_CFG.aguardando
              const data = new Date(ind.data_indicacao).toLocaleDateString('pt-BR')
              return (
                <div key={ind.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.2fr 1fr 1.6fr 100px 90px', gap:8, padding:'12px 16px', borderBottom: i < indicacoes.length-1 ? '1px solid #F1F5F9' : 'none', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:N }}>{ind.paciente_nome}</div>
                    {ind.paciente_telefone && <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.paciente_telefone}</div>}
                    {ind.observacoes && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2, fontStyle:'italic' }} title={ind.observacoes}>{ind.observacoes.substring(0,40)}{ind.observacoes.length>40?'...':''}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize:13, color:N }}>{ind.parceiros?.nome || '—'}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.parceiros?.especialidade || ''}</div>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>{data}</div>
                  <div>
                    <select value={ind.status} onChange={e => updateStatus(ind.id, e.target.value)}
                      style={{ padding:'4px 8px', borderRadius:8, border:`1.5px solid ${st.color}40`, background:st.bg, color:st.color, fontSize:11, fontWeight:600, cursor:'pointer', outline:'none' }}>
                      {Object.entries(STATUS_CFG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize:13, color: ind.valor_repasse ? G : '#CBD5E1', fontWeight: ind.valor_repasse ? 600 : 400 }}>
                    {ind.valor_repasse ? `R$ ${ind.valor_repasse}` : '—'}
                  </div>
                  <div>
                    <button onClick={() => { setPdfModal({id:ind.id, url:ind.pdf_url||''}); setPdfInput(ind.pdf_url||'') }}
                      style={{ border:`1px solid ${ind.pdf_url ? G : '#CBD5E1'}`, background: ind.pdf_url ? '#E4F5F3' : '#fff', color: ind.pdf_url ? G : '#94A3B8', padding:'4px 10px', borderRadius:7, fontSize:11, cursor:'pointer', fontWeight:600 }}>
                      {ind.pdf_url ? '📄 Ver' : '+ PDF'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══════════════ TAB: PARCEIROS ═══════════════ */}
        {tab === 'parceiros' && (
          <div>
            {/* Pendentes em destaque */}
            {pendentes.length > 0 && (
              <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#92400E', marginBottom:10 }}>
                  ⏳ {pendentes.length} parceiro{pendentes.length > 1 ? 's' : ''} aguardando aprovação
                </div>
                {pendentes.map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#fff', borderRadius:9, border:'1px solid #FDE68A', marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>{p.especialidade} · {p.email} · {p.whatsapp}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>Cadastrado em {new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:16 }}>
                      <button onClick={() => aprovarParceiro(p.id, 'rejeitado')}
                        style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid #FCA5A5', background:'#FEF2F2', color:'#DC2626', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        ✕ Rejeitar
                      </button>
                      <button onClick={() => aprovarParceiro(p.id, 'ativo')}
                        style={{ padding:'6px 14px', borderRadius:8, border:'none', background:G, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        ✓ Aprovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista completa */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 80px 100px 100px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                {['Nome','Especialidade','Contato','Cadastro','Status','QR Code'].map(h => (
                  <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
                ))}
              </div>
              {parceiros.length === 0 && (
                <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>Nenhum parceiro cadastrado nesta unidade ainda.</div>
              )}
              {parceiros.map((p, i) => {
                const statusCfg = p.status === 'ativo'
                  ? { label:'Ativo',     color:G,        bg:'#DCFCE7' }
                  : p.status === 'pendente'
                  ? { label:'Pendente',  color:'#D97706', bg:'#FEF3C7' }
                  : { label:'Rejeitado', color:'#DC2626', bg:'#FEF2F2' }
                return (
                  <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 80px 100px 100px', gap:8, padding:'12px 16px', borderBottom: i < parceiros.length-1 ? '1px solid #F1F5F9':'none', alignItems:'center', background: p.status==='pendente' ? '#FFFDF5':'#fff' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>{p.email}</div>
                    </div>
                    <div style={{ fontSize:13, color:'#64748B' }}>{p.especialidade}</div>
                    <div style={{ fontSize:12, color:'#64748B' }}>{p.whatsapp}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</div>
                    <div>
                      <span style={{ background:statusCfg.bg, color:statusCfg.color, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div>
                      {p.status === 'ativo' ? (
                        <button onClick={() => setQrModal(p)}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:8, border:`1.5px solid ${S}`, background:'#EEF7FB', color:S, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          <span style={{ fontSize:14 }}>⊞</span> QR Code
                        </button>
                      ) : p.status === 'pendente' ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => aprovarParceiro(p.id, 'rejeitado')} style={{ padding:'4px 8px', borderRadius:7, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#DC2626', fontSize:11, cursor:'pointer' }}>✕</button>
                          <button onClick={() => aprovarParceiro(p.id, 'ativo')}     style={{ padding:'4px 8px', borderRadius:7, border:'none', background:G, color:'#fff', fontSize:11, cursor:'pointer' }}>✓</button>
                        </div>
                      ) : (
                        <span style={{ fontSize:11, color:'#CBD5E1' }}>—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL QR CODE */}
      {qrModal && (
        <div onClick={() => setQrModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:18, padding:'24px', maxWidth:540, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:N }}>{qrModal.nome}</div>
                <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{qrModal.especialidade} · {qrModal.email}</div>
              </div>
              <button onClick={() => setQrModal(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8', lineHeight:1 }}>×</button>
            </div>
            <p style={{ fontSize:12, color:'#94A3B8', marginBottom:18, lineHeight:1.5 }}>
              Baixe o QR Code do benefício que deseja entregar a este profissional. Cole como adesivo no verso do cartão físico.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              {([
                { beneficio: 'consultoria' as const, titulo: 'Consultoria em Domicílio',  cor: S },
                { beneficio: 'avaliacao'   as const, titulo: 'Avaliação Odontológica',    cor: G },
              ]).map(({ beneficio, titulo, cor }) => {
                const link = `${BASE_URL}/indicar/${qrModal.id}?beneficio=${beneficio}`
                return (
                  <div key={beneficio} style={{ border:`1.5px solid ${cor}30`, borderRadius:12, padding:'14px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:10, background:`${cor}06` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:cor, textAlign:'center' }}>{titulo}</div>
                    <div style={{ width:140, height:140, background:'#fff', borderRadius:8, border:`1px solid ${cor}20`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrSrc(qrModal.id, beneficio)} alt={`QR ${titulo}`} width={130} height={130} style={{ display:'block' }} />
                    </div>
                    <a href={qrDownloadHref(qrModal.id, beneficio, qrModal.nome)} download
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, border:`1.5px solid ${cor}`, background:cor, color:'#fff', fontSize:12, fontWeight:600, textDecoration:'none', width:'100%', justifyContent:'center' }}>
                      ↓ Baixar PNG
                    </a>
                    <button onClick={() => copyLink(link, beneficio)}
                      style={{ background:'none', border:'none', fontSize:11, color: copied===beneficio ? G : '#94A3B8', cursor:'pointer', padding:0 }}>
                      {copied === beneficio ? '✓ Link copiado!' : '📋 Copiar link'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 14px', fontSize:11, color:'#64748B', lineHeight:1.6 }}>
              <strong style={{ color:N }}>Como usar:</strong> O familiar escaneia o QR com o celular → preenche nome e telefone → a indicação aparece automaticamente na aba <strong>Indicações</strong> vinculada a <strong>{qrModal.nome}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* MODAL PDF */}
      {pdfModal && (
        <div onClick={() => setPdfModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:'24px', maxWidth:460, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:N }}>Link do PDF</h3>
              <button onClick={() => setPdfModal(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94A3B8' }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'#64748B', marginBottom:12 }}>Cole abaixo o link do PDF da proposta de tratamento.</p>
            <input value={pdfInput} onChange={e => setPdfInput(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:'1.5px solid #CBD5E1', fontSize:14, color:N, outline:'none', marginBottom:14 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setPdfModal(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #CBD5E1', background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarPdf} disabled={pdfSaving}
                style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:pdfSaving?'#CBD5E1':G, color:'#fff', fontSize:13, fontWeight:600, cursor:pdfSaving?'not-allowed':'pointer' }}>
                {pdfSaving ? 'Salvando...' : 'Salvar link'}
              </button>
            </div>
            {pdfModal.url && (
              <a href={pdfModal.url} target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', marginTop:12, fontSize:12, color:G }}>Abrir PDF atual →</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
