'use client'
import { useEffect, useState, useCallback } from 'react'
import { gerarRelatorio } from '@/components/RelatorioGenerator'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const G='#069E6E', N='#2D2E47', S='#3E7996', C='#00BAB4', T='#2F6C82'
const COLORS = [G, S, C, T, '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

const STATUS_CFG: Record<string, {label:string,color:string,bg:string}> = {
  aguardando: {label:'Aguardando contato', color:'#92400E', bg:'#FEF3C7'},
  agendado:   {label:'Agendado',           color:'#1E40AF', bg:'#EFF6FF'},
  avaliado:   {label:'Avaliação realizada',color:'#166534', bg:'#DCFCE7'},
  tratamento: {label:'Em tratamento',      color:'#065F46', bg:'#CCFBF1'},
  finalizado: {label:'Finalizado',         color:'#4C1D95', bg:'#EDE9FE'},
}

const TABS = ['dashboard','indicacoes','parceiros','aprovacoes'] as const
type Tab = typeof TABS[number]

type Gestor = { id:string; nome:string; email:string; role:string; unidade_id:string; unidades:{nome:string}|null }
type Indicacao = {
  id:string; paciente_nome:string; paciente_telefone:string;
  observacoes:string|null; status:string; data_indicacao:string;
  pdf_url:string|null; valor_repasse:number|null;
  parceiros:{nome:string;especialidade:string}|null
}
type Parceiro = {
  id:string; nome:string; email:string; whatsapp:string;
  tipo:string; especialidade:string; segmento:string;
  status:string; data_cadastro:string
}

function KpiCard({ label, value, sub, color }: { label:string; value:string|number; sub?:string; color:string }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
      <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'#334155', marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>{children}</div>
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

  const [aprovando, setAprovando] = useState<string|null>(null)
  const [parceiroFiltro, setParceiroFiltro] = useState('')
  const [relModal, setRelModal] = useState(false)
  const [relDataIni, setRelDataIni] = useState(() => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0] })
  const [relDataFim, setRelDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [relParceiro, setRelParceiro] = useState('')
  const [relGerando, setRelGerando] = useState(false)

  async function handleGerarRelatorio() {
    setRelGerando(true)
    await gerarRelatorio({
      indicacoes,
      parceiros: parceiros.map(p => ({ id:p.id, nome:p.nome, especialidade:p.especialidade })),
      unidadeNome,
      dataIni: relDataIni,
      dataFim: relDataFim,
      parceiroFiltro: relParceiro,
    })
    setRelGerando(false)
    setRelModal(false)
  }

  // PDF modal
  const [pdfModal, setPdfModal] = useState<{id:string, url:string}|null>(null)
  const [pdfInput, setPdfInput] = useState('')
  const [pdfSaving, setPdfSaving] = useState(false)

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

  // ── Dados filtrados ──
  const indsFiltradas = indicacoes.filter(i => {
    const d = i.data_indicacao.split('T')[0]
    const dentroData = d >= dataIni && d <= dataFim
    const dentroParceiro = !parceiroFiltro || i.parceiros?.nome === parceiroFiltro
    return dentroData && dentroParceiro
  })
  const partsFiltrados = parceiros.filter(p => {
    const d = p.data_cadastro.split('T')[0]
    return d >= dataIni && d <= dataFim
  })

  // ── Gráfico: indicações por mês ──
  const indsPorMes = (() => {
    const map: Record<string,number> = {}
    indicacoes.forEach(i => {
      const d = new Date(i.data_indicacao)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = (map[key]||0) + 1
    })
    return Object.entries(map).sort().slice(-6).map(([k,v]) => {
      const [y,m] = k.split('-')
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      return { mes: meses[parseInt(m)-1]+'/'+y.slice(2), total: v }
    })
  })()

  // ── Gráfico: parceiros por especialidade ──
  const parceirosPorEsp = (() => {
    const map: Record<string,number> = {}
    parceiros.forEach(p => { map[p.especialidade] = (map[p.especialidade]||0)+1 })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name,value]) => ({ name, value }))
  })()

  // ── Gráfico: status das indicações filtradas ──
  const statusData = Object.entries(STATUS_CFG).map(([key,cfg]) => ({
    name: cfg.label,
    value: indsFiltradas.filter(i=>i.status===key).length,
    color: cfg.color,
  })).filter(d => d.value > 0)

  // ── Gráfico: parceiros novos por mês ──
  const parcsPorMes = (() => {
    const map: Record<string,number> = {}
    parceiros.forEach(p => {
      const d = new Date(p.data_cadastro)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = (map[key]||0)+1
    })
    return Object.entries(map).sort().slice(-6).map(([k,v]) => {
      const [y,m] = k.split('-')
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      return { mes: meses[parseInt(m)-1]+'/'+y.slice(2), total: v }
    })
  })()

  // ── Top parceiros por indicações ──
  const topParceiros = (() => {
    const map: Record<string,{nome:string,esp:string,total:number}> = {}
    indicacoes.forEach(i => {
      if (!i.parceiros) return
      const key = i.parceiros.nome
      if (!map[key]) map[key] = { nome: key, esp: i.parceiros.especialidade, total: 0 }
      map[key].total++
    })
    return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,5)
  })()

  async function updateStatus(id: string, novoStatus: string) {
    await supabase.from('indicacoes').update({ status: novoStatus }).eq('id', id)
    setIndicacoes(prev => prev.map(i => i.id===id ? {...i, status:novoStatus} : i))
  }

  async function salvarPdf() {
    if (!pdfModal) return
    setPdfSaving(true)
    await supabase.from('indicacoes').update({ pdf_url: pdfInput.trim()||null }).eq('id', pdfModal.id)
    setIndicacoes(prev => prev.map(i => i.id===pdfModal.id ? {...i, pdf_url:pdfInput.trim()||null} : i))
    setPdfSaving(false); setPdfModal(null)
  }

  async function aprovarParceiro(id: string) {
    setAprovando(id)
    await supabase.from('parceiros').update({ status: 'ativo' }).eq('id', id)
    setParceiros(prev => prev.map(p => p.id===id ? {...p, status:'ativo'} : p))
    setAprovando(null)
  }

  async function rejeitarParceiro(id: string) {
    setAprovando(id)
    await supabase.from('parceiros').update({ status: 'rejeitado' }).eq('id', id)
    setParceiros(prev => prev.map(p => p.id===id ? {...p, status:'rejeitado'} : p))
    setAprovando(null)
  }

  function sair() { localStorage.removeItem('gestor_session'); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#64748B' }}>Carregando...</p>
    </div>
  )
  if (!gestor) return null

  const pendentes = parceiros.filter(p => p.status === 'pendente')

  const unidadeNome = gestor.unidades?.nome || 'Minha Unidade'

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9' }}>

      {/* HEADER */}
      <header style={{ background:N, padding:'0 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo-mdc.png" alt="MDC" style={{ height:32 }} />
            <div>
              <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>Painel do Gestor</div>
              <div style={{ color:C, fontSize:11 }}>{unidadeNome}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'#fff', fontSize:13 }}>{gestor.nome}</span>
            <button onClick={() => setRelModal(true)} style={{ background:G, border:'none', color:'#fff', padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' }}>📊 Relatório PPTX</button>
            <button onClick={sair} style={{ background:'none', border:'1px solid #2F6C82', color:'#B0E8E6', padding:'5px 12px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Sair</button>
          </div>
        </div>
      </header>

      {/* NAV TABS */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E2E8F0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', gap:0, padding:'0 20px' }}>
          {([['dashboard','📊 Dashboard'],['indicacoes','📋 Indicações'],['parceiros','👥 Parceiros']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:'14px 20px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              color: tab===id ? G : '#64748B',
              borderBottom: tab===id ? `2px solid ${G}` : '2px solid transparent',
            }}>{label}</button>
          ))}
          <button onClick={() => setTab('aprovacoes')} style={{
            padding:'14px 20px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            color: tab==='aprovacoes' ? G : '#64748B',
            borderBottom: tab==='aprovacoes' ? `2px solid ${G}` : '2px solid transparent',
            position:'relative',
          }}>
            ✅ Aprovações
            {pendentes.length > 0 && (
              <span style={{ position:'absolute', top:8, right:6, background:'#EF4444', color:'#fff', borderRadius:'50%', width:18, height:18, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{pendentes.length}</span>
            )}
          </button>

        </div>
      </div>

      <main style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px' }}>

        {/* FILTRO DE DATA — aparece no dashboard e indicações */}
        {(tab === 'dashboard' || tab === 'indicacoes') && (
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Período:</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)}
                style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none' }} />
              <span style={{ color:'#94A3B8', fontSize:13 }}>até</span>
              <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)}
                style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none' }} />
            </div>
            <select value={parceiroFiltro} onChange={e=>setParceiroFiltro(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #CBD5E1', fontSize:13, color:'#2D2E47', outline:'none', background:'#fff' }}>
              <option value="">Todos os parceiros</option>
              {parceiros.filter(p=>p.status==='ativo').map(p => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>

          </div>
        )}

        {/* ════ TAB: DASHBOARD ════ */}
        {tab === 'dashboard' && (
          <div>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
              <KpiCard label="Total de Parceiros" value={parceiros.length} sub="cadastrados na unidade" color={S} />
              <KpiCard label="Indicações no Período" value={indsFiltradas.length} sub={`de ${indicacoes.length} no total`} color={G} />
              <KpiCard label="Pacientes em Tratamento" value={indicacoes.filter(i=>i.status==='tratamento').length} color={C} />
              <KpiCard label="Finalizados" value={indicacoes.filter(i=>i.status==='finalizado').length} sub="tratamentos concluídos" color={N} />
            </div>


            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

              {/* Indicações por mês */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <SectionTitle>Indicações por mês</SectionTitle>
                {indsPorMes.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem dados ainda.</p>
                  : <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={indsPorMes} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }} />
                        <Bar dataKey="total" fill={G} radius={[6,6,0,0]} name="Indicações" />
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>

              {/* Status das indicações */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <SectionTitle>Status das indicações (período)</SectionTitle>
                {statusData.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem indicações no período selecionado.</p>
                  : <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statusData} layout="vertical" barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#64748B' }} axisLine={false} tickLine={false} width={130} />
                        <Tooltip contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }} />
                        <Bar dataKey="value" name="Pacientes" radius={[0,6,6,0]}>
                          {statusData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

              {/* Tipos de indicação */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <SectionTitle>Tipos de indicação (período)</SectionTitle>
                {(() => {
                  const consultoria = indsFiltradas.filter(i=>!i.valor_repasse).length
                  const avaliacao = indsFiltradas.filter(i=>!!i.valor_repasse).length
                  const total = consultoria + avaliacao
                  if (total === 0) return <p style={{ color:'#94A3B8', fontSize:13 }}>Sem indicações no período.</p>
                  return (
                    <div>
                      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                        <div style={{ flex:1, background:'#E4F5F3', borderRadius:10, padding:'14px', textAlign:'center' }}>
                          <div style={{ fontSize:24, fontWeight:800, color:'#065F46' }}>{consultoria}</div>
                          <div style={{ fontSize:11, color:'#065F46', fontWeight:600, marginTop:4 }}>🏠 Consultoria em Domicílio</div>
                          <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{Math.round(consultoria/total*100)}%</div>
                        </div>
                        <div style={{ flex:1, background:'#EFF6FF', borderRadius:10, padding:'14px', textAlign:'center' }}>
                          <div style={{ fontSize:24, fontWeight:800, color:'#1E40AF' }}>{avaliacao}</div>
                          <div style={{ fontSize:11, color:'#1E40AF', fontWeight:600, marginTop:4 }}>🤝 Avaliação em Parceria</div>
                          <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{Math.round(avaliacao/total*100)}%</div>
                        </div>
                      </div>
                      <div style={{ height:10, borderRadius:5, background:'#E2E8F0', overflow:'hidden' }}>
                        <div style={{ height:10, borderRadius:5, background:'linear-gradient(to right, #069E6E '+Math.round(consultoria/total*100)+'%, #3E7996 '+Math.round(consultoria/total*100)+'%)' }} />
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Parceiros por especialidade */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <SectionTitle>Parceiros por especialidade</SectionTitle>
                {parceirosPorEsp.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem parceiros cadastrados.</p>
                  : <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <ResponsiveContainer width="55%" height={180}>
                        <PieChart>
                          <Pie data={parceirosPorEsp} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                            {parceirosPorEsp.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius:10, border:'none', fontSize:12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex:1 }}>
                        {parceirosPorEsp.map((d,i) => (
                          <div key={d.name} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
                            <span style={{ fontSize:11, color:'#475569' }}>{d.name}</span>
                            <span style={{ fontSize:11, fontWeight:700, color:N, marginLeft:'auto' }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                }
              </div>

              {/* Parceiros novos por mês */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px' }}>
                <SectionTitle>Parceiros novos por mês</SectionTitle>
                {parcsPorMes.length === 0
                  ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem dados ainda.</p>
                  : <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={parcsPorMes} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:11, fill:'#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius:10, border:'none', fontSize:12 }} />
                        <Bar dataKey="total" fill={S} radius={[6,6,0,0]} name="Parceiros" />
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>

            {/* Top parceiros */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'20px', marginBottom:20 }}>
              <SectionTitle>Top 5 parceiros — mais indicações</SectionTitle>
              {topParceiros.length === 0
                ? <p style={{ color:'#94A3B8', fontSize:13 }}>Sem indicações ainda.</p>
                : <div>
                    {topParceiros.map((p, i) => (
                      <div key={p.nome} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < topParceiros.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:COLORS[i], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>{p.esp}</div>
                        </div>
                        <div style={{ background:'#E4F5F3', color:G, fontWeight:700, fontSize:13, padding:'4px 12px', borderRadius:20 }}>{p.total} indicaç{p.total===1?'ão':'ões'}</div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Taxa de conversão */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Aguardando contato</div>
                <div style={{ fontSize:26, fontWeight:800, color:'#92400E' }}>{indicacoes.filter(i=>i.status==='aguardando').length}</div>
                <div style={{ marginTop:8, height:6, background:'#F1F5F9', borderRadius:3 }}>
                  <div style={{ height:6, borderRadius:3, background:'#F59E0B', width:`${indicacoes.length ? Math.min(100, Math.round(indicacoes.filter(i=>i.status==='aguardando').length/indicacoes.length*100)) : 0}%` }} />
                </div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{indicacoes.length ? Math.round(indicacoes.filter(i=>i.status==='aguardando').length/indicacoes.length*100) : 0}% do total</div>
              </div>
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Em tratamento</div>
                <div style={{ fontSize:26, fontWeight:800, color:C }}>{indicacoes.filter(i=>i.status==='tratamento').length}</div>
                <div style={{ marginTop:8, height:6, background:'#F1F5F9', borderRadius:3 }}>
                  <div style={{ height:6, borderRadius:3, background:C, width:`${indicacoes.length ? Math.min(100, Math.round(indicacoes.filter(i=>i.status==='tratamento').length/indicacoes.length*100)) : 0}%` }} />
                </div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{indicacoes.length ? Math.round(indicacoes.filter(i=>i.status==='tratamento').length/indicacoes.length*100) : 0}% do total</div>
              </div>
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Taxa de conversão</div>
                <div style={{ fontSize:26, fontWeight:800, color:G }}>
                  {indicacoes.length ? Math.round(indicacoes.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length/indicacoes.length*100) : 0}%
                </div>
                <div style={{ marginTop:8, height:6, background:'#F1F5F9', borderRadius:3 }}>
                  <div style={{ height:6, borderRadius:3, background:G, width:`${indicacoes.length ? Math.min(100, Math.round(indicacoes.filter(i=>['avaliado','tratamento','finalizado'].includes(i.status)).length/indicacoes.length*100)) : 0}%` }} />
                </div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>avaliados + tratamento + finalizados</div>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB: INDICAÇÕES ════ */}
        {tab === 'indicacoes' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.2fr 1fr 1.6fr 120px 90px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
              {['Paciente','Parceiro','Data','Status','Benefício','PDF'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>
            {indsFiltradas.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>Nenhuma indicação no período selecionado.</div>
            )}
            {indsFiltradas.map((ind, i) => {
              const st = STATUS_CFG[ind.status] || STATUS_CFG.aguardando
              const data = new Date(ind.data_indicacao).toLocaleDateString('pt-BR')
              return (
                <div key={ind.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.2fr 1fr 1.6fr 120px 90px', gap:8, padding:'12px 16px', borderBottom: i < indsFiltradas.length-1 ? '1px solid #F1F5F9' : 'none', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:N }}>{ind.paciente_nome}</div>
                    {ind.paciente_telefone && <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.paciente_telefone}</div>}
                    {ind.observacoes && <div style={{ fontSize:11, color:'#94A3B8', marginTop:2, fontStyle:'italic' }} title={ind.observacoes}>{ind.observacoes.substring(0,40)}{ind.observacoes.length>40?'...':''}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize:13, color:N }}>{ind.parceiros?.nome||'—'}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{ind.parceiros?.especialidade||''}</div>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>{data}</div>
                  <div>
                    <select value={ind.status} onChange={e=>updateStatus(ind.id, e.target.value)}
                      style={{ padding:'4px 8px', borderRadius:8, border:`1.5px solid ${st.color}40`, background:st.bg, color:st.color, fontSize:11, fontWeight:600, cursor:'pointer', outline:'none' }}>
                      {Object.entries(STATUS_CFG).map(([val,cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span style={{ display:'inline-block', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:600,
                      background: ind.valor_repasse ? '#EFF6FF' : '#E4F5F3',
                      color: ind.valor_repasse ? '#1E40AF' : '#065F46'
                    }}>{ind.valor_repasse ? '🤝 Avaliação' : '🏠 Consultoria'}</span>
                  </div>
                  <div>
                    <button onClick={() => { setPdfModal({id:ind.id,url:ind.pdf_url||''}); setPdfInput(ind.pdf_url||'') }}
                      style={{ border:`1px solid ${ind.pdf_url?G:'#CBD5E1'}`, background:ind.pdf_url?'#E4F5F3':'#fff', color:ind.pdf_url?G:'#94A3B8', padding:'4px 10px', borderRadius:7, fontSize:11, cursor:'pointer', fontWeight:600 }}>
                      {ind.pdf_url?'📄 Ver':'+ PDF'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ════ TAB: PARCEIROS ════ */}
        {tab === 'parceiros' && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 100px', gap:8, padding:'10px 16px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
              {['Nome','Especialidade','Tipo','Contato','Cadastro'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
              ))}
            </div>
            {parceiros.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94A3B8', fontSize:14 }}>Nenhum parceiro cadastrado nesta unidade ainda.</div>
            )}
            {parceiros.map((p, i) => (
              <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 100px', gap:8, padding:'12px 16px', borderBottom: i < parceiros.length-1 ? '1px solid #F1F5F9' : 'none', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                  <div style={{ fontSize:11, color:'#94A3B8' }}>{p.email}</div>
                </div>
                <div style={{ fontSize:13, color:'#64748B' }}>{p.especialidade}</div>
                <div style={{ fontSize:12, color:'#64748B' }}>{p.tipo==='profissional'?'Profissional':'Empresa'}</div>
                <div style={{ fontSize:12, color:'#64748B' }}>{p.whatsapp}</div>
                <div style={{ fontSize:11, color:'#94A3B8' }}>{new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}

        {/* ════ TAB: APROVAÇÕES ════ */}
        {tab === 'aprovacoes' && (
          <div>
            {pendentes.length === 0 ? (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'48px 20px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:600, color:N, marginBottom:6 }}>Nenhuma aprovação pendente</div>
                <div style={{ fontSize:13, color:'#94A3B8' }}>Todos os parceiros já foram analisados.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:13, color:'#92400E', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:10, padding:'10px 16px', marginBottom:16 }}>
                  ⏳ <strong>{pendentes.length} parceiro{pendentes.length>1?'s':''}</strong> aguardando aprovação para acessar o portal.
                </div>
                {pendentes.map(p => (
                  <div key={p.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px', marginBottom:12, display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:N }}>{p.nome}</div>
                      <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{p.especialidade} · {p.email}</div>
                      <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>📱 {p.whatsapp} · Cadastro: {new Date(p.data_cadastro).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                      <button
                        onClick={() => rejeitarParceiro(p.id)}
                        disabled={aprovando===p.id}
                        style={{ padding:'8px 18px', borderRadius:9, border:'1.5px solid #FCA5A5', background:'#FFF1F1', color:'#EF4444', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                        ✗ Rejeitar
                      </button>
                      <button
                        onClick={() => aprovarParceiro(p.id)}
                        disabled={aprovando===p.id}
                        style={{ padding:'8px 20px', borderRadius:9, border:'none', background:aprovando===p.id?'#CBD5E1':G, color:'#fff', fontWeight:600, fontSize:13, cursor:aprovando===p.id?'not-allowed':'pointer' }}>
                        {aprovando===p.id ? 'Salvando...' : '✓ Aprovar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rejeitados */}
            {parceiros.filter(p=>p.status==='rejeitado').length > 0 && (
              <div style={{ marginTop:24 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Rejeitados</div>
                {parceiros.filter(p=>p.status==='rejeitado').map(p => (
                  <div key={p.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 18px', marginBottom:8, display:'flex', alignItems:'center', gap:14, opacity:0.7 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:N }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>{p.especialidade} · {p.email}</div>
                    </div>
                    <button onClick={() => aprovarParceiro(p.id)} disabled={aprovando===p.id}
                      style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${G}`, background:'#E4F5F3', color:G, fontWeight:600, fontSize:12, cursor:'pointer' }}>
                      Reativar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL PDF */}
      {pdfModal && (
        <div onClick={()=>setPdfModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:'24px', maxWidth:460, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:N }}>Link do PDF</h3>
              <button onClick={()=>setPdfModal(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94A3B8' }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'#64748B', marginBottom:12 }}>Cole abaixo o link do PDF da proposta de tratamento.</p>
            <input value={pdfInput} onChange={e=>setPdfInput(e.target.value)} placeholder="https://drive.google.com/..."
              style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:'1.5px solid #CBD5E1', fontSize:14, color:N, outline:'none', marginBottom:14 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setPdfModal(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #CBD5E1', background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvarPdf} disabled={pdfSaving} style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:pdfSaving?'#CBD5E1':G, color:'#fff', fontSize:13, fontWeight:600, cursor:pdfSaving?'not-allowed':'pointer' }}>
                {pdfSaving?'Salvando...':'Salvar link'}
              </button>
            </div>
            {pdfModal.url && <a href={pdfModal.url} target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', marginTop:12, fontSize:12, color:G }}>Abrir PDF atual →</a>}
          </div>
        </div>
      )}

      {/* MODAL RELATÓRIO */}
      {relModal && (
        <div onClick={() => setRelModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:'28px', maxWidth:480, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:17, fontWeight:700, color:N }}>📊 Gerar Relatório PPTX</h3>
              <button onClick={() => setRelModal(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8' }}>×</button>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Período</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="date" value={relDataIni} onChange={e=>setRelDataIni(e.target.value)}
                  style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none' }} />
                <span style={{ color:'#94A3B8', fontSize:13 }}>até</span>
                <input type="date" value={relDataFim} onChange={e=>setRelDataFim(e.target.value)}
                  style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none' }} />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Filtrar por parceiro (opcional)</label>
              <select value={relParceiro} onChange={e=>setRelParceiro(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #CBD5E1', fontSize:13, color:N, outline:'none', background:'#fff' }}>
                <option value="">Todos os parceiros</option>
                {parceiros.filter(p=>p.status==='ativo').map(p => (
                  <option key={p.id} value={p.nome}>{p.nome} — {p.especialidade}</option>
                ))}
              </select>
            </div>

            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 14px', marginBottom:20, fontSize:13, color:'#475569' }}>
              📋 O relatório incluirá: <strong>capa, resumo executivo, status das indicações, lista detalhada e ranking de parceiros</strong>.
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setRelModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1.5px solid #CBD5E1', background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleGerarRelatorio} disabled={relGerando} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:relGerando?'#CBD5E1':G, color:'#fff', fontSize:13, fontWeight:600, cursor:relGerando?'not-allowed':'pointer' }}>
                {relGerando ? '⏳ Gerando...' : '⬇ Baixar PPTX'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
